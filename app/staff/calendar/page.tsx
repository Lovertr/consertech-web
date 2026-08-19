"use client";

// 📅 ปฏิทินกิจกรรม — วางแผนโทรนัด/ประชุม/เข้าพบลูกค้า/เดินทาง
// เห็นเฉพาะกิจกรรมที่เกี่ยวข้องกับตัวเอง (สร้างเอง/ถูกเชิญ) + ประชุมจากโมดูลประชุม + วันลาที่อนุมัติ
// เชิญเพื่อนร่วมงาน เลือกลูกค้า/ผู้ติดต่อ แก้ไข/ลบได้ + ส่งเข้า Google Calendar

import { useCallback, useEffect, useState } from "react";
import StaffShell, { useDept } from "@/components/staff/StaffShell";
import { supabase } from "@/lib/supabase";

type DbEvent = {
  id: number; title: string; event_type: string; event_date: string; event_time: string | null;
  duration_min: number; location: string | null; customer_id: number | null; contact_id: number | null;
  ref_doc: string | null; notes: string | null; attendees: string[]; created_by: string | null;
  project_id: number | null; deal_id: number | null; created_at: string;
};
type EmpLite = { id: string; name: string; nickname: string | null };
type CustLite = { id: number; name: string };
type ContactLite = { id: number; customer_id: number; name: string; position: string | null };
type ProjLite = { id: number; code: string | null; name: string };
type DealLite = { id: number; customer_name: string; solution: string | null };
// รายการรวมที่แสดงบนปฏิทิน (event / ประชุม / วันลา) — who = เจ้าของ (ใช้ทำป้ายตัวอักษรรายคน)
type CalItem = {
  key: string; date: string; time: string | null; title: string; type: string;
  source: "event" | "meeting" | "leave"; ev?: DbEvent; sub?: string; who?: string | null; att?: string[];
};

// สีประจำตัวพนักงาน (กำหนดตามลำดับในรายชื่อ — คงที่ ไม่สุ่ม)
const PERSON_COLORS = ["#7C3AED", "#15659E", "#DB2777", "#D97706", "#2E9E5B", "#0891B2", "#DC2626", "#65A30D", "#9333EA", "#EA580C", "#475569", "#0E3A5C"];

const EVENT_TYPES = ["โทรนัด", "ประชุม", "เข้าพบลูกค้า", "เดินทาง", "อื่นๆ"] as const;
const typeChip = (t: string) =>
  t === "โทรนัด" ? "bg-ice text-sky"
  : t === "ประชุม" ? "bg-brand/10 text-brand"
  : t === "เข้าพบลูกค้า" ? "bg-amber/15 text-amber"
  : t === "เดินทาง" ? "bg-[#2E9E5B]/15 text-[#2E9E5B]"
  : "bg-ice text-muted";

