"use client";

// โมดูลจัดการผู้ใช้ (แอดมิน/ผู้บริหาร) — ตำแหน่ง, วันลา, เปิด/ปิด OT, อัตราเบี้ยเลี้ยง-เดินทาง, สิทธิ์เข้าถึงโมดูล

import { useState } from "react";
import { useEffect } from "react";
import StaffShell, { useDept, OVERRIDES_KEY, PERMS_EVENT, type AccessOverrides } from "@/components/staff/StaffShell";
import {
  employees, expenseRatesByPosition, expensePolicy, modulesMeta, permissions,
  type Employee, type PositionKey, type ModuleKey, type Access,
} from "@/lib/staffData";
import { departments } from "@/lib/data";
import { supabase } from "@/lib/supabase";
import type { Department } from "@/lib/data";

const deptLabel = (k: string) => departments.find((d) => d.key === k)?.label ?? k;

function UsersBody() {
  const { access } = useDept();
  const readOnly = access("users") !== "full";

  // สถานะแก้ไขจำลอง (mockup — เก็บในหน่วยความจำ)
  const [list, setList] = useState<Employee[]>(employees);
  const [selectedId, setSelectedId] = useState(employees[0].id);
  const [accessOverride, setAccessOverride] = useState<AccessOverrides>({});
  const [saved, setSaved] = useState(false);

  const [dbStatus, setDbStatus] = useState<"db" | "local" | "loading">("loading");
  const [accounts, setAccounts] = useState<Record<string, { email: string | null; mustChange: boolean }>>({});
  const [acctEmail, setAcctEmail] = useState("");
  const [acctMsg, setAcctMsg] = useState<string | null>(null);
  const [acctBusy, setAcctBusy] = useState(false);
  const [newEmp, setNewEmp] = useState<{ name: string; dept: Department } | null>(null);

  const reloadEmployees = async () => {
    if (!supabase) return;
    const { data: emps } = await supabase.from("employees").select("*").order("id");
    if (emps) {
      setList(emps.map((r) => ({
        id: r.id, name: r.name, dept: r.dept as Department, position: r.position as PositionKey,
        otEnabled: r.ot_enabled,
        leaveQuota: { annual: r.leave_annual, sick: r.leave_sick, personal: r.leave_personal },
      })));
      setAccounts(Object.fromEntries(emps.map((r) => [r.id, { email: r.email, mustChange: r.must_change_password }])));
    }
  };

  // ── จัดการบัญชีเข้าระบบ (เฉพาะแอดมิน) ──
  const acctAction = async (fn: string, args: Record<string, string>, okMsg: string) => {
    if (!supabase) return;
    setAcctBusy(true); setAcctMsg(null);
    const { error } = await supabase.rpc(fn, args);
    setAcctBusy(false);
    if (error) { setAcctMsg("⚠ " + error.message); return; }
    setAcctMsg("✓ " + okMsg);
    setAcctEmail("");
    await reloadEmployees();
  };

  const addEmployee = async () => {
    if (!supabase || !newEmp || !newEmp.name.trim()) return;
    const maxNum = Math.max(0, ...list.map((e) => parseInt(e.id.replace(/\D/g, "") || "0", 10)).filter((n) => !isNaN(n)));
    const id = `EMP-${String(maxNum + 1).padStart(3, "0")}`;
    const { error } = await supabase.from("employees").insert({ id, name: newEmp.name.trim(), dept: newEmp.dept });
    if (error) { setAcctMsg("⚠ " + error.message); return; }
    setNewEmp(null);
    await reloadEmployees();
    setSelectedId(id);
  };

  const removeEmployee = async () => {
    if (!supabase) return;
    if (accounts[selectedId]?.email) {
      const { error } = await supabase.rpc("admin_delete_account", { p_emp_id: selectedId });
      if (error) { setAcctMsg("⚠ " + error.message); return; }
    }
    await supabase.from("access_overrides").delete().eq("emp_id", selectedId);
    await supabase.from("employees").delete().eq("id", selectedId);
    await reloadEmployees();
    setSelectedId(list.find((e) => e.id !== selectedId)?.id ?? "");
    setAcctMsg("✓ ลบพนักงานแล้ว");
  };

  // โหลดพนักงาน + สิทธิ์รายคนจากฐานข้อมูลจริง (fallback: mock + localStorage)
  useEffect(() => {
    (async () => {
      if (supabase) {
        const [{ data: emps }, { data: ovr }] = await Promise.all([
          supabase.from("employees").select("*").order("id"),
          supabase.from("access_overrides").select("emp_id,module,access"),
        ]);
        if (emps && emps.length) {
          setList(emps.map((r) => ({
            id: r.id, name: r.name, dept: r.dept as Department, position: r.position as PositionKey,
            otEnabled: r.ot_enabled,
            leaveQuota: { annual: r.leave_annual, sick: r.leave_sick, personal: r.leave_personal },
          })));
          setAccounts(Object.fromEntries(emps.map((r) => [r.id, { email: r.email, mustChange: r.must_change_password }])));
          const o: AccessOverrides = {};
          for (const r of ovr ?? []) (o[r.emp_id] ??= {})[r.module as ModuleKey] = r.access as Access;
          setAccessOverride(o);
          setDbStatus("db");
          return;
        }
      }
      try { setAccessOverride(JSON.parse(localStorage.getItem(OVERRIDES_KEY) ?? "{}")); } catch {}
      setDbStatus("local");
    })();
  }, []);

  // บันทึก → เขียนฐานข้อมูลจริง + มีผลทันทีทั้ง Portal
  const saveAll = async () => {
    const cur = list.find((e) => e.id === selectedId)!;
    if (supabase && dbStatus === "db") {
      await supabase.from("employees").update({
        position: cur.position, ot_enabled: cur.otEnabled,
        leave_annual: cur.leaveQuota.annual, leave_sick: cur.leaveQuota.sick, leave_personal: cur.leaveQuota.personal,
      }).eq("id", cur.id);
      const rows = Object.entries(accessOverride[cur.id] ?? {}).map(([module, access]) => ({ emp_id: cur.id, module, access }));
      if (rows.length) await supabase.from("access_overrides").upsert(rows);
    }
    try {
      localStorage.setItem(OVERRIDES_KEY, JSON.stringify(accessOverride));
      window.dispatchEvent(new Event(PERMS_EVENT));
    } catch {}
    setSaved(true);
  };

  const emp = list.find((e) => e.id === selectedId)!;
  const rate = expenseRatesByPosition.find((r) => r.key === emp.position)!;
  const empAccess = (m: ModuleKey): Access => accessOverride[emp.id]?.[m] ?? permissions[emp.dept][m];

  const update = (patch: Partial<Employee>) => {
    setList((ls) => ls.map((e) => (e.id === emp.id ? { ...e, ...patch } : e)));
    setSaved(false);
  };
  const setAcc = (m: ModuleKey, a: Access) => {
    setAccessOverride((o) => ({ ...o, [emp.id]: { ...o[emp.id], [m]: a } }));
    setSaved(false);
  };

  return (
    <>
      {readOnly && (
        <p className="mb-3 text-[12.5px] bg-ice text-sky font-semibold rounded-lg px-3 py-2 inline-block">
          👁️ ดูอย่างเดียว — จัดการได้เฉพาะแอดมิน/ผู้บริหาร
        </p>
      )}

      <p className={`mb-3 text-[11.5px] font-semibold rounded-lg px-3 py-1.5 inline-block ${dbStatus === "db" ? "bg-brand/10 text-brand" : "bg-ice text-muted"}`}>
        {dbStatus === "db" ? "🟢 เชื่อมต่อฐานข้อมูลจริง (Supabase) — การแก้ไขถูกบันทึกถาวร" : dbStatus === "local" ? "⚪ โหมดเดโม — ยังไม่เชื่อมฐานข้อมูล บันทึกในเบราว์เซอร์" : "⏳ กำลังเชื่อมต่อ..."}
      </p>

      <div className="grid gap-5 min-[1040px]:grid-cols-[300px_1fr] items-start">
        {/* รายชื่อพนักงาน */}
        <div className="card-white p-3 min-w-0">
          <p className="px-2 pt-1 pb-2 font-bold text-navy text-[14px]">พนักงาน ({list.length})</p>
          <div className="flex min-[1040px]:flex-col gap-1.5 overflow-x-auto pb-1">
            {list.map((e) => (
              <button key={e.id} onClick={() => { setSelectedId(e.id); setSaved(false); }}
                className={`shrink-0 min-[1040px]:shrink text-left rounded-lg px-3 py-2 transition whitespace-nowrap min-[1040px]:whitespace-normal ${
                  e.id === selectedId ? "bg-brand text-white" : "hover:bg-ice"
                }`}>
                <p className={`text-[13px] font-bold ${e.id === selectedId ? "text-white" : "text-navy"}`}>{e.name}</p>
                <p className={`text-[11px] ${e.id === selectedId ? "text-white/80" : "text-muted"}`}>
                  {deptLabel(e.dept)} · {expenseRatesByPosition.find((r) => r.key === e.position)?.label}
                  {e.otEnabled && <span className={`ml-1.5 text-[9.5px] font-bold rounded px-1 py-0.5 ${e.id === selectedId ? "bg-white/20" : "bg-amber/15 text-amber"}`}>OT</span>}
                </p>
              </button>
            ))}
          </div>
          {!readOnly && !newEmp && (
            <button onClick={() => setNewEmp({ name: "", dept: "sales" })} className="mt-2 w-full btn btn-outline text-[12.5px] py-1.5">＋ เพิ่มพนักงานใหม่</button>
          )}
          {!readOnly && newEmp && (
            <div className="mt-2 rounded-lg border border-dashed border-sky/60 p-2.5 space-y-2">
              <input autoFocus placeholder="ชื่อพนักงาน..." value={newEmp.name}
                onChange={(e) => setNewEmp({ ...newEmp, name: e.target.value })}
                className="w-full rounded-lg border border-ice px-2.5 py-1.5 text-[13px]" />
              <select value={newEmp.dept} onChange={(e) => setNewEmp({ ...newEmp, dept: e.target.value as Department })}
                className="w-full rounded-lg border border-ice px-2.5 py-1.5 text-[13px] bg-white">
                {departments.map((d) => <option key={d.key} value={d.key}>{d.label}</option>)}
              </select>
              <div className="flex gap-1.5">
                <button onClick={addEmployee} className="btn btn-primary text-[12px] py-1.5 flex-1">บันทึก</button>
                <button onClick={() => setNewEmp(null)} className="btn btn-outline text-[12px] py-1.5">ยกเลิก</button>
              </div>
            </div>
          )}
        </div>

        {/* แผงแก้ไข */}
        <div className="space-y-4 min-w-0">
          {/* ข้อมูลหลัก */}
          <div className="card-white p-4 min-[600px]:p-5 min-w-0">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-bold text-navy text-[15px]">{emp.name} <span className="text-[11.5px] font-normal text-muted">({emp.id} · {deptLabel(emp.dept)})</span></p>
              {!readOnly && (
                <button onClick={saveAll} className="btn btn-primary text-[12.5px] py-1.5 px-3.5">
                  {saved ? "✓ บันทึกแล้ว" : "บันทึกการตั้งค่า"}
                </button>
              )}
            </div>

            <div className="mt-4 grid gap-4 min-[700px]:grid-cols-2">
              {/* ตำแหน่ง */}
              <div className="min-w-0">
                <label className="block font-semibold text-navy mb-1 text-[13px]">ตำแหน่ง</label>
                <select value={emp.position} disabled={readOnly}
                  onChange={(e) => update({ position: e.target.value as PositionKey })}
                  className="w-full max-w-full rounded-lg border border-ice px-3 py-2 bg-white text-[13.5px]">
                  {expenseRatesByPosition.map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}
                </select>
                <p className="mt-1.5 text-[11.5px] text-sky bg-ice/50 rounded-lg px-2.5 py-1.5">
                  อัตราตามตำแหน่ง (อัตโนมัติ): ที่พัก {rate.lodgingCap.toLocaleString()} ฿/คืน · เบี้ยเลี้ยง {rate.perDiem} ฿/วัน · ค่าเดินทาง {expensePolicy.kmRate} ฿/กม.
                </p>
              </div>
              {/* OT */}
              <div className="min-w-0">
                <label className="block font-semibold text-navy mb-1 text-[13px]">สิทธิ์ OT (ค่าล่วงเวลา)</label>
                <button disabled={readOnly} onClick={() => update({ otEnabled: !emp.otEnabled })}
                  className={`w-full rounded-lg border px-3 py-2 text-[13.5px] font-bold text-left transition ${
                    emp.otEnabled ? "border-amber/60 bg-amber/10 text-amber" : "border-ice bg-ice/40 text-muted"
                  }`}>
                  {emp.otEnabled ? "🟠 เปิดใช้งาน — OT คิดอัตโนมัติหลัง 17:30 ถึงเวลา Check Out" : "⚪ ปิดใช้งาน — ไม่คิด OT"}
                </button>
              </div>
            </div>

            {/* วันลา */}
            <div className="mt-4">
              <label className="block font-semibold text-navy mb-1.5 text-[13px]">โควตาวันลาต่อปี</label>
              <div className="grid grid-cols-3 gap-3">
                {([["annual", "ลาพักร้อน"], ["sick", "ลาป่วย"], ["personal", "ลากิจ"]] as const).map(([k, label]) => (
                  <div key={k} className="rounded-lg bg-ice/50 p-2.5 min-w-0">
                    <p className="text-[11.5px] text-muted">{label}</p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <input type="number" disabled={readOnly} value={emp.leaveQuota[k]}
                        onChange={(e) => update({ leaveQuota: { ...emp.leaveQuota, [k]: +e.target.value || 0 } })}
                        className="w-full min-w-0 rounded-lg border border-ice px-2 py-1.5 text-right bg-white text-[13.5px] font-bold text-navy" />
                      <span className="text-[11px] text-muted shrink-0">วัน</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* บัญชีเข้าระบบ */}
          <div className="card-white p-4 min-[600px]:p-5 min-w-0">
            <p className="font-bold text-navy text-[15px]">บัญชีเข้าระบบ (Login)</p>
            {accounts[emp.id]?.email ? (
              <div className="mt-2.5">
                <p className="text-[13.5px]">
                  <span className="text-[10.5px] font-bold bg-brand/10 text-brand rounded px-1.5 py-0.5 mr-2">มีบัญชี</span>
                  <strong className="text-navy">{accounts[emp.id].email}</strong>
                  {accounts[emp.id].mustChange && (
                    <span className="ml-2 text-[10.5px] font-bold bg-amber/15 text-amber rounded px-1.5 py-0.5">รอเปลี่ยนรหัสครั้งแรก</span>
                  )}
                </p>
                {!readOnly && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button disabled={acctBusy}
                      onClick={() => acctAction("admin_reset_password", { p_emp_id: emp.id }, `รีเซ็ตรหัสของ ${emp.name} เป็น 1234 แล้ว (ต้องตั้งรหัสใหม่ตอนล็อกอิน)`)}
                      className="btn btn-outline text-[12.5px] py-1.5 px-3 disabled:opacity-60">🔑 รีเซ็ตรหัสเป็น 1234</button>
                    <button disabled={acctBusy}
                      onClick={() => acctAction("admin_delete_account", { p_emp_id: emp.id }, `ลบบัญชีของ ${emp.name} แล้ว (ตัวพนักงานยังอยู่)`)}
                      className="btn btn-outline text-[12.5px] py-1.5 px-3 !text-[#D94141] !border-[#D94141]/40 disabled:opacity-60">✕ ลบบัญชี</button>
                  </div>
                )}
              </div>
            ) : (
              <div className="mt-2.5">
                <p className="text-[12.5px] text-muted"><span className="text-[10.5px] font-bold bg-ice text-muted rounded px-1.5 py-0.5 mr-2">ยังไม่มีบัญชี</span>พนักงานคนนี้ยังเข้าระบบไม่ได้</p>
                {!readOnly && (
                  <div className="mt-3 flex flex-wrap gap-2 items-center">
                    <input type="email" placeholder="email@cs-th.com" value={acctEmail} onChange={(e) => setAcctEmail(e.target.value)}
                      className="rounded-lg border border-ice px-3 py-1.5 text-[13px] flex-1 min-w-[180px]" />
                    <button disabled={acctBusy || !acctEmail.includes("@")}
                      onClick={() => acctAction("admin_create_account", { p_emp_id: emp.id, p_email: acctEmail.trim() }, `สร้างบัญชี ${acctEmail.trim()} แล้ว — รหัสเริ่มต้น 1234 (บังคับเปลี่ยนตอนล็อกอินแรก)`)}
                      className="btn btn-primary text-[12.5px] py-1.5 px-3 disabled:opacity-60">＋ สร้างบัญชี (รหัส 1234)</button>
                  </div>
                )}
              </div>
            )}
            {acctMsg && <p className={`mt-2.5 text-[12.5px] font-semibold rounded-lg px-3 py-2 ${acctMsg.startsWith("✓") ? "bg-brand/10 text-brand" : "bg-[#D94141]/10 text-[#D94141]"}`}>{acctMsg}</p>}
            {!readOnly && emp.id !== "EMP-ADMIN" && (
              <button disabled={acctBusy} onClick={removeEmployee}
                className="mt-3 text-[11.5px] text-muted hover:text-[#D94141] font-semibold">🗑 ลบพนักงานคนนี้ออกจากระบบ (รวมบัญชี)</button>
            )}
            <p className="mt-2 text-[11px] text-muted/70 italic">รหัสเริ่มต้น/รีเซ็ตคือ 1234 — พนักงานถูกบังคับตั้งรหัสใหม่ (≥6 ตัว) ตอนล็อกอินครั้งถัดไปเสมอ</p>
          </div>

          {/* สิทธิ์เข้าถึงโมดูล */}
          <div className="card-white p-4 min-[600px]:p-5 min-w-0">
            <p className="font-bold text-navy text-[15px]">สิทธิ์เข้าถึงฟังก์ชันและหน้าต่างๆ</p>
            <p className="text-[11.5px] text-muted mt-0.5 mb-3">ค่าเริ่มต้นตามแผนก ({deptLabel(emp.dept)}) — ปรับรายคนได้ที่นี่</p>
            <div className="overflow-x-auto -mx-1 px-1">
              <table className="w-full min-w-[460px] text-[12.5px]">
                <thead>
                  <tr className="bg-ice/70 text-navy">
                    <th className="text-left px-3 py-2 font-bold">โมดูล</th>
                    <th className="text-center px-2 py-2 font-bold w-24">ใช้งานเต็ม</th>
                    <th className="text-center px-2 py-2 font-bold w-24">ดูอย่างเดียว</th>
                    <th className="text-center px-2 py-2 font-bold w-24">ปิด</th>
                  </tr>
                </thead>
                <tbody>
                  {modulesMeta.map((m, i) => {
                    const cur = empAccess(m.key);
                    const changed = accessOverride[emp.id]?.[m.key] !== undefined && accessOverride[emp.id]?.[m.key] !== permissions[emp.dept][m.key];
                    return (
                      <tr key={m.key} className={i % 2 ? "bg-ice/30" : ""}>
                        <td className="px-3 py-2 font-semibold text-navy whitespace-nowrap">
                          {m.icon} {m.label}
                          {changed && <span className="ml-1.5 text-[9.5px] font-bold bg-amber/15 text-amber rounded px-1 py-0.5">แก้เอง</span>}
                        </td>
                        {(["full", "read", "none"] as Access[]).map((a) => (
                          <td key={a} className="text-center px-2 py-2">
                            <input type="radio" name={`acc-${emp.id}-${m.key}`} checked={cur === a} disabled={readOnly}
                              onChange={() => setAcc(m.key, a)} />
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {saved && (
              <p className="mt-2 text-[12px] font-semibold text-brand bg-ice/60 rounded-lg px-3 py-2">
                ✓ บันทึกแล้ว — สิทธิ์มีผลจริงทันที: ลอง &ldquo;สลับผู้ใช้&rdquo; ที่แถบซ้ายเป็น {emp.name} จะเห็นเมนูตามสิทธิ์ที่ตั้งไว้
              </p>
            )}
            <p className="mt-2 text-[11px] text-muted/70 italic">
              ระบบจริง: สิทธิ์ผูกกับบัญชีล็อกอิน (Supabase Auth + RLS) มีผลทันทีที่บันทึก และเก็บประวัติว่าใครแก้สิทธิ์อะไรเมื่อไหร่ — ในเดโมนี้สิทธิ์รายคนถูกใช้จริงแล้ว: เมนูของผู้ใช้แต่ละคน = ค่าแผนก + ที่แก้ในหน้านี้
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

export default function UsersPage() {
  return (
    <StaffShell title="จัดการผู้ใช้">
      <UsersBody />
    </StaffShell>
  );
}
