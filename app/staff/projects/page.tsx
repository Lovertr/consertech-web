"use client";

// โมดูลโปรเจกต์ — ข้อมูลจริงจากฐานข้อมูล: โปรเจกต์/Milestone/Acceptance/Ticket แก้ไขได้จริง
// + Gantt สรุปแผนงาน + AI ผู้ช่วยวิศวกร

import { useCallback, useEffect, useState } from "react";
import StaffShell, { useDept } from "@/components/staff/StaffShell";
import { knowledgeBase } from "@/lib/staffData";
import { supabase } from "@/lib/supabase";
import { callCopilot } from "@/lib/copilot";

type DbProject = {
  id: number; code: string; name: string; customer: string | null; deal_id: number | null;
  pm: string | null; status: string; progress: number; note: string | null; created_at: string;
};
type DbMilestone = { id: number; project_id: number; name: string; pct: number; done: boolean; progress: number; invoice: string | null; sort: number; date_from: string | null; date_to: string | null };
type DbAcceptance = { id: number; project_id: number; item: string; done: boolean; sort: number };
type DbTicket = { id: number; no: string; project_id: number | null; site: string; issue: string; assignee: string | null; due: string | null; status: string; created_at: string };
type EmpLite = { id: string; name: string };

const PROJECT_STATUSES = ["ออกแบบ", "ติดตั้ง", "ทดสอบ", "ส่งมอบแล้ว"] as const;
const TICKET_STATUSES = ["เปิด", "นัดแล้ว", "กำลังทำ", "ปิด"] as const;

const statusChip = (s: string) =>
  s === "ติดตั้ง" ? "bg-amber/15 text-amber"
  : s === "ทดสอบ" ? "bg-ice text-brand"
  : s === "ส่งมอบแล้ว" ? "bg-[#2E9E5B]/15 text-[#2E9E5B]"
  : "bg-ice text-muted";

const fmtDate = (iso: string | null) =>
  iso ? new Date(iso + "T00:00:00").toLocaleDateString("th-TH", { day: "numeric", month: "short" }) : "-";