const pad = (n: number) => String(n).padStart(2, "0");
const dateStr = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const todayStr = () => dateStr(new Date());
const fmtThai = (iso: string) => new Date(iso + "T00:00:00").toLocaleDateString("th-TH", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

// ลิงก์เพิ่มลง Google Calendar (เปิดฟอร์ม GCal พร้อมข้อมูลครบ)
function gcalUrl(ev: DbEvent, custName?: string, contactName?: string): string {
  const t = ev.event_time ?? "09:00";
  const start = new Date(`${ev.event_date}T${t}:00`);
  const end = new Date(start.getTime() + (ev.duration_min || 60) * 60000);
  const f = (d: Date) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;
  const details = [
    `ประเภท: ${ev.event_type}`,
    custName && `ลูกค้า: ${custName}${contactName ? ` (${contactName})` : ""}`,
    ev.ref_doc && `อ้างอิง: ${ev.ref_doc}`,
    ev.notes && `โน้ต: ${ev.notes}`,
    "— จากระบบ CONSERTECH Portal",
  ].filter(Boolean).join("\n");
  const q = new URLSearchParams({
    action: "TEMPLATE", text: ev.title, dates: `${f(start)}/${f(end)}`,
    details, location: ev.location ?? "", ctz: "Asia/Bangkok",
  });
  return `https://calendar.google.com/calendar/render?${q.toString()}`;
}

function CalendarBody() {
  const { empId } = useDept();
  const [events, setEvents] = useState<DbEvent[]>([]);
  const [extraItems, setExtraItems] = useState<CalItem[]>([]);
  const [emps, setEmps] = useState<EmpLite[]>([]);
  const [customers, setCustomers] = useState<CustLite[]>([]);
  const [contacts, setContacts] = useState<ContactLite[]>([]);
  const [month, setMonth] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [selDate, setSelDate] = useState(todayStr());
  // ฟอร์ม
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [fTitle, setFTitle] = useState(""); const [fType, setFType] = useState<string>("โทรนัด");
  const [fDate, setFDate] = useState(todayStr()); const [fTime, setFTime] = useState("09:00");
  const [fDur, setFDur] = useState(60); const [fLoc, setFLoc] = useState("");
  const [fCust, setFCust] = useState<number | null>(null); const [fContact, setFContact] = useState<number | null>(null);
  const [fCustText, setFCustText] = useState(""); const [fContactText, setFContactText] = useState("");
  const [fNotes, setFNotes] = useState(""); const [fAtt, setFAtt] = useState<string[]>([]);
  const [fProj, setFProj] = useState<number | null>(null); const [fDeal, setFDeal] = useState<number | null>(null);
  const [projects, setProjects] = useState<ProjLite[]>([]);
  const [deals, setDeals] = useState<DealLite[]>([]);
  // กรองปฏิทินรายคน (เลือกได้หลายคน) — null = ยังไม่เลือก → default ตัวเอง
  const [selEmps, setSelEmps] = useState<string[] | null>(null);
  const [saving, setSaving] = useState(false); const [err, setErr] = useState("");

  const empName = (id: string | null) => emps.find((e) => e.id === id)?.name ?? id ?? "-";
  const custName = (id: number | null) => customers.find((c) => c.id === id)?.name;
  const contactName = (id: number | null) => contacts.find((c) => c.id === id)?.name;
  // ป้ายประจำตัว: วงกลมสีประจำคน + อักษรตัวแรกของชื่อเล่น/ชื่อ
  const personColor = (id?: string | null) => {
    const idx = emps.findIndex((e) => e.id === id);
    return idx >= 0 ? PERSON_COLORS[idx % PERSON_COLORS.length] : "#94A3B8";
  };
  const personInitial = (id?: string | null) => {
    const e = emps.find((x) => x.id === id);
    return (e?.nickname?.trim() || e?.name?.trim() || "?").charAt(0);
  };
  const effSel = selEmps ?? (empId ? [empId] : []);
  // เจ้าของกิจกรรมที่แสดงบนป้าย = ผู้ร่วมกิจกรรม (คนที่ไปทำจริง) — ถ้าไม่มีค่อยใช้คนสร้าง
  const badgesFor = (x: CalItem): (string | null)[] => (x.att && x.att.length ? x.att : [x.who ?? null]);

  const load = useCallback(async () => {
    if (!supabase || !empId) return;
    const [ev, em, cu, ct, mt, lv, pj, dl] = await Promise.all([
      supabase.from("calendar_events").select("*").order("event_date").order("event_time"),
      supabase.from("employees").select("id,name,nickname").order("id"),
      supabase.from("customers").select("id,name").order("name"),
      supabase.from("customer_contacts").select("id,customer_id,name,position"),
      supabase.from("meetings").select("id,title,meet_date,meet_time,attendees,created_by,status"),
      supabase.from("leave_requests").select("id,emp_id,type,date_from,date_to,status").eq("status", "อนุมัติแล้ว"),
      supabase.from("projects").select("id,code,name").order("created_at", { ascending: false }),
      supabase.from("deals").select("id,customer_name,solution").order("created_at", { ascending: false }),
    ]);
    // โหลดทุกคน — การมองเห็นคุมด้วยตัวกรองรายคนด้านบนปฏิทิน (ค่าเริ่มต้น = ตัวเอง)
    setEvents((ev.data as DbEvent[]) ?? []);
    const empList = (em.data as EmpLite[]) ?? [];
    setEmps(empList);
    setCustomers((cu.data as CustLite[]) ?? []);
    setContacts((ct.data as ContactLite[]) ?? []);
    setProjects((pj.data as ProjLite[]) ?? []);
    setDeals((dl.data as DealLite[]) ?? []);
    const eName = (id: string | null) => empList.find((x) => x.id === id)?.name ?? "";
    const extras: CalItem[] = [];
    for (const m of (mt.data as { id: number; title: string; meet_date: string; meet_time: string | null; attendees: string[]; created_by: string | null; status: string }[]) ?? []) {
      if (m.status === "ยกเลิก") continue;
      extras.push({ key: `mt${m.id}`, date: m.meet_date, time: m.meet_time, title: m.title, type: "ประชุม", source: "meeting", sub: "จากโมดูลประชุม", who: m.created_by, att: m.attendees ?? [] });
    }
    for (const l of (lv.data as { id: number; emp_id: string; type: string; date_from: string; date_to: string }[]) ?? []) {
      const from = new Date(l.date_from + "T00:00:00"); const to = new Date(l.date_to + "T00:00:00");
      for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
        extras.push({ key: `lv${l.id}-${dateStr(d)}`, date: dateStr(d), time: null, title: `🌴 ${l.type}`, type: "ลา", source: "leave", sub: eName(l.emp_id) || undefined, who: l.emp_id });
      }
    }
    setExtraItems(extras);
  }, [empId]);
  useEffect(() => { load(); }, [load]);

  // แสดงเฉพาะของคนที่เลือกในตัวกรอง (เจ้าของหรือผู้ถูกเชิญ)
  const passFilter = (who?: string | null, att?: string[]) =>
    effSel.length === 0 || (who != null && effSel.includes(who)) || (att ?? []).some((a) => effSel.includes(a));
  const allItems: CalItem[] = [
    ...events.filter((e) => passFilter(e.created_by, e.attendees)).map((e) => ({
      key: `ev${e.id}`, date: e.event_date, time: e.event_time, title: e.title, type: e.event_type,
      source: "event" as const, ev: e, who: e.created_by, att: e.attendees ?? [],
      sub: [custName(e.customer_id), contactName(e.contact_id)].filter(Boolean).join(" · ") || undefined,
    })),
    ...extraItems.filter((x) => passFilter(x.who, x.att)),
  ];
  const itemsOn = (d: string) => allItems.filter((x) => x.date === d).sort((a, b) => (a.time ?? "").localeCompare(b.time ?? ""));

  // ตารางเดือน
  const year = month.getFullYear(), mon = month.getMonth();
  const firstDow = new Date(year, mon, 1).getDay();
  const daysInMonth = new Date(year, mon + 1, 0).getDate();
  const cells: (string | null)[] = [
    ...Array.from({ length: firstDow }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => `${year}-${pad(mon + 1)}-${pad(i + 1)}`),
  ];
  const monthLabel = month.toLocaleDateString("th-TH", { month: "long", year: "numeric" });

  const resetForm = () => {
    setEditId(null); setFTitle(""); setFType("โทรนัด"); setFDate(selDate); setFTime("09:00");
    setFDur(60); setFLoc(""); setFCust(null); setFContact(null); setFCustText(""); setFContactText(""); setFNotes(""); setFAtt(empId ? [empId] : []);
    setFProj(null); setFDeal(null); setErr("");
  };
  const openNew = () => { resetForm(); setShowForm(true); };
  const openEdit = (e: DbEvent) => {
    setEditId(e.id); setFTitle(e.title); setFType(e.event_type); setFDate(e.event_date); setFTime(e.event_time ?? "09:00");
    setFDur(e.duration_min); setFLoc(e.location ?? ""); setFCust(e.customer_id); setFContact(e.contact_id);
    setFCustText(custName(e.customer_id) ?? ""); setFContactText(contactName(e.contact_id) ?? "");
    setFNotes(e.notes ?? ""); setFAtt(e.attendees ?? []); setFProj(e.project_id); setFDeal(e.deal_id); setErr(""); setShowForm(true);
  };

  const save = async () => {
    if (!supabase || !fTitle.trim() || !fDate) { setErr("กรุณาระบุชื่อกิจกรรมและวันที่"); return; }
    setSaving(true); setErr("");
    const row = {
      title: fTitle.trim(), event_type: fType, event_date: fDate, event_time: fTime || null,
      duration_min: fDur, location: fLoc.trim() || null, customer_id: fCust, contact_id: fContact,
      notes: fNotes.trim() || null, attendees: fAtt, project_id: fProj, deal_id: fDeal,
    };
    const r = editId === null
      ? await supabase.from("calendar_events").insert({ ...row, created_by: empId || null })
      : await supabase.from("calendar_events").update(row).eq("id", editId);
    setSaving(false);
    if (r.error) { setErr(r.error.message); return; }
    setShowForm(false); setSelDate(fDate);
    load();
  };

  const remove = async (e: DbEvent) => {
    if (!supabase) return;
    if (!confirm(`ลบกิจกรรม "${e.title}"?`)) return;
    await supabase.from("calendar_events").delete().eq("id", e.id);
    setShowForm(false);
    load();
  };

  const custContacts = contacts.filter((c) => c.customer_id === fCust);

  if (!supabase) {
    return <p className="text-[13px] text-muted bg-ice/50 rounded-lg px-3 py-2 inline-block">⚠ ยังไม่ได้เชื่อมต่อฐานข้อมูล</p>;
  }

  return (
    <>
      {/* ฟอร์มเพิ่ม/แก้ไข */}
      {showForm && (
        <div className="card-white p-5 mb-4 border-2 border-brand/30">
          <p className="font-bold text-navy text-[15px]">{editId === null ? "＋ วางแผนกิจกรรมใหม่" : "✎ แก้ไขกิจกรรม"}</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {EVENT_TYPES.map((t) => (
              <button key={t} onClick={() => setFType(t)}
                className={`text-[12.5px] font-semibold rounded-lg px-3 py-1.5 border transition ${fType === t ? "bg-brand text-white border-brand" : "bg-white border-ice text-muted hover:border-brand"}`}>
                {t}
              </button>
            ))}
          </div>
          <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="text-[11.5px] font-bold text-muted">ชื่อกิจกรรม *</label>
              <input value={fTitle} onChange={(e) => setFTitle(e.target.value)} placeholder="เช่น โทรนัดคุณสมชาย / เข้าพบ KYB นำเสนอ AGV"
                className="mt-1 w-full rounded-lg border border-ice px-3 py-2 text-[13px]" />
            </div>
            <div className="flex gap-2.5">
              <div className="flex-1">
                <label className="text-[11.5px] font-bold text-muted">วันที่ *</label>
                <input type="date" value={fDate} onChange={(e) => setFDate(e.target.value)} className="mt-1 w-full rounded-lg border border-ice px-2.5 py-2 text-[13px]" />
              </div>
              <div>
                <label className="text-[11.5px] font-bold text-muted">เวลา</label>
                <input type="time" value={fTime} onChange={(e) => setFTime(e.target.value)} className="mt-1 w-24 rounded-lg border border-ice px-2 py-2 text-[13px]" />
              </div>
              <div>
                <label className="text-[11.5px] font-bold text-muted">นาที</label>
                <input type="number" min={15} step={15} value={fDur} onChange={(e) => setFDur(+e.target.value || 60)} className="mt-1 w-20 rounded-lg border border-ice px-2 py-2 text-[13px] text-right" />
              </div>
            </div>
            <div>
              <label className="text-[11.5px] font-bold text-muted">สถานที่ / ลิงก์ประชุม</label>
              <input value={fLoc} onChange={(e) => setFLoc(e.target.value)} placeholder="เช่น โรงงานลูกค้า ชลบุรี / Google Meet"
                className="mt-1 w-full rounded-lg border border-ice px-3 py-2 text-[13px]" />
            </div>
            <div>
              <label className="text-[11.5px] font-bold text-muted">ลูกค้า (พิมพ์ค้นหาแล้วเลือก)</label>
              <input list="cal-customers" value={fCustText}
                onChange={(e) => {
                  const v = e.target.value; setFCustText(v);
                  // จับคู่แบบยืดหยุ่น: ตรงเป๊ะ → ไม่สนตัวพิมพ์/ช่องว่าง → ถ้าพิมพ์แล้วเหลือตัวเดียวที่ขึ้นต้นตรงกัน
                  const nz = (s: string) => s.toLowerCase().replace(/\s+/g, "");
                  const hit = customers.find((c) => c.name === v)
                    ?? customers.find((c) => nz(c.name) === nz(v))
                    ?? (v.trim().length >= 3 ? (() => { const m = customers.filter((c) => nz(c.name).startsWith(nz(v))); return m.length === 1 ? m[0] : undefined; })() : undefined);
                  setFCust(hit?.id ?? null);
                  if (!hit) { setFContact(null); setFContactText(""); }
                }}
                onBlur={() => { const c = customers.find((x) => x.id === fCust); if (c && fCustText !== c.name) setFCustText(c.name); }}
                placeholder="พิมพ์ชื่อบริษัท..."
                className={`mt-1 w-full rounded-lg border px-3 py-2 text-[13px] ${fCustText && fCust === null ? "border-[#D94141]/60 bg-[#D94141]/5" : fCust !== null ? "border-[#2E9E5B]/60" : "border-ice"}`} />
              <datalist id="cal-customers">{customers.map((c) => <option key={c.id} value={c.name} />)}</datalist>
              {fCustText && fCust === null && <p className="text-[10.5px] text-[#D94141] font-semibold mt-0.5">⚠ ยังไม่ผูกกับลูกค้าในระบบ — เลือกชื่อจากรายการ ไม่งั้นชื่อลูกค้าจะไม่แสดงบนปฏิทิน</p>}
              {fCust !== null && <p className="text-[10.5px] text-[#2E9E5B] mt-0.5">✓ ผูกกับ {custName(fCust)}</p>}
            </div>
            {fCust !== null && (
              <div>
                <label className="text-[11.5px] font-bold text-muted">ผู้ติดต่อ (พิมพ์ค้นหาแล้วเลือก)</label>
                <input list="cal-contacts" value={fContactText}
                  onChange={(e) => {
                    const v = e.target.value; setFContactText(v);
                    const hit = custContacts.find((c) => c.name === v);
                    setFContact(hit?.id ?? null);
                  }}
                  placeholder="พิมพ์ชื่อผู้ติดต่อ..."
                  className="mt-1 w-full rounded-lg border border-ice px-3 py-2 text-[13px]" />
                <datalist id="cal-contacts">{custContacts.map((c) => <option key={c.id} value={c.name}>{c.position ?? ""}</option>)}</datalist>
              </div>
            )}
            <div>
              <label className="text-[11.5px] font-bold text-muted">📁 โปรเจกต์ที่เกี่ยวข้อง (ถ้ามี)</label>
              <select value={fProj ?? ""} onChange={(e) => setFProj(e.target.value ? Number(e.target.value) : null)}
                className="mt-1 w-full rounded-lg border border-ice px-2.5 py-2 text-[13px] bg-white">
                <option value="">— ไม่ระบุ —</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.code ? `${p.code} — ` : ""}{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[11.5px] font-bold text-muted">🤝 ดีลที่เกี่ยวข้อง (ถ้ามี)</label>
              <select value={fDeal ?? ""} onChange={(e) => setFDeal(e.target.value ? Number(e.target.value) : null)}
                className="mt-1 w-full rounded-lg border border-ice px-2.5 py-2 text-[13px] bg-white">
                <option value="">— ไม่ระบุ —</option>
                {deals.map((d) => <option key={d.id} value={d.id}>D-{String(d.id).padStart(3, "0")} — {d.customer_name}{d.solution ? ` (${d.solution})` : ""}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="text-[11.5px] font-bold text-muted">โน้ต</label>
              <input value={fNotes} onChange={(e) => setFNotes(e.target.value)} placeholder="รายละเอียดเพิ่มเติม เตรียมเอกสาร ฯลฯ"
                className="mt-1 w-full rounded-lg border border-ice px-3 py-2 text-[13px]" />
            </div>
            <div className="sm:col-span-2">
              <label className="text-[11.5px] font-bold text-muted">ผู้ร่วมกิจกรรม ({fAtt.length} คน) — คนที่ถูกเชิญจะเห็นกิจกรรมนี้ในปฏิทินตัวเอง</label>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {emps.map((e) => (
                  <button key={e.id} onClick={() => setFAtt((prev) => prev.includes(e.id) ? prev.filter((x) => x !== e.id) : [...prev, e.id])}
                    className={`text-[12px] font-semibold rounded-lg px-2.5 py-1.5 border transition ${fAtt.includes(e.id) ? "bg-brand text-white border-brand" : "bg-white border-ice text-muted hover:border-brand hover:text-brand"}`}>
                    {fAtt.includes(e.id) ? "✓ " : ""}{e.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
          {err && <p className="mt-2 text-[12.5px] text-[#D94141]">⚠ {err}</p>}
          <div className="mt-3 flex flex-wrap gap-2">
            <button onClick={save} disabled={saving} className="btn btn-primary text-[13px] py-2 px-4 disabled:opacity-50">
              {saving ? "กำลังบันทึก..." : editId === null ? "บันทึกลงปฏิทิน" : "บันทึกการแก้ไข"}
            </button>
            <button onClick={() => setShowForm(false)} className="btn btn-outline text-[13px] py-2 px-4">ยกเลิก</button>
            {editId !== null && (
              <button onClick={() => { const e = events.find((x) => x.id === editId); if (e) remove(e); }}
                className="ml-auto text-[12.5px] font-semibold text-[#D94141]/70 hover:text-[#D94141]">🗑 ลบกิจกรรม</button>
            )}
          </div>
        </div>
      )}

      <div className="grid gap-5 min-[1040px]:grid-cols-[1fr_360px] items-start">
        {/* ปฏิทินเดือน */}
        <div className="card-white p-5 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-3">
            <button onClick={() => setMonth(new Date(year, mon - 1, 1))} className="btn btn-outline text-[13px] py-1.5 px-3">←</button>
            <p className="font-bold text-navy text-[16px]">{monthLabel}</p>
            <div className="flex gap-1.5">
              <button onClick={() => { const d = new Date(); setMonth(new Date(d.getFullYear(), d.getMonth(), 1)); setSelDate(todayStr()); }}
                className="btn btn-outline text-[12px] py-1.5 px-2.5">วันนี้</button>
              <button onClick={() => setMonth(new Date(year, mon + 1, 1))} className="btn btn-outline text-[13px] py-1.5 px-3">→</button>
            </div>
          </div>
          {/* กรองรายคน — เลือกได้หลายคน */}
          <div className="mb-3 flex flex-wrap items-center gap-1.5">
            <span className="text-[11.5px] font-bold text-muted mr-1">👥 ดูปฏิทินของ:</span>
            {emps.map((e) => {
              const on = effSel.includes(e.id);
              return (
                <button key={e.id} onClick={() => setSelEmps(on ? effSel.filter((x) => x !== e.id) : [...effSel, e.id])}
                  className={`flex items-center gap-1 text-[11.5px] font-semibold rounded-full pl-1 pr-2.5 py-0.5 border transition ${on ? "border-transparent text-white" : "bg-white border-ice text-muted hover:border-brand"}`}
                  style={on ? { backgroundColor: personColor(e.id) } : undefined}>
                  <span className="w-4 h-4 rounded-full flex items-center justify-center text-[9.5px] font-bold text-white shrink-0"
                    style={{ backgroundColor: on ? "rgba(255,255,255,0.25)" : personColor(e.id) }}>
                    {personInitial(e.id)}
                  </span>
                  {e.nickname?.trim() || e.name}
                </button>
              );
            })}
            <button onClick={() => setSelEmps(effSel.length === emps.length ? (empId ? [empId] : []) : emps.map((e) => e.id))}
              className="text-[11px] font-semibold text-sky hover:text-brand px-1">
              {effSel.length === emps.length ? "✕ เหลือแค่ฉัน" : "✓ ทุกคน"}
            </button>
          </div>
          <div className="grid grid-cols-7 text-center text-[11.5px] font-bold text-sky border-b border-ice pb-1.5">
            {["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"].map((d) => <span key={d}>{d}</span>)}
          </div>
          <div className="grid grid-cols-7 gap-1 mt-1.5">
            {cells.map((d, i) => {
              if (!d) return <div key={`x${i}`} />;
              const items = itemsOn(d);
              const isToday = d === todayStr();
              const isSel = d === selDate;
              return (
                <button key={d} onClick={() => setSelDate(d)}
                  className={`min-h-[58px] rounded-lg border p-1 text-left transition ${
                    isSel ? "border-brand bg-ice/50" : isToday ? "border-amber/60 bg-amber/5" : "border-ice/60 hover:border-brand"
                  }`}>
                  <p className={`text-[11px] font-bold ${isToday ? "text-amber" : "text-navy"}`}>{Number(d.slice(-2))}</p>
                  <div className="mt-0.5 flex flex-wrap gap-0.5">
                    {(() => {
                      const badges = items.flatMap((x) => badgesFor(x).map((w, i) => ({ k: `${x.key}-${i}`, w, x })));
                      return (
                        <>
                          {badges.slice(0, 4).map(({ k, w, x }) => (
                            <span key={k} title={`${x.title} — ${empName(w)}`}
                              className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white leading-none ${x.source === "leave" ? "opacity-35" : ""}`}
                              style={{ backgroundColor: personColor(w) }}>
                              {personInitial(w)}
                            </span>
                          ))}
                          {badges.length > 4 && <span className="text-[9px] text-muted">+{badges.length - 4}</span>}
                        </>
                      );
                    })()}
                  </div>
                </button>
              );
            })}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted/70">
            {emps.filter((e) => effSel.includes(e.id)).map((e) => (
              <span key={e.id} className="flex items-center gap-1">
                <span className="w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8.5px] font-bold text-white" style={{ backgroundColor: personColor(e.id) }}>{personInitial(e.id)}</span>
                {e.nickname?.trim() || e.name}
              </span>
            ))}
            <span className="flex items-center gap-1">
              <span className="w-3.5 h-3.5 rounded-full opacity-35 flex items-center justify-center text-[8.5px] font-bold text-white bg-navy">ก</span>
              = วันลา (สีจาง)
            </span>
          </div>
        </div>

        {/* รายการของวันที่เลือก */}
        <div className="card-white p-5 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="font-bold text-navy text-[14px]">{fmtThai(selDate)}</p>
            <button onClick={openNew} className="btn btn-primary text-[12.5px] py-1.5 px-3">＋ วางแผน</button>
          </div>
          <div className="mt-3 space-y-2.5 max-h-[560px] overflow-y-auto pr-1">
            {itemsOn(selDate).map((x) => (
              <div key={x.key} className="rounded-xl border border-ice p-3 text-[12.5px]">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-bold text-navy leading-snug">
                      {x.time && <span className="text-brand mr-1.5">{x.time}</span>}{x.title}
                    </p>
                    <p className="mt-1">
                      <span className={`text-[10.5px] font-bold rounded px-1.5 py-0.5 ${x.source === "leave" ? "bg-[#2E9E5B]/15 text-[#2E9E5B]" : typeChip(x.type)}`}>{x.type}</span>
                      {x.sub && <span className="text-muted/80 text-[11.5px] ml-1.5">{x.sub}</span>}
                    </p>
                    {x.ev && (
                      <>
                        {x.ev.location && <p className="text-[11.5px] text-muted mt-1">📍 {x.ev.location}</p>}
                        {(x.ev.project_id || x.ev.deal_id) && (
                          <p className="text-[11px] text-muted/80 mt-0.5">
                            {[
                              x.ev.project_id && (() => { const p = projects.find((pp) => pp.id === x.ev!.project_id); return p ? `📁 ${p.code ? p.code + " " : ""}${p.name}` : null; })(),
                              x.ev.deal_id && (() => { const dd = deals.find((z) => z.id === x.ev!.deal_id); return dd ? `🤝 D-${String(dd.id).padStart(3, "0")} ${dd.customer_name}` : null; })(),
                            ].filter(Boolean).join(" · ")}
                          </p>
                        )}
                        {x.ev.attendees.length > 0 && (
                          <p className="text-[11px] text-muted/80 mt-0.5">👥 {x.ev.attendees.map(empName).join(", ")}</p>
                        )}
                        {x.ev.notes && <p className="text-[11.5px] text-ink mt-1 bg-ice/40 rounded px-2 py-1">{x.ev.notes}</p>}
                        <p className="text-[10.5px] text-muted/60 mt-1">สร้างโดย {empName(x.ev.created_by)}</p>
                      </>
                    )}
                  </div>
                  {x.ev && (
                    <div className="flex flex-col gap-1 shrink-0 items-end">
                      <button onClick={() => openEdit(x.ev!)} className="text-[10.5px] font-bold bg-ice text-sky rounded px-1.5 py-0.5 hover:bg-sky/20">✎ แก้ไข</button>
                      <a href={gcalUrl(x.ev, custName(x.ev.customer_id), contactName(x.ev.contact_id))} target="_blank" rel="noreferrer"
                        className="text-[10.5px] font-bold bg-ice text-navy rounded px-1.5 py-0.5 hover:bg-sky/20" title="เพิ่มลง Google Calendar ของคุณ">
                        📅 +GCal
                      </a>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {itemsOn(selDate).length === 0 && (
              <p className="text-[12.5px] text-muted/70 text-center py-8">ไม่มีกิจกรรมวันนี้ — กด &ldquo;＋ วางแผน&rdquo; เพื่อเพิ่ม</p>
            )}
          </div>

          {/* กิจกรรมที่จะถึงเร็วๆ นี้ */}
          <p className="mt-4 font-bold text-navy text-[13px] border-t border-ice pt-3">⏭ กำลังจะถึง (7 วัน)</p>
          <div className="mt-1.5 space-y-1">
            {allItems
              .filter((x) => x.date >= todayStr() && x.date <= dateStr(new Date(Date.now() + 7 * 86400000)))
              .sort((a, b) => a.date.localeCompare(b.date) || (a.time ?? "").localeCompare(b.time ?? ""))
              .slice(0, 6)
              .map((x) => (
                <button key={x.key} onClick={() => { setSelDate(x.date); const d = new Date(x.date + "T00:00:00"); setMonth(new Date(d.getFullYear(), d.getMonth(), 1)); }}
                  className="w-full text-left text-[12px] rounded-lg px-2 py-1 hover:bg-ice/50 transition flex gap-2">
                  <span className="text-muted/80 shrink-0 w-14">{new Date(x.date + "T00:00:00").toLocaleDateString("th-TH", { day: "numeric", month: "short" })}</span>
                  <span className={`w-3.5 h-3.5 rounded-full mt-0.5 shrink-0 flex items-center justify-center text-[8.5px] font-bold text-white ${x.source === "leave" ? "opacity-35" : ""}`}
                    style={{ backgroundColor: personColor(badgesFor(x)[0]) }}>{personInitial(badgesFor(x)[0])}</span>
                  <span className="text-ink truncate">{x.time ? `${x.time} ` : ""}{x.title}</span>
                </button>
              ))}
          </div>
        </div>
      </div>
    </>
  );
}

export default function CalendarPage() {
  return (
    <StaffShell title="ปฏิทินกิจกรรม">
      <CalendarBody />
    </StaffShell>
  );
}
