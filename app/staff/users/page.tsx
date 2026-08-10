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

const deptLabel = (k: string) => departments.find((d) => d.key === k)?.label ?? k;

function UsersBody() {
  const { access } = useDept();
  const readOnly = access("users") !== "full";

  // สถานะแก้ไขจำลอง (mockup — เก็บในหน่วยความจำ)
  const [list, setList] = useState<Employee[]>(employees);
  const [selectedId, setSelectedId] = useState(employees[0].id);
  const [accessOverride, setAccessOverride] = useState<AccessOverrides>({});
  const [saved, setSaved] = useState(false);

  // โหลดสิทธิ์รายคนที่เคยบันทึกไว้
  useEffect(() => {
    try { setAccessOverride(JSON.parse(localStorage.getItem(OVERRIDES_KEY) ?? "{}")); } catch {}
  }, []);

  // บันทึก → มีผลจริงทันทีทั้ง Portal (เมนู/สิทธิ์ของผู้ใช้คนนั้นเปลี่ยนตาม)
  const saveAll = () => {
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
          {!readOnly && <button className="mt-2 w-full btn btn-outline text-[12.5px] py-1.5">＋ เพิ่มพนักงานใหม่</button>}
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
