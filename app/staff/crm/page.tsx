"use client";

// โมดูล CRM — ข้อมูลจริงจากฐานข้อมูล (Supabase)
// Pipeline ดีล + กิจกรรม + คอมเมนต์ + AI Lead Score + AI สรุปดีล + สแกนนามบัตร

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import StaffShell, { useDept } from "@/components/staff/StaffShell";
import { dealStages } from "@/lib/staffData";
import { supabase } from "@/lib/supabase";
import { callCopilot } from "@/lib/copilot";

// ── Types (ตรงกับตารางใน Supabase) ──
type DbDeal = {
  id: number;
  customer_id: number | null;
  customer_name: string;
  industry: string | null;
  solution: string | null;
  stage: string;
  value_level: string;
  owner: string | null;
  next_action: string | null;
  lead_score: number | null;
  lead_score_reason: string | null;
  created_at: string;
};
type DbActivity = { id: number; deal_id: number; emp_id: string | null; type: string; note: string; created_at: string };
type DbComment = { id: number; deal_id: number; emp_id: string; body: string; created_at: string };
type DbCustomer = { id: number; name: string; industry: string | null };

const STAGES: { key: string; label: string }[] = [...dealStages, { key: "lost", label: "แพ้ดีล" }];
const ACT_TYPES = ["โทร", "Email", "Line", "ประชุม", "Survey", "เอกสาร", "Lead", "อื่นๆ"];

