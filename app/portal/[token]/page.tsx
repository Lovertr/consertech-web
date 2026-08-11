"use client";

// Client Portal — หน้าสาธารณะสำหรับลูกค้า (เข้าผ่านลิงก์เฉพาะโปรเจกต์ ไม่ต้องล็อกอิน)
// ดูความคืบหน้า + Gantt + Milestone + Ticket และคุย/แจ้งปัญหากับทีม CONSERTECH ได้จริง

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

type DbProject = { id: number; code: string; name: string; customer: string | null; status: string; progress: number };
type DbMilestone = { id: number; name: string; pct: number; done: boolean; sort: number; date_from: string | null; date_to: string | null };
type DbAcceptance = { id: number; item: string; done: boolean; sort: number };
type DbTicket = { id: number; no: string; site: string; issue: string; due: string | null; status: string };
type DbMsg = { id: number; emp_id: string | null; from_client: boolean; kind: string; body: string; created_at: string };

const fmtD = (iso: string | null) => iso ? new Date(iso + "T00:00:00").toLocaleDateString("th-TH", { day: "numeric", month: "short" }) : "";
const fmtDT = (iso: string) => new Date(iso).toLocaleString("th-TH", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

const statusChip = (s: string) =>
  s === "ติดตั้ง" ? "bg-amber/15 text-amber"
  : s === "ทดสอบ" ? "bg-ice text-brand"
  : s === "ส่งมอบแล้ว" ? "bg-[#2E9E5B]/15 text-[#2E9E5B]"
  : "bg-ice text-muted";

// Gantt จากช่วงวันที่ของ Milestone จริง
function PortalGantt({ milestones }: { milestones: DbMilestone[] }) {
  const dated = milestones.filter((m) => m.date_from && m.date_to);
  if (dated.length === 0) return null;
  const min = Math.min(...dated.map((m) => new Date(m.date_from!).getTime()));
  const max = Math.max(...dated.map((m) => new Date(m.date_to!).getTime()));
  const span = Math.max(1, max - min);
  const today = Date.now();
  const todayPct = today >= min && today <= max ? ((today - min) / span) * 100 : null;

  return (
    <div className="card-white p-5 overflow-x-auto">
      <p className="font-bold text-navy mb-1">แผนงานโปรเจกต์ (Gantt)</p>
      <p className="text-[11.5px] text-muted mb-3">{fmtD(new Date(min).toISOString().slice(0, 10))} – {fmtD(new Date(max).toISOString().slice(0, 10))}</p>
      <div className="min-w-[520px] space-y-2">
        {dated.map((m) => {
          const s = ((new Date(m.date_from!).getTime() - min) / span) * 100;
          const w = Math.max(3, ((new Date(m.date_to!).getTime() - new Date(m.date_from!).getTime()) / span) * 100);
          return (
            <div key={m.id} className="flex items-center gap-3 text-[12px]">
              <div className="w-[190px] shrink-0">
                <p className={`font-semibold leading-tight truncate ${m.done ? "text-navy" : "text-muted"}`}>{m.done ? "✓ " : ""}{m.name}</p>
                <p className="text-[10.5px] text-muted/70">{fmtD(m.date_from)} – {fmtD(m.date_to)}</p>
              </div>
              <div className="relative flex-1 h-6 rounded bg-ice/40">
                {todayPct !== null && <span className="absolute top-0 bottom-0 border-l-2 border-amber z-10" style={{ left: `${todayPct}%` }} />}
                <div className={`absolute top-0.5 bottom-0.5 rounded ${m.done ? "bg-sky/70" : "bg-brand"}`} style={{ left: `${s}%`, width: `${w}%` }}>
                  <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white">{m.pct}%</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-[11px] text-muted/70">
        <span className="inline-block w-2.5 h-2.5 bg-sky/70 rounded-sm mr-1" />เสร็จแล้ว
        <span className="inline-block w-2.5 h-2.5 bg-brand rounded-sm ml-3 mr-1" />กำลังดำเนินการ
        <span className="inline-block border-l-2 border-amber h-3 ml-3 mr-1 align-middle" />วันนี้
      </p>
    </div>
  );
}

export default function PortalPage() {
  const params = useParams<{ token: string }>();
  const token = params?.token;
  const [state, setState] = useState<"loading" | "ok" | "notfound">("loading");
  const [project, setProject] = useState<DbProject | null>(null);
  const [milestones, setMilestones] = useState<DbMilestone[]>([]);
  const [acceptance, setAcceptance] = useState<DbAcceptance[]>([]);
  const [tickets, setTickets] = useState<DbTicket[]>([]);
  const [messages, setMessages] = useState<DbMsg[]>([]);
  const [body, setBody] = useState("");
  const [isIssue, setIsIssue] = useState(false);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadThread = useCallback(async (projectId: number) => {
    if (!supabase) return;
    const { data } = await supabase.from("client_messages").select("id,emp_id,from_client,kind,body,created_at")
      .eq("project_id", projectId).order("created_at", { ascending: true });
    setMessages((data as DbMsg[]) ?? []);
  }, []);

  useEffect(() => {
    (async () => {
      if (!supabase || !token) { setState("notfound"); return; }
      const { data: p } = await supabase.from("projects").select("id,code,name,customer,status,progress").eq("portal_token", token).maybeSingle();
      if (!p) { setState("notfound"); return; }
      const proj = p as DbProject;
      setProject(proj);
      const [m, a, t] = await Promise.all([
        supabase.from("project_milestones").select("id,name,pct,done,sort,date_from,date_to").eq("project_id", proj.id).order("sort"),
        supabase.from("project_acceptance").select("id,item,done,sort").eq("project_id", proj.id).order("sort"),
        supabase.from("project_tickets").select("id,no,site,issue,due,status").eq("project_id", proj.id).order("no", { ascending: false }),
      ]);
      setMilestones((m.data as DbMilestone[]) ?? []);
      setAcceptance((a.data as DbAcceptance[]) ?? []);
      setTickets((t.data as DbTicket[]) ?? []);
      await loadThread(proj.id);
      setState("ok");
    })();
  }, [token, loadThread]);

  // เช็คข้อความใหม่ทุก 30 วินาที
  useEffect(() => {
    if (!project) return;
    const iv = setInterval(() => loadThread(project.id), 30000);
    return () => clearInterval(iv);
  }, [project, loadThread]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages.length]);

  const send = async () => {
    if (!supabase || !project || !body.trim()) return;
    setSending(true);
    await supabase.from("client_messages").insert({
      project_id: project.id, from_client: true, kind: isIssue ? "issue" : "message", body: body.trim(),
    });
    setBody(""); setIsIssue(false); setSending(false);
    loadThread(project.id);
  };

  if (state === "loading") {
    return <div className="min-h-screen flex items-center justify-center text-muted text-[14px]">⏳ กำลังโหลด...</div>;
  }
  if (state === "notfound" || !project) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-center px-6">
        <p className="text-4xl">🔒</p>
        <p className="mt-3 font-bold text-navy text-[16px]">ไม่พบลิงก์นี้ หรือลิงก์ถูกยกเลิกแล้ว</p>
        <p className="mt-1 text-[13px] text-muted">กรุณาติดต่อทีม CONSERTECH เพื่อขอลิงก์ใหม่</p>
      </div>
    );
  }

  const doneMs = milestones.filter((m) => m.done).length;

  return (
    <div className="min-h-screen bg-[#F4F8FB]">
      {/* หัวเว็บ */}
      <div className="bg-white border-b border-ice">
        <div className="max-w-[960px] mx-auto px-5 py-4 flex items-center justify-between gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-consertech.png" alt="CONSERTECH" className="h-9" />
          <p className="text-[11.5px] text-muted text-right">Client Portal — ติดตามความคืบหน้าโปรเจกต์ของท่าน</p>
        </div>
      </div>

      <div className="max-w-[960px] mx-auto px-5 py-6 space-y-5">
        {/* ภาพรวมโปรเจกต์ */}
        <div className="card-white p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold text-sky">{project.code}{project.customer && ` · ${project.customer}`}</p>
              <h1 className="text-[20px] font-bold text-navy leading-snug">{project.name}</h1>
            </div>
            <span className={`text-[12px] font-bold rounded-lg px-2.5 py-1.5 ${statusChip(project.status)}`}>สถานะ: {project.status}</span>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <div className="flex-1 h-3 rounded-full bg-ice overflow-hidden">
              <div className="h-full bg-brand rounded-full transition-all" style={{ width: `${project.progress}%` }} />
            </div>
            <span className="text-[16px] font-bold text-brand">{project.progress}%</span>
          </div>
          <p className="mt-1.5 text-[12px] text-muted">Milestone สำเร็จแล้ว {doneMs}/{milestones.length} รายการ</p>
        </div>

        <PortalGantt milestones={milestones} />

        <div className="grid gap-5 min-[760px]:grid-cols-2 items-start">
          {/* Milestones */}
          <div className="card-white p-5">
            <p className="font-bold text-navy">ความคืบหน้าตามงวดงาน</p>
            <div className="mt-3 space-y-2">
              {milestones.map((m, i) => (
                <div key={m.id} className={`flex items-center gap-3 rounded-lg border p-2.5 text-[12.5px] ${m.done ? "border-ice bg-ice/40" : "border-dashed border-ice"}`}>
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[11.5px] font-bold shrink-0 ${m.done ? "bg-brand text-white" : "bg-ice text-muted"}`}>
                    {m.done ? "✓" : i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className={`font-semibold leading-snug ${m.done ? "text-navy" : "text-muted"}`}>{m.name}</p>
                    {m.date_from && <p className="text-[10.5px] text-muted/70">{fmtD(m.date_from)} – {fmtD(m.date_to)}</p>}
                  </div>
                </div>
              ))}
              {milestones.length === 0 && <p className="text-[12.5px] text-muted/70">อยู่ระหว่างจัดทำแผนงาน</p>}
            </div>

            {acceptance.length > 0 && (
              <>
                <p className="font-bold text-navy mt-5">Acceptance Test</p>
                <div className="mt-2 space-y-1">
                  {acceptance.map((a) => (
                    <p key={a.id} className={`text-[12.5px] flex gap-2 ${a.done ? "text-ink" : "text-muted"}`}>
                      <span>{a.done ? "✅" : "◻️"}</span>{a.item}
                    </p>
                  ))}
                </div>
              </>
            )}

            {tickets.length > 0 && (
              <>
                <p className="font-bold text-navy mt-5">งานบริการ / ซ่อมบำรุง</p>
                <div className="mt-2 space-y-1.5">
                  {tickets.map((t) => (
                    <div key={t.id} className="rounded-lg border border-ice p-2.5 text-[12px] flex justify-between gap-2">
                      <span className="text-ink">{t.issue}</span>
                      <span className={`font-bold shrink-0 ${t.status === "ปิด" ? "text-muted" : "text-amber"}`}>{t.status === "ปิด" ? "✓ เสร็จสิ้น" : t.status}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* แชท / แจ้งปัญหา */}
          <div className="card-white p-5">
            <p className="font-bold text-navy">💬 คุยกับทีมงาน / แจ้งปัญหา</p>
            <p className="text-[11.5px] text-muted mt-0.5">ข้อความถึงทีม CONSERTECH โดยตรง — ทีมจะได้รับแจ้งเตือนและตอบกลับที่นี่</p>
            <div className="mt-3 space-y-2.5 max-h-[340px] overflow-y-auto pr-1">
              {messages.map((m) => (
                <div key={m.id} className={`max-w-[88%] ${m.from_client ? "ml-auto" : ""}`}>
                  <p className={`text-[10.5px] mb-0.5 ${m.from_client ? "text-right text-sky" : "text-muted"}`}>
                    {m.from_client ? "ท่าน" : "ทีม CONSERTECH"} · {fmtDT(m.created_at)}
                    {m.kind === "issue" && <span className="ml-1 text-[9.5px] font-bold bg-[#D94141]/10 text-[#D94141] rounded px-1 py-0.5">แจ้งปัญหา</span>}
                  </p>
                  <div className={`rounded-2xl px-3.5 py-2 text-[13px] leading-relaxed whitespace-pre-wrap ${
                    m.from_client ? "bg-brand text-white rounded-tr-sm" : "bg-ice text-ink rounded-tl-sm"
                  }`}>
                    {m.body}
                  </div>
                </div>
              ))}
              {messages.length === 0 && <p className="text-[12.5px] text-muted/70 text-center py-8">ยังไม่มีข้อความ — พิมพ์ทักทายทีมงานได้เลย</p>}
              <div ref={bottomRef} />
            </div>
            <div className="mt-3">
              <div className="flex gap-2">
                <input value={body} onChange={(e) => setBody(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") send(); }}
                  placeholder={isIssue ? "อธิบายปัญหาที่พบ..." : "พิมพ์ข้อความถึงทีมงาน..."}
                  className={`flex-1 min-w-0 rounded-xl border px-3.5 py-2.5 text-[13px] ${isIssue ? "border-[#D94141]/50 bg-[#D94141]/5" : "border-ice"}`} />
                <button onClick={send} disabled={sending || !body.trim()} className="btn btn-primary text-[13px] py-2 px-4 shrink-0 disabled:opacity-50">ส่ง</button>
              </div>
              <label className="mt-2 flex items-center gap-2 text-[12px] text-muted cursor-pointer w-fit">
                <input type="checkbox" checked={isIssue} onChange={(e) => setIsIssue(e.target.checked)} className="accent-[#D94141]" />
                🚨 เป็นการแจ้งปัญหาการใช้งาน (ทีมจะเห็นเป็นเรื่องด่วน)
              </label>
            </div>
          </div>
        </div>

        <p className="text-center text-[11px] text-muted/70 pb-6">
          CONSERTECH CO., LTD. · โทร 062-363-5395 · sale01@cs-th.com
        </p>
      </div>
    </div>
  );
}
