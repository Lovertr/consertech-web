"use client";

// โมดูลสื่อสารลูกค้า — 2 ส่วน:
// 1) Client Portal ต่อโปรเจกต์: สร้างลิงก์ส่งให้ลูกค้า ลูกค้าดู Gantt/ความคืบหน้า + คุย/แจ้งปัญหา → แจ้งเตือนที่นี่ ตอบกลับได้
// 2) บทสนทนาต่อลูกค้า (จาก CRM) สำหรับบันทึกการคุยทั่วไป
// + AI ช่วยร่างคำตอบจริง

import { useCallback, useEffect, useRef, useState } from "react";
import StaffShell, { useDept } from "@/components/staff/StaffShell";
import { callCopilot } from "@/lib/copilot";
import { supabase } from "@/lib/supabase";

type DbCustomer = { id: number; name: string; contact_name: string | null; phone: string | null; email: string | null };
type DbProject = { id: number; code: string; name: string; customer: string | null; status: string; progress: number; portal_token: string | null };
type DbMsg = { id: number; customer_id: number | null; project_id: number | null; emp_id: string | null; from_client: boolean; kind: string; body: string; created_at: string };
type Thread = { type: "customer"; id: number } | { type: "project"; id: number };

const fmtDT = (iso: string) => new Date(iso).toLocaleString("th-TH", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

function ClientsBody() {
  const { access, empId } = useDept();
  const readOnly = access("clients") === "read";
  const [customers, setCustomers] = useState<DbCustomer[]>([]);
  const [projects, setProjects] = useState<DbProject[]>([]);
  const [empNames, setEmpNames] = useState<Record<string, string>>({});
  const [unread, setUnread] = useState<Record<number, { count: number; issue: boolean }>>({});
  const [thread, setThread] = useState<Thread | null>(null);
  const [messages, setMessages] = useState<DbMsg[]>([]);
  const [draft, setDraft] = useState("");
  const [asClient, setAsClient] = useState(false);
  const [drafting, setDrafting] = useState(false);
  const [copied, setCopied] = useState<number | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    if (!supabase) return;
    const [c, p, e, pm] = await Promise.all([
      supabase.from("customers").select("id,name,contact_name,phone,email").order("name"),
      supabase.from("projects").select("id,code,name,customer,status,progress,portal_token").order("code"),
      supabase.from("employees").select("id,name"),
      supabase.from("client_messages").select("project_id,from_client,kind,created_at").not("project_id", "is", null).order("created_at", { ascending: false }).limit(500),
    ]);
    setCustomers((c.data as DbCustomer[]) ?? []);
    const plist = (p.data as DbProject[]) ?? [];
    setProjects(plist);
    setEmpNames(Object.fromEntries(((e.data as { id: string; name: string }[]) ?? []).map((x) => [x.id, x.name])));
    // นับข้อความลูกค้าที่ใหม่กว่าการตอบล่าสุดของทีม (ต่อโปรเจกต์)
    const msgs = (pm.data as { project_id: number; from_client: boolean; kind: string; created_at: string }[]) ?? [];
    const lastStaff: Record<number, string> = {};
    for (const m of msgs) if (!m.from_client && !lastStaff[m.project_id]) lastStaff[m.project_id] = m.created_at;
    const u: Record<number, { count: number; issue: boolean }> = {};
    for (const m of msgs) {
      if (!m.from_client) continue;
      if (lastStaff[m.project_id] && m.created_at <= lastStaff[m.project_id]) continue;
      const cur = u[m.project_id] ?? { count: 0, issue: false };
      u[m.project_id] = { count: cur.count + 1, issue: cur.issue || m.kind === "issue" };
    }
    setUnread(u);
    setThread((prev) => prev ?? (plist[0] ? { type: "project", id: plist[0].id } : null));
  }, []);
  useEffect(() => { load(); }, [load]);

  const loadThread = useCallback(async () => {
    if (!supabase || !thread) { setMessages([]); return; }
    const q = supabase.from("client_messages").select("*").order("created_at", { ascending: true });
    const { data } = thread.type === "customer"
      ? await q.eq("customer_id", thread.id)
      : await q.eq("project_id", thread.id);
    setMessages((data as DbMsg[]) ?? []);
  }, [thread]);
  useEffect(() => { loadThread(); }, [loadThread]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages.length]);

  // เช็คข้อความใหม่จากลูกค้าทุก 30 วิ
  useEffect(() => {
    const iv = setInterval(() => { load(); loadThread(); }, 30000);
    return () => clearInterval(iv);
  }, [load, loadThread]);

  const selCustomer = thread?.type === "customer" ? customers.find((c) => c.id === thread.id) ?? null : null;
  const selProject = thread?.type === "project" ? projects.find((p) => p.id === thread.id) ?? null : null;

  const send = async () => {
    if (!supabase || !thread || !draft.trim()) return;
    await supabase.from("client_messages").insert({
      customer_id: thread.type === "customer" ? thread.id : null,
      project_id: thread.type === "project" ? thread.id : null,
      emp_id: asClient ? null : (empId || null),
      from_client: asClient, body: draft.trim(),
    });
    setDraft(""); setAsClient(false);
    loadThread(); load();
  };

  const aiDraft = async () => {
    setDrafting(true);
    try {
      const who = selProject ? `ลูกค้าโปรเจกต์ ${selProject.code} (${selProject.name})` : `ลูกค้า "${selCustomer?.name}"`;
      const lastMsgs = messages.slice(-6).map((t) => `${t.from_client ? "ลูกค้า" : "ทีมเรา"}: ${t.body}`).join("\n");
      const j = await callCopilot({
        action: "draft_email",
        payload: `บริบท: ทีม CONSERTECH ตอบ${who}\nบทสนทนาล่าสุด:\n${lastMsgs || "(ยังไม่มีบทสนทนา — ร่างข้อความทักทายอัปเดตความคืบหน้า)"}\n\nร่างคำตอบสั้นๆ สุภาพ เป็นภาษาไทย ตอบประเด็นล่าสุดของลูกค้า`,
      });
      setDraft(String(j.text ?? "").replace(/\n+/g, " ").trim());
    } catch (e) { setDraft("⚠ " + String(e)); }
    setDrafting(false);
  };

  // สร้าง/คัดลอกลิงก์พอร์ทัล
  const copyPortalLink = async (p: DbProject) => {
    if (!supabase) return;
    let token = p.portal_token;
    if (!token) {
      token = crypto.randomUUID().replace(/-/g, "");
      await supabase.from("projects").update({ portal_token: token }).eq("id", p.id);
      load();
    }
    const url = `${location.origin}/portal/${token}`;
    try { await navigator.clipboard.writeText(url); } catch { prompt("คัดลอกลิงก์นี้ส่งให้ลูกค้า:", url); }
    setCopied(p.id);
    setTimeout(() => setCopied(null), 2000);
  };

  if (!supabase) {
    return <p className="text-[13px] text-muted bg-ice/50 rounded-lg px-3 py-2 inline-block">⚠ ยังไม่ได้เชื่อมต่อฐานข้อมูล</p>;
  }

  const totalUnread = Object.values(unread).reduce((a, x) => a + x.count, 0);

  return (
    <>
      {readOnly && (
        <p className="mb-3 text-[12.5px] bg-ice text-sky font-semibold rounded-lg px-3 py-2 inline-block">
          👁️ ดูอย่างเดียว — ตอบลูกค้าได้เฉพาะฝ่ายขาย / PM
        </p>
      )}
      {totalUnread > 0 && (
        <p className="mb-3 text-[12.5px] bg-amber/15 text-amber font-bold rounded-lg px-3 py-2 inline-block">
          🔔 มีข้อความใหม่จากลูกค้า {totalUnread} ข้อความ{Object.values(unread).some((x) => x.issue) && " — มีการแจ้งปัญหา 🚨"}
        </p>
      )}

      <div className="grid gap-5 min-[1040px]:grid-cols-[340px_1fr] items-start">
        <div className="space-y-4 min-w-0">
          {/* Client Portal ต่อโปรเจกต์ */}
          <div className="card-white p-4">
            <p className="font-bold text-navy text-[14px]">🔗 Client Portal (ต่อโปรเจกต์)</p>
            <p className="text-[11px] text-muted/70 mt-0.5">ส่งลิงก์ให้ลูกค้าติดตาม Gantt/ความคืบหน้า และคุย/แจ้งปัญหาได้เอง</p>
            <div className="mt-3 space-y-2">
              {projects.map((p) => {
                const u = unread[p.id];
                return (
                  <div key={p.id}
                    className={`rounded-xl border p-3 transition text-[12.5px] cursor-pointer ${thread?.type === "project" && thread.id === p.id ? "border-brand bg-ice/40" : "border-ice hover:border-brand"}`}
                    onClick={() => setThread({ type: "project", id: p.id })}>
                    <div className="flex justify-between items-start gap-2">
                      <p className="font-bold text-navy leading-snug">{p.code} — {p.name}</p>
                      {u && u.count > 0 && (
                        <span className={`text-[10.5px] font-bold rounded-full px-1.5 py-0.5 shrink-0 ${u.issue ? "bg-[#D94141] text-white" : "bg-amber text-navy"}`}>
                          {u.issue ? "🚨 " : ""}{u.count}
                        </span>
                      )}
                    </div>
                    <p className="text-muted mt-0.5">{p.customer ?? "-"} · {p.progress}%</p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      <button onClick={(e) => { e.stopPropagation(); copyPortalLink(p); }}
                        className="text-[10.5px] font-bold bg-brand/10 text-brand rounded px-1.5 py-0.5 hover:bg-brand/20">
                        {copied === p.id ? "✅ คัดลอกแล้ว" : p.portal_token ? "📋 คัดลอกลิงก์" : "🔗 สร้างลิงก์ + คัดลอก"}
                      </button>
                      {p.portal_token && (
                        <a href={`/portal/${p.portal_token}`} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}
                          className="text-[10.5px] font-bold bg-ice text-sky rounded px-1.5 py-0.5 hover:bg-sky/20">👁 เปิดดูแบบลูกค้า</a>
                      )}
                    </div>
                  </div>
                );
              })}
              {projects.length === 0 && <p className="text-[12.5px] text-muted/70">ยังไม่มีโปรเจกต์ — สร้างได้ที่โมดูลโปรเจกต์</p>}
            </div>
          </div>

          {/* ลูกค้าจาก CRM */}
          <div className="card-white p-4">
            <p className="font-bold text-navy text-[14px]">ลูกค้าทั้งหมด <span className="text-sky text-[12px]">({customers.length})</span></p>
            <p className="text-[11px] text-muted/70 mt-0.5">บันทึกการคุยทั่วไป (โทร/Line/อีเมล) — ซิงก์จาก CRM</p>
            <div className="mt-3 space-y-2 max-h-[300px] overflow-y-auto pr-1">
              {customers.map((c) => (
                <button key={c.id} onClick={() => setThread({ type: "customer", id: c.id })}
                  className={`w-full text-left rounded-xl border p-2.5 transition text-[12.5px] ${thread?.type === "customer" && thread.id === c.id ? "border-brand bg-ice/40" : "border-ice hover:border-brand"}`}>
                  <p className="font-bold text-navy leading-snug">{c.name}</p>
                  <p className="text-[11px] text-muted/70 mt-0.5">{c.contact_name ?? "ยังไม่มีผู้ติดต่อ"}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* บทสนทนา */}
        <div className="card-white p-5 min-w-0">
          {thread ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ice pb-3">
                <div>
                  <p className="font-bold text-navy">
                    {selProject ? `${selProject.code} — ${selProject.name}` : `${selCustomer?.name}${selCustomer?.contact_name ? ` — ${selCustomer.contact_name}` : ""}`}
                  </p>
                  <p className="text-[12px] text-muted">
                    {selProject
                      ? `${selProject.customer ?? "-"} · แชทนี้ลูกค้าเห็นใน Client Portal ด้วย`
                      : [selCustomer?.phone, selCustomer?.email].filter(Boolean).join(" · ") || "ยังไม่มีข้อมูลติดต่อ (เพิ่มได้ใน CRM)"}
                  </p>
                </div>
                {selProject?.portal_token && (
                  <a href={`/portal/${selProject.portal_token}`} target="_blank" rel="noreferrer"
                    className="text-[11.5px] font-bold bg-ice text-brand rounded-lg px-2.5 py-1.5 hover:bg-sky/20">เปิดหน้าพอร์ทัล ↗</a>
                )}
              </div>

              <div className="mt-4 space-y-3 max-h-[400px] overflow-y-auto pr-1">
                {messages.map((m) => (
                  <div key={m.id} className={`max-w-[85%] ${!m.from_client ? "ml-auto" : ""}`}>
                    <p className={`text-[11px] mb-1 ${!m.from_client ? "text-right text-sky" : "text-muted"}`}>
                      {m.from_client ? "ลูกค้า" : (m.emp_id ? empNames[m.emp_id] ?? m.emp_id : "ทีมเรา")} · {fmtDT(m.created_at)}
                      {m.kind === "issue" && <span className="ml-1 text-[10px] font-bold bg-[#D94141]/10 text-[#D94141] rounded px-1 py-0.5">🚨 แจ้งปัญหา</span>}
                    </p>
                    <div className={`rounded-2xl px-4 py-2.5 text-[13.5px] leading-relaxed whitespace-pre-wrap ${
                      !m.from_client ? "bg-brand text-white rounded-tr-sm" : m.kind === "issue" ? "bg-[#D94141]/10 text-ink rounded-tl-sm border border-[#D94141]/30" : "bg-ice text-ink rounded-tl-sm"
                    }`}>
                      {m.body}
                    </div>
                  </div>
                ))}
                {messages.length === 0 && (
                  <p className="text-[13px] text-muted/70 text-center py-10">ยังไม่มีบทสนทนา — เริ่มพิมพ์ด้านล่างได้เลย</p>
                )}
                <div ref={bottomRef} />
              </div>

              {!readOnly && (
                <div className="mt-4 border-t border-ice pt-3">
                  <div className="flex gap-2">
                    <input value={draft} onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") send(); }}
                      placeholder={asClient ? "บันทึกข้อความที่ลูกค้าส่งมา (โทร/Line/อีเมล)..." : selProject ? "ตอบลูกค้า (ลูกค้าเห็นทันทีในพอร์ทัล)..." : "พิมพ์ข้อความถึงลูกค้า..."}
                      className={`flex-1 min-w-0 rounded-xl border px-4 py-2.5 text-[13.5px] ${asClient ? "border-amber/60 bg-amber/5" : "border-ice"}`} />
                    <button onClick={send} disabled={!draft.trim()} className="btn btn-primary text-[13px] py-2 px-4 shrink-0 disabled:opacity-50">ส่ง</button>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <button onClick={aiDraft} disabled={drafting}
                      className="text-[11.5px] font-semibold bg-amber/15 text-amber rounded-lg px-2.5 py-1 disabled:opacity-60">
                      {drafting ? "⏳ AI กำลังร่าง..." : "✨ ให้ AI ร่างคำตอบ"} <span className="text-[9px] font-bold bg-brand/10 text-brand rounded px-1 py-0.5 align-middle">AI จริง</span>
                    </button>
                    <button onClick={() => setAsClient((v) => !v)}
                      className={`text-[11.5px] font-semibold rounded-lg px-2.5 py-1 transition ${asClient ? "bg-amber text-navy" : "bg-ice text-sky hover:text-brand"}`}>
                      {asClient ? "✓ กำลังบันทึกฝั่งลูกค้า" : "บันทึกข้อความจากลูกค้า"}
                    </button>
                  </div>
                </div>
              )}

              <p className="mt-4 text-[11.5px] text-muted/70 italic">
                {selProject
                  ? "ลูกค้าเข้าผ่านลิงก์เฉพาะโปรเจกต์ (ไม่ต้องสมัครสมาชิก) เห็น Gantt/ความคืบหน้า/Milestone และคุยกับทีมได้ — ข้อความใหม่จากลูกค้าจะขึ้นแจ้งเตือนที่หน้านี้"
                  : "ประวัติการคุยเก็บรวมที่เดียวต่อลูกค้า — ข้อความจากลูกค้า (โทร/Line/อีเมล) กดปุ่มบันทึกฝั่งลูกค้าเพื่อเก็บเข้าประวัติ"}
              </p>
            </>
          ) : (
            <p className="text-[13px] text-muted/70 text-center py-16">เลือกโปรเจกต์หรือลูกค้าจากรายชื่อด้านซ้าย</p>
          )}
        </div>
      </div>
    </>
  );
}

export default function ClientsPage() {
  return (
    <StaffShell title="สื่อสารลูกค้า">
      <ClientsBody />
    </StaffShell>
  );
}