const dealCode = (id: number) => `D-${String(id).padStart(3, "0")}`;
const fmtD = (iso: string) => new Date(iso).toLocaleDateString("th-TH", { day: "numeric", month: "short" });
const fmtDT = (iso: string) =>
  new Date(iso).toLocaleString("th-TH", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

function parseJsonLoose(raw: string): Record<string, unknown> | null {
  let s = raw.trim();
  if (s.startsWith("```")) s = s.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
  const m = s.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try { return JSON.parse(m[0]); } catch { return null; }
}

// ── AI สรุปดีล (เรียก edge function จริง) ──
function AiSummary({ deal, acts }: { deal: DbDeal; acts: DbActivity[] }) {
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [text, setText] = useState("");

  const run = async () => {
    setState("loading");
    try {
      const j = await callCopilot({
        action: "summarize_deal",
        payload: [
          `บริษัทเรา: CONSERTECH ผู้ขายระบบ AGV และอุปกรณ์อัตโนมัติในโรงงาน`,
          `ลูกค้า: ${deal.customer_name} (${deal.industry ?? "-"})`,
          `โซลูชันที่สนใจ: ${deal.solution ?? "-"}`,
          `ขั้นดีล: ${STAGES.find((s) => s.key === deal.stage)?.label ?? deal.stage} | มูลค่าระดับ: ${deal.value_level}`,
          `งานถัดไปที่วางไว้: ${deal.next_action ?? "-"}`,
          `ประวัติกิจกรรม:`,
          ...acts.map((a) => `- ${fmtD(a.created_at)} ${a.type}: ${a.note}`),
        ].join("\n"),
      });
      setText(String(j.text ?? ""));
      setState("done");
    } catch (e) {
      setText(String(e));
      setState("error");
    }
  };

  return (
    <div className="mt-4 rounded-xl border border-amber/50 bg-amber/5 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[13px] font-bold text-navy">✨ AI ผู้ช่วยฝ่ายขาย <span className="text-[10px] font-bold bg-brand/10 text-brand rounded px-1.5 py-0.5 align-middle">AI จริง</span></p>
        <button onClick={run} disabled={state === "loading"} className="btn btn-amber text-[12.5px] py-1.5 px-3 disabled:opacity-60">
          {state === "loading" ? "⏳ AI กำลังวิเคราะห์..." : "สรุปดีลนี้ให้หน่อย"}
        </button>
      </div>
      {state === "done" && <div className="mt-3 text-[13px] leading-relaxed text-ink whitespace-pre-wrap">{text}</div>}
      {state === "error" && <p className="mt-3 text-[12.5px] text-[#D94141] bg-[#D94141]/10 rounded-lg px-3 py-2">⚠ {text}</p>}
    </div>
  );
}

// ── สแกนนามบัตรด้วย AI → เพิ่มเป็น Lead จริงในฐานข้อมูล ──
function BizCardScan({ onAddLead }: { onAddLead: (f: Record<string, string | null>) => Promise<void> }) {
  const [state, setState] = useState<"idle" | "scanning" | "done" | "adding" | "added" | "error">("idle");
  const [fields, setFields] = useState<Record<string, string | null>>({});
  const [err, setErr] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const scan = (file: File) => {
    const reader = new FileReader();
    reader.onload = async () => {
      setState("scanning");
      try {
        const dataUrl = String(reader.result);
        const m = dataUrl.match(/^data:(image\/\w+);base64,/);
        const j = await callCopilot({
          action: "ocr_card",
          image: m ? dataUrl.slice(m[0].length) : dataUrl,
          mime: m ? m[1] : "image/jpeg",
        });
        let raw = String(j.text ?? "").trim();
        if (raw.startsWith("```")) raw = raw.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
        const jm = raw.match(/\{[\s\S]*\}/);
        const f = jm ? JSON.parse(jm[0]) : {};
        setFields({ ...f, company_name: f.company ?? f.company_name ?? null });
        setState("done");
      } catch (e) {
        setErr(String(e));
        setState("error");
      }
    };
    reader.readAsDataURL(file);
  };

  const addLead = async () => {
    setState("adding");
    try {
      await onAddLead(fields);
      setState("added");
    } catch (e) {
      setErr(String(e));
      setState("error");
    }
  };

  return (
    <div className="mb-4 rounded-xl border border-dashed border-sky/60 bg-ice/30 p-3.5">
      <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) scan(f); e.target.value = ""; }} />
      <div className="flex flex-wrap items-center gap-3">
        <button onClick={() => fileRef.current?.click()} disabled={state === "scanning" || state === "adding"}
          className="btn btn-outline text-[13px] py-2 px-3.5 disabled:opacity-60">
          {state === "scanning" ? "✨ AI กำลังอ่านนามบัตร..." : "📇 สแกนนามบัตร (ถ่ายรูป/อัปโหลด)"}
        </button>
        <p className="text-[12px] text-muted">ถ่ายรูปนามบัตรแล้ว AI อ่านข้อมูลกรอกให้จริง <span className="text-[10px] font-bold bg-brand/10 text-brand rounded px-1.5 py-0.5">AI จริง</span></p>
      </div>
      {(state === "done" || state === "adding" || state === "added") && (
        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-[12.5px] bg-white rounded-lg border border-ice p-3">
          <span><strong className="text-navy">ชื่อ:</strong> {[fields.first_name, fields.last_name].filter(Boolean).join(" ") || "-"}</span>
          <span><strong className="text-navy">ตำแหน่ง:</strong> {fields.position ?? "-"}</span>
          <span><strong className="text-navy">บริษัท:</strong> {fields.company_name ?? "-"}</span>
          <span><strong className="text-navy">โทร:</strong> {fields.phone ?? "-"}</span>
          <span><strong className="text-navy">อีเมล:</strong> {fields.email ?? "-"}</span>
          {fields.line_id && <span><strong className="text-navy">LINE:</strong> {fields.line_id}</span>}
          {state === "added" ? (
            <span className="ml-auto text-[12px] font-bold text-[#2E9E5B]">✅ เพิ่มเป็น Lead แล้ว</span>
          ) : (
            <button onClick={addLead} disabled={state === "adding"} className="btn btn-primary text-[11.5px] py-1 px-2.5 ml-auto disabled:opacity-60">
              {state === "adding" ? "กำลังบันทึก..." : "＋ เพิ่มเป็น Lead ใหม่"}
            </button>
          )}
        </div>
      )}
      {state === "error" && <p className="mt-2 text-[12.5px] text-[#D94141]">⚠ {err}</p>}
    </div>
  );
}