// Gantt จริง — สร้างจากช่วงวันที่ของ Milestone ทุกโปรเจกต์ (ตั้งค่าวันเริ่ม/สิ้นสุดได้ที่การ์ด Milestone)
function GanttSection({ projects, milestones }: { projects: DbProject[]; milestones: DbMilestone[] }) {
  const codeOf = (id: number) => projects.find((p) => p.id === id)?.code ?? `#${id}`;
  const dated = milestones.filter((m) => m.date_from && m.date_to)
    .sort((a, b) => codeOf(a.project_id).localeCompare(codeOf(b.project_id)) || a.sort - b.sort);
  if (dated.length === 0) {
    return (
      <div className="mt-5 card-white p-5 text-[13px] text-muted">
        📊 Gantt แผนงานรวม — ยังไม่มีข้อมูล: ใส่ &ldquo;วันเริ่ม → วันสิ้นสุด&rdquo; ในการ์ด Milestone ของแต่ละโปรเจกต์ แล้วแผนงานจะแสดงที่นี่อัตโนมัติ
      </div>
    );
  }
  const min = Math.min(...dated.map((m) => new Date(m.date_from!).getTime()));
  const max = Math.max(...dated.map((m) => new Date(m.date_to!).getTime()));
  const span = Math.max(1, max - min);
  const today = Date.now();
  const todayPct = today >= min && today <= max ? ((today - min) / span) * 100 : null;

  // หัวเดือนจากช่วงจริง
  const months: { label: string; left: number }[] = [];
  const cur = new Date(min); cur.setDate(1);
  while (cur.getTime() <= max) {
    months.push({
      label: cur.toLocaleDateString("th-TH", { month: "short", year: months.length === 0 || cur.getMonth() === 0 ? "2-digit" : undefined }),
      left: Math.max(0, ((cur.getTime() - min) / span) * 100),
    });
    cur.setMonth(cur.getMonth() + 1);
  }


  return (
    <div className="mt-5 card-white p-5 overflow-x-auto">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <p className="font-bold text-navy">แผนงานรวม (Gantt) — จากวันที่ Milestone จริง</p>
        <p className="text-[11px] text-muted/70">ปรับแผน: แก้วันเริ่ม/สิ้นสุดที่การ์ด Milestone ของโปรเจกต์ด้านบน</p>
      </div>
      <div className="min-w-[720px]">
        <div className="relative h-5 ml-[220px] border-b border-ice">
          {months.map((mo, i) => (
            <span key={i} className="absolute text-[11.5px] font-bold text-sky border-l border-ice/60 pl-1" style={{ left: `${mo.left}%` }}>{mo.label}</span>
          ))}
        </div>
        <div className="mt-2 space-y-1.5">
          {dated.map((m) => {
            const s = ((new Date(m.date_from!).getTime() - min) / span) * 100;
            const w = Math.max(2.5, ((new Date(m.date_to!).getTime() - new Date(m.date_from!).getTime()) / span) * 100);
            const pct = m.done ? 100 : m.progress;
            const state = m.done || pct >= 100 ? "done" : pct > 0 ? "doing" : "waiting";
            return (
              <div key={m.id} className="flex items-center text-[12px]">
                <div className="w-[220px] shrink-0 pr-3">
                  <p className="font-semibold text-navy leading-tight truncate">{m.name}</p>
                  <p className="text-[10.5px] text-muted/70">{codeOf(m.project_id)}</p>
                </div>
                <div className="relative flex-1 h-6 rounded bg-ice/40">
                  {months.map((mo, mi) => (
                    <span key={mi} className="absolute top-0 bottom-0 border-l border-ice/60" style={{ left: `${mo.left}%` }} />
                  ))}
                  {todayPct !== null && <span className="absolute top-0 bottom-0 border-l-2 border-[#D94141]/60 z-10" style={{ left: `${todayPct}%` }} />}
                  <div
                    className={`absolute top-0.5 bottom-0.5 rounded ${state === "done" ? "bg-sky/70" : state === "doing" ? "bg-brand" : "bg-amber"}`}
                    style={{ left: `${s}%`, width: `${w}%` }}
                  >
                    {pct > 0 && pct < 100 && (
                      <span className="absolute inset-y-0 left-0 bg-navy/25 rounded-l" style={{ width: `${pct}%` }} />
                    )}
                    <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white">{pct}%</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-[11px] text-muted/70">
          <span className="inline-block w-2.5 h-2.5 bg-sky/70 rounded-sm mr-1" />เสร็จแล้ว
          <span className="inline-block w-2.5 h-2.5 bg-brand rounded-sm ml-3 mr-1" />กำลังทำ
          <span className="inline-block w-2.5 h-2.5 bg-amber rounded-sm ml-3 mr-1" />รอเริ่ม
          <span className="inline-block border-l-2 border-[#D94141]/60 h-3 ml-3 mr-1 align-middle" />วันนี้
          <span className="ml-3">— ข้อมูลชุดเดียวกับที่ลูกค้าเห็นใน Client Portal</span>
        </p>
      </div>
    </div>
  );
}

// ✨ AI ผู้ช่วยวิศวกร — ถาม-ตอบเชิงเทคนิคจริง
function EngineerQA() {
  const [q, setQ] = useState("");
  const [st, setSt] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [a, setA] = useState("");
  const ask = async () => {
    if (!q.trim()) return;
    setSt("loading");
    try {
      const kb = knowledgeBase.map((k) => `- ${k.topic} (แหล่ง: ${k.source})`).join("\n");
      const j = await callCopilot({ action: "engineer_qa", payload: `คลังความรู้ภายใน:\n${kb}\n\nคำถาม: ${q.trim()}` });
      setA(String(j.text ?? ""));
      setSt("done");
    } catch (e) { setA(String(e)); setSt("error"); }
  };
  return (
    <div className="mt-4 rounded-xl border border-amber/50 bg-amber/5 p-3.5 text-[12.5px]">
      <p className="font-bold text-navy">✨ AI ผู้ช่วยวิศวกร <span className="text-[10px] font-bold bg-brand/10 text-brand rounded px-1.5 py-0.5 align-middle">AI จริง</span></p>
      <div className="mt-2 flex gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") ask(); }}
          placeholder="เช่น ตั้งค่า Protective Field ของ PICOSCAN ที่ 1.2 m/s ยังไง?"
          className="flex-1 min-w-0 rounded-lg border border-ice px-3 py-1.5 text-[12.5px] bg-white" />
        <button onClick={ask} disabled={st === "loading"} className="btn btn-amber text-[12px] py-1.5 px-3 disabled:opacity-60 shrink-0">
          {st === "loading" ? "⏳" : "ถาม"}
        </button>
      </div>
      {st === "done" && <div className="mt-2.5 text-ink whitespace-pre-wrap leading-relaxed bg-white rounded-lg border border-ice p-3">{a}</div>}
      {st === "error" && <p className="mt-2 text-[#D94141]">⚠ {a}</p>}
    </div>
  );
}

// ── ฟอร์มเพิ่มโปรเจกต์ ──
function AddProjectForm({ emps, onDone, onCancel }: { emps: EmpLite[]; onDone: (id: number) => void; onCancel: () => void }) {
  const [name, setName] = useState("");
  const [customer, setCustomer] = useState("");
  const [pm, setPm] = useState("");
  const [deals, setDeals] = useState<{ id: number; customer_name: string; solution: string | null }[]>([]);
  const [dealId, setDealId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    supabase?.from("deals").select("id,customer_name,solution").in("stage", ["won", "negotiation", "quoted"]).order("created_at", { ascending: false })
      .then(({ data }) => setDeals((data as { id: number; customer_name: string; solution: string | null }[]) ?? []));
  }, []);

  const save = async () => {
    if (!supabase || !name.trim()) { setErr("กรุณาระบุชื่อโปรเจกต์"); return; }
    setSaving(true); setErr("");
    try {
      const { data, error } = await supabase.rpc("create_project", {
        p_name: name.trim(), p_customer: customer.trim() || null, p_deal_id: dealId, p_pm: pm || null, p_note: null,
      });
      if (error) throw error;
      onDone((data as { id: number }).id);
    } catch (e) {
      setErr(String((e as Error).message ?? e));
      setSaving(false);
    }
  };

  return (
    <div className="card-white p-4 mb-4">
      <p className="font-bold text-navy text-[14px]">เพิ่มโปรเจกต์ใหม่ <span className="text-[11px] text-muted font-normal">(เลขโปรเจกต์รันอัตโนมัติ)</span></p>
      <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="text-[11.5px] font-bold text-muted">ชื่อโปรเจกต์ *</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="เช่น ติดตั้ง Tugger AGV x2 + FMS"
            className="mt-1 w-full rounded-lg border border-ice px-3 py-2 text-[13px]" />
        </div>
        <div>
          <label className="text-[11.5px] font-bold text-muted">ลูกค้า/ไซต์งาน</label>
          <input value={customer} onChange={(e) => setCustomer(e.target.value)} placeholder="เช่น คลัง B (ไซต์แหลมฉบัง)"
            className="mt-1 w-full rounded-lg border border-ice px-3 py-2 text-[13px]" />
        </div>
        <div>
          <label className="text-[11.5px] font-bold text-muted">PM ผู้รับผิดชอบ</label>
          <select value={pm} onChange={(e) => setPm(e.target.value)} className="mt-1 w-full rounded-lg border border-ice px-3 py-2 text-[13px] bg-white">
            <option value="">— เลือก —</option>
            {emps.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="text-[11.5px] font-bold text-muted">อ้างอิงดีล (ไม่บังคับ)</label>
          <select value={dealId ?? ""} onChange={(e) => setDealId(e.target.value ? Number(e.target.value) : null)}
            className="mt-1 w-full rounded-lg border border-ice px-3 py-2 text-[13px] bg-white">
            <option value="">— ไม่อ้างอิง —</option>
            {deals.map((d) => <option key={d.id} value={d.id}>D-{String(d.id).padStart(3, "0")} — {d.customer_name} ({d.solution ?? "-"})</option>)}
          </select>
        </div>
      </div>
      {err && <p className="mt-2 text-[12.5px] text-[#D94141]">⚠ {err}</p>}
      <div className="mt-3 flex gap-2">
        <button onClick={save} disabled={saving} className="btn btn-primary text-[13px] py-2 px-4 disabled:opacity-50">{saving ? "กำลังบันทึก..." : "สร้างโปรเจกต์"}</button>
        <button onClick={onCancel} className="btn btn-outline text-[13px] py-2 px-4">ยกเลิก</button>
      </div>
    </div>
  );
}

function ProjectsBody() {
  const { access, empId } = useDept();
  const readOnly = access("projects") === "read";
  const [projects, setProjects] = useState<DbProject[]>([]);
  const [emps, setEmps] = useState<EmpLite[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [milestones, setMilestones] = useState<DbMilestone[]>([]);
  const [allMilestones, setAllMilestones] = useState<DbMilestone[]>([]);
  const [acceptance, setAcceptance] = useState<DbAcceptance[]>([]);
  const [tickets, setTickets] = useState<DbTicket[]>([]);
  const [adding, setAdding] = useState(false);
  // ฟอร์มย่อย
  const [msName, setMsName] = useState(""); const [msPct, setMsPct] = useState(10);
  const [accItem, setAccItem] = useState("");
  const [showTicketForm, setShowTicketForm] = useState(false);
  const [tkSite, setTkSite] = useState(""); const [tkIssue, setTkIssue] = useState("");
  const [tkAssignee, setTkAssignee] = useState(""); const [tkDue, setTkDue] = useState(""); const [tkProject, setTkProject] = useState<number | null>(null);

  const empName = (id: string | null) => emps.find((e) => e.id === id)?.name ?? id ?? "-";

  const load = useCallback(async () => {
    if (!supabase) return;
    const [p, e, t] = await Promise.all([
      supabase.from("projects").select("*").order("code"),
      supabase.from("employees").select("id,name"),
      supabase.from("project_tickets").select("*").order("no", { ascending: false }),
    ]);
    const list = (p.data as DbProject[]) ?? [];
    setProjects(list);
    setEmps((e.data as EmpLite[]) ?? []);
    setTickets((t.data as DbTicket[]) ?? []);
    setSelectedId((prev) => (prev !== null && list.some((x) => x.id === prev) ? prev : list[0]?.id ?? null));
  }, []);
  useEffect(() => { load(); }, [load]);

  const loadDetail = useCallback(async () => {
    if (!supabase) return;
    const [m, a] = await Promise.all([
      supabase.from("project_milestones").select("*").order("sort"),
      selectedId !== null
        ? supabase.from("project_acceptance").select("*").eq("project_id", selectedId).order("sort")
        : Promise.resolve({ data: [] }),
    ]);
    const all = (m.data as DbMilestone[]) ?? [];
    setAllMilestones(all);
    setMilestones(selectedId !== null ? all.filter((x) => x.project_id === selectedId) : []);
    setAcceptance((a.data as DbAcceptance[]) ?? []);
  }, [selectedId]);
  useEffect(() => { loadDetail(); }, [loadDetail]);

  const selected = projects.find((p) => p.id === selectedId) ?? null;

  const patchProject = async (patch: Record<string, unknown>) => {
    if (!supabase || !selected) return;
    setProjects((prev) => prev.map((p) => (p.id === selected.id ? { ...p, ...patch } : p)));
    await supabase.from("projects").update(patch).eq("id", selected.id);
    load();
  };

  const removeProject = async () => {
    if (!supabase || !selected) return;
    if (!confirm(`ลบโปรเจกต์ ${selected.code} — ${selected.name}?\n(Milestone และ Acceptance ของโปรเจกต์นี้จะถูกลบด้วย)`)) return;
    await supabase.from("projects").delete().eq("id", selected.id);
    setSelectedId(null);
    load();
  };

  // Milestones — % โปรเจกต์ = ผลรวมถ่วงน้ำหนัก (งวด% × ความคืบหน้างวด) อัตโนมัติ ให้ตัวเลขตรงกันทั้งระบบ
  const syncProgress = async (projectId: number) => {
    if (!supabase) return;
    const { data } = await supabase.from("project_milestones").select("pct,progress").eq("project_id", projectId);
    const sum = Math.min(100, Math.round(((data as { pct: number; progress: number }[]) ?? []).reduce((a, x) => a + x.pct * x.progress / 100, 0)));
    await supabase.from("projects").update({ progress: sum }).eq("id", projectId);
    load();
  };
  const toggleMilestone = async (m: DbMilestone) => {
    if (!supabase || readOnly) return;
    const done = !m.done;
    await supabase.from("project_milestones").update({ done, progress: done ? 100 : 0 }).eq("id", m.id);
    await syncProgress(m.project_id);
    loadDetail();
  };
  const setMsProgress = async (m: DbMilestone, progress: number) => {
    if (!supabase || readOnly) return;
    const v = Math.max(0, Math.min(100, progress));
    await supabase.from("project_milestones").update({ progress: v, done: v >= 100 }).eq("id", m.id);
    await syncProgress(m.project_id);
    loadDetail();
  };
  const setInvoice = async (m: DbMilestone, invoice: string) => {
    if (!supabase) return;
    await supabase.from("project_milestones").update({ invoice: invoice.trim() || null }).eq("id", m.id);
    loadDetail();
  };
  const setMsDates = async (m: DbMilestone, field: "date_from" | "date_to", value: string) => {
    if (!supabase) return;
    await supabase.from("project_milestones").update({ [field]: value || null }).eq("id", m.id);
    loadDetail();
  };
  const addMilestone = async () => {
    if (!supabase || !selected || !msName.trim()) return;
    await supabase.from("project_milestones").insert({
      project_id: selected.id, name: msName.trim(), pct: msPct, sort: (milestones.at(-1)?.sort ?? 0) + 1,
    });
    setMsName(""); setMsPct(10);
    loadDetail();
  };
  const delMilestone = async (m: DbMilestone) => {
    if (!supabase) return;
    await supabase.from("project_milestones").delete().eq("id", m.id);
    await syncProgress(m.project_id);
    loadDetail();
  };

  // Acceptance
  const toggleAcceptance = async (a: DbAcceptance) => {
    if (!supabase || readOnly) return;
    setAcceptance((prev) => prev.map((x) => (x.id === a.id ? { ...x, done: !x.done } : x)));
    await supabase.from("project_acceptance").update({ done: !a.done }).eq("id", a.id);
  };
  const addAcceptance = async () => {
    if (!supabase || !selected || !accItem.trim()) return;
    await supabase.from("project_acceptance").insert({
      project_id: selected.id, item: accItem.trim(), sort: (acceptance.at(-1)?.sort ?? 0) + 1,
    });
    setAccItem("");
    loadDetail();
  };
  const delAcceptance = async (a: DbAcceptance) => {
    if (!supabase) return;
    await supabase.from("project_acceptance").delete().eq("id", a.id);
    loadDetail();
  };

  // Tickets
  const nextTicketNo = () => {
    const max = tickets.reduce((mx, t) => Math.max(mx, Number(t.no.replace(/\D/g, "")) || 0), 0);
    return `TK-${max + 1}`;
  };
  const addTicket = async () => {
    if (!supabase || !tkSite.trim() || !tkIssue.trim()) return;
    await supabase.from("project_tickets").insert({
      no: nextTicketNo(), project_id: tkProject, site: tkSite.trim(), issue: tkIssue.trim(),
      assignee: tkAssignee || empId || null, due: tkDue || null, status: "เปิด",
    });
    setTkSite(""); setTkIssue(""); setTkAssignee(""); setTkDue(""); setTkProject(null); setShowTicketForm(false);
    load();
  };
  const setTicketStatus = async (t: DbTicket, status: string) => {
    if (!supabase) return;
    await supabase.from("project_tickets").update({ status }).eq("id", t.id);
    load();
  };

  if (!supabase) {
    return <p className="text-[13px] text-muted bg-ice/50 rounded-lg px-3 py-2 inline-block">⚠ ยังไม่ได้เชื่อมต่อฐานข้อมูล</p>;
  }

  return (
    <>
      {readOnly && (
        <p className="mb-3 text-[12.5px] bg-ice text-sky font-semibold rounded-lg px-3 py-2 inline-block">
          👁️ ดูอย่างเดียว — จัดการได้เฉพาะฝ่ายวิศวกรรม / PM
        </p>
      )}
      {!readOnly && !adding && (
        <button onClick={() => setAdding(true)} className="btn btn-primary text-[13px] py-2 px-3.5 mb-3">＋ เพิ่มโปรเจกต์ใหม่</button>
      )}
      {adding && <AddProjectForm emps={emps} onDone={(id) => { setAdding(false); setSelectedId(id); load(); }} onCancel={() => setAdding(false)} />}

      <div className="grid gap-4 min-[900px]:grid-cols-3">
        {projects.map((p) => (
          <button key={p.id} onClick={() => setSelectedId(p.id)}
            className={`text-left card-white p-4 transition ${selectedId === p.id ? "!border-brand shadow-sm" : ""}`}>
            <div className="flex justify-between text-[11px] font-bold">
              <span className="text-sky">{p.code}</span>
              <span className={`rounded px-1.5 py-0.5 ${statusChip(p.status)}`}>{p.status}</span>
            </div>
            <p className="mt-1.5 font-bold text-navy text-[14px] leading-snug">{p.name}</p>
            <p className="text-[12px] text-muted">{p.customer ?? "-"} · {empName(p.pm)}</p>
            <div className="mt-2.5 flex items-center gap-2">
              <div className="flex-1 h-1.5 rounded-full bg-ice overflow-hidden">
                <div className="h-full bg-brand rounded-full" style={{ width: `${p.progress}%` }} />
              </div>
              <span className="text-[11.5px] font-bold text-brand">{p.progress}%</span>
            </div>
          </button>
        ))}
        {projects.length === 0 && <p className="text-[13px] text-muted col-span-3">ยังไม่มีโปรเจกต์</p>}
      </div>

      {selected && (
        <>
          {/* แถบจัดการโปรเจกต์ที่เลือก */}
          {!readOnly && (
            <div className="mt-4 card-white p-4 flex flex-wrap items-center gap-3 text-[13px]">
              <strong className="text-navy">{selected.code}</strong>
              <label className="flex items-center gap-1.5">สถานะ:
                <select value={selected.status} onChange={(e) => patchProject({ status: e.target.value })}
                  className="rounded-lg border border-ice px-2 py-1.5 bg-white text-[12.5px]">
                  {PROJECT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </label>
              <label className="flex items-center gap-1.5">PM:
                <select value={selected.pm ?? ""} onChange={(e) => patchProject({ pm: e.target.value || null })}
                  className="rounded-lg border border-ice px-2 py-1.5 bg-white text-[12.5px]">
                  <option value="">—</option>
                  {emps.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
              </label>
              <span className="flex items-center gap-2 flex-1 min-w-[220px]">ความคืบหน้า:
                <span className="flex-1 h-2 rounded-full bg-ice overflow-hidden">
                  <span className="block h-full bg-brand rounded-full transition-all" style={{ width: `${selected.progress}%` }} />
                </span>
                <span className="font-bold text-brand w-10 text-right">{selected.progress}%</span>
              </span>
              <span className="text-[11px] text-muted/70">อัตโนมัติ = ผลรวม งวด% × ความคืบหน้าของแต่ละ Milestone</span>
              <button onClick={removeProject} className="text-[12px] font-semibold text-[#D94141]/70 hover:text-[#D94141] ml-auto">🗑 ลบ</button>
            </div>
          )}

          <div className="mt-4 grid gap-5 min-[1040px]:grid-cols-2 items-start">
            {/* Milestones */}
            <div className="card-white p-5">
              <h3 className="font-bold text-navy text-[15px]">Milestone / งวดจ่าย — {selected.code}</h3>
              <div className="mt-3 space-y-2.5">
                {milestones.map((m, i) => (
                  <div key={m.id} className={`flex items-center gap-3 rounded-lg border p-3 text-[13px] ${m.done ? "border-ice bg-ice/40" : "border-dashed border-ice"}`}>
                    <button onClick={() => toggleMilestone(m)} disabled={readOnly}
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-[12px] font-bold shrink-0 transition ${m.done ? "bg-brand text-white" : "bg-ice text-muted hover:bg-brand/20"}`}
                      title={readOnly ? undefined : "กดเพื่อสลับสถานะเสร็จ/ไม่เสร็จ"}>
                      {m.done ? "✓" : i + 1}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className={`font-semibold ${m.done ? "text-navy" : "text-muted"}`}>{m.name}</p>
                      {readOnly ? (
                        <>
                          {m.invoice && <p className="text-[11px] text-sky">→ ใบแจ้งหนี้ {m.invoice}</p>}
                          {m.date_from && <p className="text-[10.5px] text-muted/70">{m.date_from} → {m.date_to ?? "?"}</p>}
                        </>
                      ) : (
                        <>
                        <div className="mt-1 flex flex-wrap gap-1.5 items-center">
                          <input defaultValue={m.invoice ?? ""} key={`inv${m.id}${m.invoice ?? ""}`} placeholder="เลขใบแจ้งหนี้"
                            onBlur={(e) => { if (e.target.value !== (m.invoice ?? "")) setInvoice(m, e.target.value); }}
                            className="w-[120px] text-[11px] rounded border border-ice/70 px-2 py-1 text-sky" />
                          <input type="date" value={m.date_from ?? ""} onChange={(e) => setMsDates(m, "date_from", e.target.value)}
                            className="text-[10.5px] rounded border border-ice/70 px-1.5 py-1 text-muted" title="วันเริ่ม (แสดงใน Gantt พอร์ทัลลูกค้า)" />
                          <span className="text-[10px] text-muted/50">→</span>
                          <input type="date" value={m.date_to ?? ""} onChange={(e) => setMsDates(m, "date_to", e.target.value)}
                            className="text-[10.5px] rounded border border-ice/70 px-1.5 py-1 text-muted" title="วันสิ้นสุด" />
                        </div>
                        <div className="mt-1.5 flex items-center gap-2" title="ความคืบหน้าของงานในงวดนี้ — ลากปรับได้">
                          <span className="text-[10.5px] text-muted shrink-0">งานคืบหน้า</span>
                          <input type="range" min={0} max={100} step={5} value={m.progress}
                            onChange={(e) => setMsProgress(m, +e.target.value)} className="flex-1 accent-[#15659E] h-1.5" />
                          <span className={`text-[11px] font-bold w-9 text-right ${m.progress >= 100 ? "text-[#2E9E5B]" : "text-brand"}`}>{m.progress}%</span>
                        </div>
                        </>
                      )}
                    </div>
                    <span className="text-[12px] font-bold text-amber shrink-0">{m.pct}%</span>
                    {!readOnly && <button onClick={() => delMilestone(m)} className="text-muted/50 hover:text-[#D94141] shrink-0">✕</button>}
                  </div>
                ))}
                {milestones.length === 0 && <p className="text-[12.5px] text-muted/70">ยังไม่มี Milestone</p>}
              </div>
              {!readOnly && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <input value={msName} onChange={(e) => setMsName(e.target.value)} placeholder="เพิ่ม Milestone เช่น ติดตั้งเสร็จ 30%"
                    onKeyDown={(e) => { if (e.key === "Enter") addMilestone(); }}
                    className="flex-1 min-w-[180px] rounded-lg border border-ice px-3 py-2 text-[12.5px]" />
                  <input type="number" min={0} max={100} value={msPct} onChange={(e) => setMsPct(+e.target.value || 0)}
                    className="w-20 text-right rounded-lg border border-ice px-2 py-2 text-[12.5px]" title="% งวด" />
                  <button onClick={addMilestone} disabled={!msName.trim()} className="btn btn-primary text-[12.5px] py-2 px-3 disabled:opacity-50">เพิ่ม</button>
                </div>
              )}
            </div>

            {/* Acceptance */}
            <div className="card-white p-5">
              <h3 className="font-bold text-navy text-[15px]">Acceptance Test Checklist</h3>
              <div className="mt-3 space-y-1.5">
                {acceptance.map((a) => (
                  <div key={a.id} className="flex items-start gap-2.5 text-[13px] py-1 group">
                    <input type="checkbox" checked={a.done} disabled={readOnly} onChange={() => toggleAcceptance(a)} className="mt-0.5 accent-[#15659E]" />
                    <span className={`flex-1 ${a.done ? "text-ink" : "text-muted"}`}>{a.item}</span>
                    {!readOnly && <button onClick={() => delAcceptance(a)} className="text-muted/40 hover:text-[#D94141] opacity-0 group-hover:opacity-100">✕</button>}
                  </div>
                ))}
                {acceptance.length === 0 && <p className="text-[12.5px] text-muted/70">ยังไม่มีเกณฑ์ทดสอบ</p>}
              </div>
              {!readOnly && (
                <div className="mt-3 flex gap-2">
                  <input value={accItem} onChange={(e) => setAccItem(e.target.value)} placeholder="เพิ่มเกณฑ์ทดสอบ..."
                    onKeyDown={(e) => { if (e.key === "Enter") addAcceptance(); }}
                    className="flex-1 rounded-lg border border-ice px-3 py-2 text-[12.5px]" />
                  <button onClick={addAcceptance} disabled={!accItem.trim()} className="btn btn-outline text-[12.5px] py-2 px-3 disabled:opacity-50">เพิ่ม</button>
                </div>
              )}
              <EngineerQA />
            </div>
          </div>
        </>
      )}

      <GanttSection projects={projects} milestones={allMilestones} />

      {/* Tickets */}
      <div className="mt-5 card-white overflow-hidden">
        <div className="flex flex-wrap justify-between items-center px-5 pt-4 pb-2 gap-2">
          <p className="font-bold text-navy">Ticket ซ่อมบำรุง / บริการหลังการขาย <span className="text-sky text-[12.5px]">({tickets.filter((t) => t.status !== "ปิด").length} เปิดอยู่)</span></p>
          {!readOnly && !showTicketForm && (
            <button onClick={() => setShowTicketForm(true)} className="btn btn-primary text-[12.5px] py-1.5 px-3">＋ เปิด Ticket</button>
          )}
        </div>
        {showTicketForm && (
          <div className="mx-5 mb-3 rounded-xl border-2 border-brand/30 p-3.5 flex flex-wrap gap-2 items-end text-[12.5px]">
            <div className="flex-1 min-w-[140px]">
              <label className="text-[11px] font-bold text-muted">ไซต์งาน *</label>
              <input value={tkSite} onChange={(e) => setTkSite(e.target.value)} placeholder="เช่น ไซต์ B"
                className="mt-1 w-full rounded-lg border border-ice px-2.5 py-1.5" />
            </div>
            <div className="flex-[2] min-w-[200px]">
              <label className="text-[11px] font-bold text-muted">งานที่ต้องทำ *</label>
              <input value={tkIssue} onChange={(e) => setTkIssue(e.target.value)} placeholder="อาการ/งานซ่อมบำรุง"
                className="mt-1 w-full rounded-lg border border-ice px-2.5 py-1.5" />
            </div>
            <div>
              <label className="text-[11px] font-bold text-muted">ผู้รับผิดชอบ</label>
              <select value={tkAssignee} onChange={(e) => setTkAssignee(e.target.value)} className="mt-1 rounded-lg border border-ice px-2 py-1.5 bg-white">
                <option value="">ฉันเอง</option>
                {emps.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-bold text-muted">กำหนดเสร็จ</label>
              <input type="date" value={tkDue} onChange={(e) => setTkDue(e.target.value)} className="mt-1 rounded-lg border border-ice px-2 py-1.5" />
            </div>
            <div>
              <label className="text-[11px] font-bold text-muted">โปรเจกต์</label>
              <select value={tkProject ?? ""} onChange={(e) => setTkProject(e.target.value ? Number(e.target.value) : null)}
                className="mt-1 rounded-lg border border-ice px-2 py-1.5 bg-white max-w-[160px]">
                <option value="">—</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.code}</option>)}
              </select>
            </div>
            <button onClick={addTicket} disabled={!tkSite.trim() || !tkIssue.trim()} className="btn btn-primary text-[12.5px] py-2 px-3.5 disabled:opacity-50">บันทึก ({nextTicketNo()})</button>
            <button onClick={() => setShowTicketForm(false)} className="btn btn-outline text-[12.5px] py-2 px-3">ยกเลิก</button>
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-[13px]">
            <thead>
              <tr className="bg-ice/70 text-navy">
                {["Ticket", "ไซต์งาน", "งาน", "ผู้รับผิดชอบ", "กำหนด", "สถานะ"].map((h) => (
                  <th key={h} className="text-left px-4 py-2.5 font-bold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tickets.map((t, i) => (
                <tr key={t.id} className={i % 2 ? "bg-ice/30" : ""}>
                  <td className="px-4 py-2.5 font-semibold text-sky whitespace-nowrap">{t.no}</td>
                  <td className="px-4 py-2.5 text-navy">{t.site}</td>
                  <td className="px-4 py-2.5 text-muted">{t.issue}</td>
                  <td className="px-4 py-2.5 text-muted whitespace-nowrap">{empName(t.assignee)}</td>
                  <td className="px-4 py-2.5 text-muted whitespace-nowrap">{fmtDate(t.due)}</td>
                  <td className="px-4 py-2.5">
                    {readOnly ? (
                      <span className={`text-[11px] font-bold rounded px-2 py-0.5 ${t.status === "ปิด" ? "bg-ice text-muted" : "bg-amber/15 text-amber"}`}>{t.status}</span>
                    ) : (
                      <select value={t.status} onChange={(e) => setTicketStatus(t, e.target.value)}
                        className={`text-[11.5px] font-bold rounded-lg border px-1.5 py-1 bg-white ${t.status === "ปิด" ? "border-ice text-muted" : "border-amber/40 text-amber"}`}>
                        {TICKET_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    )}
                  </td>
                </tr>
              ))}
              {tickets.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-6 text-center text-muted/70 text-[12.5px]">ยังไม่มี Ticket</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

export default function ProjectsPage() {
  return (
    <StaffShell title="โปรเจกต์">
      <ProjectsBody />
    </StaffShell>
  );
}
