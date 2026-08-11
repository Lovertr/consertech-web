"use client";

// โมดูลสื่อสารลูกค้า — บทสนทนาจริงต่อลูกค้าแต่ละราย (บันทึกลงฐานข้อมูล)
// ส่งข้อความในนามทีม + บันทึกข้อความฝั่งลูกค้า + AI ช่วยร่างคำตอบจริง

import { useCallback, useEffect, useRef, useState } from "react";
import StaffShell, { useDept } from "@/components/staff/StaffShell";
import { callCopilot } from "@/lib/copilot";
import { supabase } from "@/lib/supabase";

type DbCustomer = { id: number; name: string; contact_name: string | null; phone: string | null; email: string | null };
type DbMsg = { id: number; customer_id: number; emp_id: string | null; from_client: boolean; body: string; created_at: string };

const fmtDT = (iso: string) => new Date(iso).toLocaleString("th-TH", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

function ClientsBody() {
  const { access, empId } = useDept();
  const readOnly = access("clients") === "read";
  const [customers, setCustomers] = useState<DbCustomer[]>([]);
  const [empNames, setEmpNames] = useState<Record<string, string>>({});
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [messages, setMessages] = useState<DbMsg[]>([]);
  const [lastMsgMap, setLastMsgMap] = useState<Record<number, string>>({});
  const [draft, setDraft] = useState("");
  const [asClient, setAsClient] = useState(false);
  const [drafting, setDrafting] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    if (!supabase) return;
    const [c, e, lm] = await Promise.all([
      supabase.from("customers").select("id,name,contact_name,phone,email").order("name"),
      supabase.from("employees").select("id,name"),
      supabase.from("client_messages").select("customer_id,created_at").order("created_at", { ascending: false }).limit(200),
    ]);
    const list = (c.data as DbCustomer[]) ?? [];
    setCustomers(list);
    setEmpNames(Object.fromEntries(((e.data as { id: string; name: string }[]) ?? []).map((x) => [x.id, x.name])));
    const map: Record<number, string> = {};
    for (const m of (lm.data as { customer_id: number; created_at: string }[]) ?? []) {
      if (!map[m.customer_id]) map[m.customer_id] = m.created_at;
    }
    setLastMsgMap(map);
    setSelectedId((prev) => (prev !== null && list.some((x) => x.id === prev) ? prev : list[0]?.id ?? null));
  }, []);
  useEffect(() => { load(); }, [load]);

  const loadThread = useCallback(async () => {
    if (!supabase || selectedId === null) { setMessages([]); return; }
    const { data } = await supabase.from("client_messages").select("*").eq("customer_id", selectedId).order("created_at", { ascending: true });
    setMessages((data as DbMsg[]) ?? []);
  }, [selectedId]);
  useEffect(() => { loadThread(); }, [loadThread]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages.length]);

  const selected = customers.find((c) => c.id === selectedId) ?? null;

  const send = async () => {
    if (!supabase || !selected || !draft.trim()) return;
    await supabase.from("client_messages").insert({
      customer_id: selected.id, emp_id: asClient ? null : (empId || null), from_client: asClient, body: draft.trim(),
    });
    setDraft(""); setAsClient(false);
    loadThread(); load();
  };

  const aiDraft = async () => {
    if (!selected) return;
    setDrafting(true);
    try {
      const lastMsgs = messages.slice(-6).map((t) => `${t.from_client ? "ลูกค้า" : "ทีมเรา"}: ${t.body}`).join("\n");
      const j = await callCopilot({
        action: "draft_email",
        payload: `บริบท: ทีม CONSERTECH ตอบลูกค้า "${selected.name}" (ผู้ติดต่อ: ${selected.contact_name ?? "-"})\nบทสนทนาล่าสุด:\n${lastMsgs || "(ยังไม่มีบทสนทนา — ร่างข้อความทักทายแนะนำติดตามงาน)"}\n\nร่างคำตอบสั้นๆ สุภาพ เป็นภาษาไทย ตอบประเด็นล่าสุดของลูกค้า`,
      });
      setDraft(String(j.text ?? "").replace(/\n+/g, " ").trim());
    } catch (e) { setDraft("⚠ " + String(e)); }
    setDrafting(false);
  };

  if (!supabase) {
    return <p className="text-[13px] text-muted bg-ice/50 rounded-lg px-3 py-2 inline-block">⚠ ยังไม่ได้เชื่อมต่อฐานข้อมูล</p>;
  }

  return (
    <>
      {readOnly && (
        <p className="mb-3 text-[12.5px] bg-ice text-sky font-semibold rounded-lg px-3 py-2 inline-block">
          👁️ ดูอย่างเดียว — ตอบลูกค้าได้เฉพาะฝ่ายขาย / PM
        </p>
      )}

      <div className="grid gap-5 min-[1040px]:grid-cols-[340px_1fr] items-start">
        {/* รายชื่อลูกค้า (จาก CRM) */}
        <div className="card-white p-4 min-w-0">
          <p className="font-bold text-navy text-[14px]">ลูกค้าทั้งหมด <span className="text-sky text-[12px]">({customers.length})</span></p>
          <p className="text-[11px] text-muted/70 mt-0.5">รายชื่อซิงก์จากโมดูล CRM อัตโนมัติ</p>
          <div className="mt-3 space-y-2 max-h-[560px] overflow-y-auto pr-1">
            {customers.map((c) => (
              <button key={c.id} onClick={() => setSelectedId(c.id)}
                className={`w-full text-left rounded-xl border p-3 transition text-[12.5px] ${selectedId === c.id ? "border-brand bg-ice/40" : "border-ice hover:border-brand"}`}>
                <p className="font-bold text-navy leading-snug">{c.name}</p>
                <p className="text-[11px] text-muted/70 mt-1">
                  {c.contact_name ?? "ยังไม่มีผู้ติดต่อ"}
                  {lastMsgMap[c.id] && ` · คุยล่าสุด ${fmtDT(lastMsgMap[c.id])}`}
                </p>
              </button>
            ))}
            {customers.length === 0 && <p className="text-[12.5px] text-muted/70">ยังไม่มีลูกค้า — เพิ่มได้ที่โมดูล CRM</p>}
          </div>
        </div>

        {/* บทสนทนา */}
        <div className="card-white p-5 min-w-0">
          {selected ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ice pb-3">
                <div>
                  <p className="font-bold text-navy">{selected.name}{selected.contact_name && ` — ${selected.contact_name}`}</p>
                  <p className="text-[12px] text-muted">
                    {[selected.phone, selected.email].filter(Boolean).join(" · ") || "ยังไม่มีข้อมูลติดต่อ (เพิ่มได้ใน CRM)"}
                  </p>
                </div>
              </div>

              <div className="mt-4 space-y-3 max-h-[420px] overflow-y-auto pr-1">
                {messages.map((m) => (
                  <div key={m.id} className={`max-w-[85%] ${!m.from_client ? "ml-auto" : ""}`}>
                    <p className={`text-[11px] mb-1 ${!m.from_client ? "text-right text-sky" : "text-muted"}`}>
                      {m.from_client ? (selected.contact_name ?? "ลูกค้า") : (m.emp_id ? empNames[m.emp_id] ?? m.emp_id : "ทีมเรา")} · {fmtDT(m.created_at)}
                    </p>
                    <div className={`rounded-2xl px-4 py-2.5 text-[13.5px] leading-relaxed whitespace-pre-wrap ${
                      !m.from_client ? "bg-brand text-white rounded-tr-sm" : "bg-ice text-ink rounded-tl-sm"
                    }`}>
                      {m.body}
                    </div>
                  </div>
                ))}
                {messages.length === 0 && (
                  <p className="text-[13px] text-muted/70 text-center py-10">ยังไม่มีบทสนทนากับลูกค้ารายนี้ — เริ่มพิมพ์ด้านล่างได้เลย</p>
                )}
                <div ref={bottomRef} />
              </div>

              {!readOnly && (
                <div className="mt-4 border-t border-ice pt-3">
                  <div className="flex gap-2">
                    <input value={draft} onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") send(); }}
                      placeholder={asClient ? "บันทึกข้อความที่ลูกค้าส่งมา (โทร/Line/อีเมล)..." : "พิมพ์ข้อความถึงลูกค้า..."}
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
                ประวัติการคุยเก็บรวมที่เดียวต่อลูกค้า — ข้อความจากลูกค้า (โทร/Line/อีเมล) กด &ldquo;บันทึกข้อความจากลูกค้า&rdquo; เพื่อเก็บเข้าประวัติ
                · เฟสถัดไป: ลิงก์ Client Portal ให้ลูกค้าเข้าดูสถานะงานเอง
              </p>
            </>
          ) : (
            <p className="text-[13px] text-muted/70 text-center py-16">เลือกลูกค้าจากรายชื่อด้านซ้าย</p>
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