// ── ฟอร์มเพิ่มดีลใหม่ ──
function AddDealForm({ customers, empId, onDone }: { customers: DbCustomer[]; empId: string; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [industry, setIndustry] = useState("");
  const [solution, setSolution] = useState("");
  const [value, setValue] = useState("กลาง");
  const [next, setNext] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const save = async () => {
    if (!supabase || !name.trim()) return;
    setSaving(true);
    setErr("");
    try {
      const existing = customers.find((c) => c.name === name.trim());
      let customerId = existing?.id ?? null;
      const ind = industry.trim() || existing?.industry || null;
      if (!existing) {
        const { data, error } = await supabase.from("customers").insert({ name: name.trim(), industry: ind }).select("id").single();
        if (error) throw error;
        customerId = data.id;
      }
      const { error: e2 } = await supabase.from("deals").insert({
        customer_id: customerId,
        customer_name: name.trim(),
        industry: ind,
        solution: solution.trim() || null,
        stage: "lead",
        value_level: value,
        owner: empId || null,
        next_action: next.trim() || null,
      });
      if (e2) throw e2;
      setOpen(false);
      setName(""); setIndustry(""); setSolution(""); setNext(""); setValue("กลาง");
      onDone();
    } catch (e) {
      setErr(String((e as Error).message ?? e));
    } finally {
      setSaving(false);
    }
  };

  if (!open) {
    return <button onClick={() => setOpen(true)} className="btn btn-primary text-[13px] py-2 px-3.5 mb-3">＋ เพิ่มดีลใหม่</button>;
  }
  return (
    <div className="mb-4 card-white p-4">
      <p className="font-bold text-navy text-[14px]">เพิ่มดีลใหม่</p>
      <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
        <div>
          <label className="text-[11.5px] font-bold text-muted">ลูกค้า (เลือกจากรายชื่อเดิม หรือพิมพ์ชื่อใหม่)</label>
          <input list="crm-customers" value={name} onChange={(e) => setName(e.target.value)} placeholder="ชื่อบริษัทลูกค้า"
            className="mt-1 w-full rounded-lg border border-ice px-3 py-2 text-[13px]" />
          <datalist id="crm-customers">{customers.map((c) => <option key={c.id} value={c.name} />)}</datalist>
        </div>
        <div>
          <label className="text-[11.5px] font-bold text-muted">อุตสาหกรรม</label>
          <input value={industry} onChange={(e) => setIndustry(e.target.value)} placeholder="เช่น ยานยนต์ / โลจิสติกส์"
            className="mt-1 w-full rounded-lg border border-ice px-3 py-2 text-[13px]" />
        </div>
        <div>
          <label className="text-[11.5px] font-bold text-muted">โซลูชันที่สนใจ</label>
          <input value={solution} onChange={(e) => setSolution(e.target.value)} placeholder="เช่น Lifter AGV x2 + FMS"
            className="mt-1 w-full rounded-lg border border-ice px-3 py-2 text-[13px]" />
        </div>
        <div>
          <label className="text-[11.5px] font-bold text-muted">มูลค่าโดยประมาณ</label>
          <select value={value} onChange={(e) => setValue(e.target.value)} className="mt-1 w-full rounded-lg border border-ice px-3 py-2 text-[13px] bg-white">
            <option value="สูง">สูง</option><option value="กลาง">กลาง</option><option value="เล็ก">เล็ก</option>
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="text-[11.5px] font-bold text-muted">งานถัดไป</label>
          <input value={next} onChange={(e) => setNext(e.target.value)} placeholder="เช่น โทรคัดกรองความต้องการ"
            className="mt-1 w-full rounded-lg border border-ice px-3 py-2 text-[13px]" />
        </div>
      </div>
      {err && <p className="mt-2 text-[12.5px] text-[#D94141]">⚠ {err}</p>}
      <div className="mt-3 flex gap-2">
        <button onClick={save} disabled={saving || !name.trim()} className="btn btn-primary text-[13px] py-2 px-4 disabled:opacity-50">
          {saving ? "กำลังบันทึก..." : "บันทึกดีล"}
        </button>
        <button onClick={() => setOpen(false)} className="btn btn-outline text-[13px] py-2 px-4">ยกเลิก</button>
      </div>
    </div>
  );
}

// ── รายละเอียดดีล ──
function DealDetail({
  deal, empId, empName, readOnly, onChanged,
}: {
  deal: DbDeal; empId: string; empName: (id: string | null) => string; readOnly: boolean; onChanged: () => void;
}) {
  const [acts, setActs] = useState<DbActivity[]>([]);
  const [comments, setComments] = useState<DbComment[]>([]);
  const [actType, setActType] = useState("โทร");
  const [actNote, setActNote] = useState("");
  const [comment, setComment] = useState("");
  const [nextAction, setNextAction] = useState(deal.next_action ?? "");
  const [scoring, setScoring] = useState(false);
  const [scoreErr, setScoreErr] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!supabase) return;
    const [a, c] = await Promise.all([
      supabase.from("deal_activities").select("*").eq("deal_id", deal.id).order("created_at", { ascending: true }),
      supabase.from("deal_comments").select("*").eq("deal_id", deal.id).order("created_at", { ascending: true }),
    ]);
    setActs((a.data as DbActivity[]) ?? []);
    setComments((c.data as DbComment[]) ?? []);
  }, [deal.id]);

  useEffect(() => { setNextAction(deal.next_action ?? ""); setScoreErr(""); load(); }, [deal.id, deal.next_action, load]);

  const addActivity = async () => {
    if (!supabase || !actNote.trim()) return;
    setBusy(true);
    await supabase.from("deal_activities").insert({ deal_id: deal.id, emp_id: empId || null, type: actType, note: actNote.trim() });
    setActNote("");
    setBusy(false);
    load();
  };

  const sendComment = async () => {
    if (!supabase || !comment.trim() || !empId) return;
    await supabase.from("deal_comments").insert({ deal_id: deal.id, emp_id: empId, body: comment.trim() });
    setComment("");
    load();
  };

  const moveStage = async (stage: string) => {
    if (!supabase || stage === deal.stage) return;
    setBusy(true);
    await supabase.from("deals").update({ stage }).eq("id", deal.id);
    const label = STAGES.find((s) => s.key === stage)?.label ?? stage;
    await supabase.from("deal_activities").insert({ deal_id: deal.id, emp_id: empId || null, type: "ขั้นดีล", note: `ย้ายไปขั้น "${label}"` });
    setBusy(false);
    onChanged();
  };

  const saveNextAction = async () => {
    if (!supabase) return;
    await supabase.from("deals").update({ next_action: nextAction.trim() || null }).eq("id", deal.id);
    onChanged();
  };

  const runLeadScore = async () => {
    setScoring(true);
    setScoreErr("");
    try {
      const j = await callCopilot({
        action: "ask",
        payload: [
          `คุณคือ AI ประเมินคุณภาพ Lead ของ CONSERTECH (ผู้ขายระบบ AGV/AMR และอุปกรณ์อัตโนมัติในโรงงาน)`,
          `ประเมินดีลนี้เป็นคะแนน 0-100 (โอกาสปิดการขาย ยิ่งสูงยิ่งดี) พร้อมเหตุผลสั้นๆ 1-2 ประโยคภาษาไทย`,
          `ข้อมูลดีล:`,
          `- ลูกค้า: ${deal.customer_name} (${deal.industry ?? "-"})`,
          `- โซลูชัน: ${deal.solution ?? "ยังไม่ระบุ"}`,
          `- ขั้นปัจจุบัน: ${STAGES.find((s) => s.key === deal.stage)?.label ?? deal.stage} | มูลค่า: ${deal.value_level}`,
          `- งานถัดไป: ${deal.next_action ?? "-"}`,
          `- กิจกรรม: ${acts.map((a) => `${fmtD(a.created_at)} ${a.type}: ${a.note}`).join(" / ") || "ยังไม่มี"}`,
          `ตอบเป็น JSON เท่านั้น ห้ามมีข้อความอื่น: {"score": ตัวเลข, "reason": "เหตุผล"}`,
        ].join("\n"),
      });
      const parsed = parseJsonLoose(String(j.text ?? ""));
      const score = Number(parsed?.score);
      if (!parsed || Number.isNaN(score)) throw new Error("AI ตอบรูปแบบไม่ถูกต้อง — ลองอีกครั้ง");
      if (supabase) {
        await supabase.from("deals").update({
          lead_score: Math.max(0, Math.min(100, Math.round(score))),
          lead_score_reason: String(parsed.reason ?? ""),
        }).eq("id", deal.id);
      }
      onChanged();
    } catch (e) {
      setScoreErr(String((e as Error).message ?? e));
    } finally {
      setScoring(false);
    }
  };

  const scoreColor = (s: number) => (s >= 70 ? "bg-[#2E9E5B]/15 text-[#2E9E5B]" : s >= 40 ? "bg-amber/15 text-amber" : "bg-[#D94141]/10 text-[#D94141]");

  return (
    <div className="mt-5 card-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold text-sky">{dealCode(deal.id)} · {deal.industry ?? "-"} · ผู้ดูแล: {empName(deal.owner)}</p>
          <h2 className="text-[20px] font-bold text-navy">{deal.customer_name}</h2>
          <p className="text-[14px] text-muted">{deal.solution ?? "ยังไม่ระบุโซลูชัน"}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {deal.lead_score !== null && (
            <span className={`text-[12px] font-bold rounded-lg px-2.5 py-1.5 ${scoreColor(deal.lead_score)}`} title={deal.lead_score_reason ?? ""}>
              🎯 Lead Score {deal.lead_score}
            </span>
          )}
          {!readOnly && (
            <>
              <button onClick={runLeadScore} disabled={scoring} className="btn btn-amber text-[12.5px] py-2 px-3 disabled:opacity-60">
                {scoring ? "⏳ AI กำลังให้คะแนน..." : deal.lead_score === null ? "✨ AI ให้คะแนน Lead" : "✨ ให้คะแนนใหม่"}
              </button>
              <Link href="/staff/documents" className="btn btn-primary text-[13px] py-2 px-3.5">สร้างใบเสนอราคา</Link>
            </>
          )}
        </div>
      </div>
      {scoreErr && <p className="mt-2 text-[12.5px] text-[#D94141]">⚠ {scoreErr}</p>}
      {deal.lead_score !== null && deal.lead_score_reason && (
        <p className="mt-2 text-[12.5px] text-muted bg-ice/50 rounded-lg px-3 py-2">💡 {deal.lead_score_reason}</p>
      )}

      {/* ย้ายขั้นดีล */}
      {!readOnly && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <span className="text-[11.5px] font-bold text-muted mr-1">ขั้นดีล:</span>
          {STAGES.map((s) => (
            <button key={s.key} onClick={() => moveStage(s.key)} disabled={busy}
              className={`text-[11.5px] font-bold rounded-lg px-2.5 py-1.5 border transition disabled:opacity-50 ${
                deal.stage === s.key
                  ? s.key === "lost" ? "bg-[#D94141] text-white border-[#D94141]" : "bg-brand text-white border-brand"
                  : "bg-white border-ice text-muted hover:border-brand hover:text-brand"
              }`}>
              {s.label}
            </button>
          ))}
        </div>
      )}

      {/* งานถัดไป */}
      <div className="mt-3 rounded-lg bg-ice/60 px-3 py-2 text-[13px] flex flex-wrap items-center gap-2">
        <strong className="text-navy shrink-0">งานถัดไป:</strong>
        {readOnly ? (
          <span>{deal.next_action ?? "-"}</span>
        ) : (
          <>
            <input value={nextAction} onChange={(e) => setNextAction(e.target.value)}
              className="flex-1 min-w-[180px] rounded-lg border border-ice bg-white px-2.5 py-1.5 text-[12.5px]" placeholder="ระบุงานถัดไป..." />
            {nextAction !== (deal.next_action ?? "") && (
              <button onClick={saveNextAction} className="btn btn-primary text-[11.5px] py-1.5 px-2.5">บันทึก</button>
            )}
          </>
        )}
      </div>

      {/* กิจกรรม */}
      <h3 className="mt-4 text-[14px] font-bold text-navy">ประวัติกิจกรรม <span className="text-sky text-[12px]">({acts.length})</span></h3>
      <div className="mt-2 space-y-2">
        {acts.map((a) => (
          <div key={a.id} className="flex gap-3 text-[13px]">
            <span className="text-muted/70 w-14 shrink-0">{fmtD(a.created_at)}</span>
            <span className="font-semibold text-brand w-16 shrink-0">{a.type}</span>
            <span className="text-ink flex-1">{a.note}
              {a.emp_id && <span className="text-muted/60 text-[11px] ml-1.5">— {empName(a.emp_id)}</span>}
            </span>
          </div>
        ))}
        {acts.length === 0 && <p className="text-[12.5px] text-muted/70">ยังไม่มีกิจกรรม</p>}
      </div>
      {!readOnly && (
        <div className="mt-2.5 flex flex-wrap gap-2">
          <select value={actType} onChange={(e) => setActType(e.target.value)} className="rounded-lg border border-ice px-2.5 py-2 text-[12.5px] bg-white">
            {ACT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <input value={actNote} onChange={(e) => setActNote(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") addActivity(); }}
            placeholder="บันทึกกิจกรรม เช่น โทรคุยแล้ว ลูกค้าขอใบเสนอราคา..."
            className="flex-1 min-w-[200px] rounded-lg border border-ice px-3 py-2 text-[12.5px]" />
          <button onClick={addActivity} disabled={busy || !actNote.trim()} className="btn btn-primary text-[12.5px] py-2 px-3.5 disabled:opacity-50">บันทึก</button>
        </div>
      )}

      {/* คอมเมนต์ */}
      <h3 className="mt-5 text-[14px] font-bold text-navy">💬 คอมเมนต์ <span className="text-sky text-[12px]">({comments.length})</span></h3>
      <div className="mt-2 space-y-2 max-h-72 overflow-y-auto pr-1">
        {comments.map((c) => {
          const mine = c.emp_id === empId;
          return (
            <div key={c.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[85%] rounded-xl px-3 py-2 text-[12.5px] ${mine ? "bg-brand text-white" : "bg-ice/70 text-ink"}`}>
                {!mine && <p className="text-[10.5px] font-bold text-sky mb-0.5">{empName(c.emp_id)}</p>}
                <p className="whitespace-pre-wrap leading-relaxed">{c.body}</p>
                <p className={`text-[10px] mt-1 ${mine ? "text-white/70" : "text-muted/70"}`}>{fmtDT(c.created_at)}</p>
              </div>
            </div>
          );
        })}
        {comments.length === 0 && <p className="text-[12.5px] text-muted/70">ยังไม่มีคอมเมนต์ — คุยงานเรื่องดีลนี้กับทีมได้ที่นี่</p>}
      </div>
      <div className="mt-2 flex gap-2">
        <input value={comment} onChange={(e) => setComment(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") sendComment(); }}
          placeholder="พิมพ์คอมเมนต์... (Enter เพื่อส่ง)"
          className="flex-1 rounded-lg border border-ice px-3 py-2 text-[12.5px]" />
        <button onClick={sendComment} disabled={!comment.trim()} className="btn btn-primary text-[12.5px] py-2 px-3.5 disabled:opacity-50">ส่ง</button>
      </div>

      <AiSummary deal={deal} acts={acts} />
    </div>
  );
}

function CrmBody() {
  const { access, empId } = useDept();
  const readOnly = access("crm") === "read";
  const [deals, setDeals] = useState<DbDeal[]>([]);
  const [customers, setCustomers] = useState<DbCustomer[]>([]);
  const [empNames, setEmpNames] = useState<Record<string, string>>({});
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    if (!supabase) { setLoaded(true); return; }
    const [d, c, e] = await Promise.all([
      supabase.from("deals").select("*").order("created_at", { ascending: false }),
      supabase.from("customers").select("id,name,industry").order("name"),
      supabase.from("employees").select("id,name"),
    ]);
    const list = (d.data as DbDeal[]) ?? [];
    setDeals(list);
    setCustomers((c.data as DbCustomer[]) ?? []);
    setEmpNames(Object.fromEntries(((e.data as { id: string; name: string }[]) ?? []).map((x) => [x.id, x.name])));
    setSelectedId((prev) => (prev !== null && list.some((x) => x.id === prev) ? prev : list[0]?.id ?? null));
    setLoaded(true);
  }, []);

  useEffect(() => { load(); }, [load]);

  const empName = (id: string | null) => (id ? empNames[id] ?? id : "-");
  const selected = deals.find((d) => d.id === selectedId) ?? null;

  const addLeadFromCard = async (f: Record<string, string | null>) => {
    if (!supabase) throw new Error("ยังไม่ได้เชื่อมต่อฐานข้อมูล");
    const companyName = f.company_name || [f.first_name, f.last_name].filter(Boolean).join(" ") || "ลูกค้าใหม่ (จากนามบัตร)";
    const contact = [f.first_name, f.last_name].filter(Boolean).join(" ") || null;
    const { data: cust, error } = await supabase.from("customers").insert({
      name: companyName, contact_name: contact, phone: f.phone ?? null, email: f.email ?? null,
      line_id: f.line_id ?? null, note: f.position ? `ตำแหน่งผู้ติดต่อ: ${f.position}` : null,
    }).select("id").single();
    if (error) throw error;
    const { data: deal, error: e2 } = await supabase.from("deals").insert({
      customer_id: cust.id, customer_name: companyName, stage: "lead", value_level: "กลาง",
      owner: empId || null, next_action: "โทรแนะนำบริษัทและคัดกรองความต้องการ",
    }).select("id").single();
    if (e2) throw e2;
    await supabase.from("deal_activities").insert({ deal_id: deal.id, emp_id: empId || null, type: "Lead", note: "เพิ่มจากสแกนนามบัตรด้วย AI" });
    await load();
    setSelectedId(deal.id);
  };

  if (!supabase) {
    return <p className="text-[13px] text-muted bg-ice/50 rounded-lg px-3 py-2 inline-block">⚠ ยังไม่ได้เชื่อมต่อฐานข้อมูล</p>;
  }

  return (
    <>
      {readOnly && (
        <p className="mb-3 text-[12.5px] bg-ice text-sky font-semibold rounded-lg px-3 py-2 inline-block">
          👁️ แผนกของคุณดูข้อมูลได้อย่างเดียว — แก้ไขได้เฉพาะฝ่ายขาย
        </p>
      )}
      {!readOnly && <BizCardScan onAddLead={addLeadFromCard} />}
      {!readOnly && <AddDealForm customers={customers} empId={empId} onDone={load} />}

      {/* Pipeline */}
      <div className="overflow-x-auto pb-2 -mx-1 px-1">
        <div className="flex gap-3 min-w-[1050px]">
          {STAGES.map((st) => {
            const items = deals.filter((d) => d.stage === st.key);
            return (
              <div key={st.key} className="flex-1 min-w-[145px]">
                <p className="text-[12px] font-bold text-navy px-1 mb-2">
                  {st.label} <span className="text-sky">({items.length})</span>
                </p>
                <div className="space-y-2">
                  {items.map((d) => (
                    <button
                      key={d.id}
                      onClick={() => setSelectedId(d.id)}
                      className={`w-full text-left rounded-xl border p-3 bg-white transition text-[12.5px] ${
                        selectedId === d.id ? "border-brand shadow-sm" : "border-ice hover:border-brand"
                      }`}
                    >
                      <p className="font-bold text-navy leading-snug">{d.customer_name}</p>
                      <p className="text-muted mt-0.5">{d.solution ?? "ยังไม่ระบุ"}</p>
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        <span className={`inline-block text-[10.5px] font-bold rounded px-1.5 py-0.5 ${
                          d.value_level === "สูง" ? "bg-amber/15 text-amber" : "bg-ice text-sky"
                        }`}>มูลค่า{d.value_level}</span>
                        {d.lead_score !== null && (
                          <span className={`inline-block text-[10.5px] font-bold rounded px-1.5 py-0.5 ${
                            d.lead_score >= 70 ? "bg-[#2E9E5B]/15 text-[#2E9E5B]" : d.lead_score >= 40 ? "bg-amber/15 text-amber" : "bg-[#D94141]/10 text-[#D94141]"
                          }`}>🎯 {d.lead_score}</span>
                        )}
                      </div>
                    </button>
                  ))}
                  {items.length === 0 && <div className="rounded-xl border border-dashed border-ice h-16" />}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {loaded && deals.length === 0 && (
        <p className="mt-4 text-[13px] text-muted">ยังไม่มีดีล — เพิ่มดีลใหม่หรือสแกนนามบัตรเพื่อเริ่มต้น</p>
      )}

      {selected && (
        <DealDetail deal={selected} empId={empId} empName={empName} readOnly={readOnly} onChanged={load} />
      )}
    </>
  );
}

export default function CrmPage() {
  return (
    <StaffShell title="CRM / ดีล">
      <CrmBody />
    </StaffShell>
  );
}
