"use client";

// โมดูล CRM — ข้อมูลจริงจากฐานข้อมูล (Supabase)
// Pipeline ดีล + กิจกรรม + คอมเมนต์ + AI Lead Score + AI สรุปดีล + สแกนนามบัตร

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import StaffShell, { useDept } from "@/components/staff/StaffShell";
import { dealStages } from "@/lib/staffData";
import { THAI_PROVINCES } from "@/lib/thaiProvinces";
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
function BizCardScan({ onAddLead, addLabel = "＋ เพิ่มเป็น Lead ใหม่" }: { onAddLead: (f: Record<string, string | null>) => Promise<string | void>; addLabel?: string }) {
  const [state, setState] = useState<"idle" | "scanning" | "done" | "adding" | "added" | "error">("idle");
  const [fields, setFields] = useState<Record<string, string | null>>({});
  const [err, setErr] = useState("");
  const [doneMsg, setDoneMsg] = useState("");
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
      const msg = await onAddLead(fields);
      setDoneMsg(typeof msg === "string" ? msg : "✅ เพิ่มแล้ว");
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
          {fields.address && <span className="w-full"><strong className="text-navy">ที่อยู่:</strong> {fields.address}{[fields.subdistrict, fields.district, fields.province, fields.postcode].filter(Boolean).length > 0 && ` · ${[fields.subdistrict, fields.district, fields.province, fields.postcode].filter(Boolean).join(" ")}`}</span>}
          {state === "added" ? (
            <span className="ml-auto text-[12px] font-bold text-[#2E9E5B]">{doneMsg}</span>
          ) : (
            <button onClick={addLead} disabled={state === "adding"} className="btn btn-primary text-[11.5px] py-1 px-2.5 ml-auto disabled:opacity-60">
              {state === "adding" ? "กำลังบันทึก..." : addLabel}
            </button>
          )}
        </div>
      )}
      {state === "error" && <p className="mt-2 text-[12.5px] text-[#D94141]">⚠ {err}</p>}
    </div>
  );
}

// เทียบชื่อบริษัทแบบไม่สนวรรคตอน/ช่องว่าง/ตัวพิมพ์/คำลงท้าย — กัน "Co.,Ltd" กับ "Co.,Ltd." กลายเป็นคนละบริษัท
export function normCompany(s: string): string {
  return s.toLowerCase()
    .replace(/บริษัท|ห้างหุ้นส่วนจำกัด|หจก\.?/g, " ")
    .replace(/จำกัด\s*\(มหาชน\)|จำกัด/g, " ")
    .replace(/public\s+company\s+limited|company\s+limited/g, " coltd ")
    .replace(/co\.?\s*,?\s*ltd\.?/g, " coltd ")
    .replace(/[^\p{L}\p{N}]+/gu, "")
    .trim();
}

// นามบัตร 1 ใบ = ผู้ติดต่อ 1 คน — ถ้าบริษัทมีอยู่แล้วเพิ่มเป็นผู้ติดต่อ ถ้ายังไม่มีสร้างบริษัทใหม่ให้ด้วย
async function upsertFromCard(f: Record<string, string | null>, empId?: string): Promise<{ customerId: number; createdCompany: boolean; companyName: string; contactName: string | null; contactUpdated?: boolean }> {
  if (!supabase) throw new Error("ยังไม่ได้เชื่อมต่อฐานข้อมูล");
  const companyName = (f.company_name ?? "").trim() || [f.first_name, f.last_name].filter(Boolean).join(" ").trim() || "ลูกค้าใหม่ (จากนามบัตร)";
  const contactName = [f.first_name, f.last_name].filter(Boolean).join(" ").trim() || null;
  const address = (f.address ?? "").trim() || null;
  const parts = {
    subdistrict: (f.subdistrict ?? "").trim() || null,
    district: (f.district ?? "").trim() || null,
    province: (f.province ?? "").trim() || null,
    postcode: (f.postcode ?? "").trim() || null,
  };
  // เทียบชื่อแบบ normalize กับทุกบริษัทที่มี (กันซ้ำจากจุด/คอมมา/ช่องว่างต่างกัน)
  const { data: allNames } = await supabase.from("customers").select("id,name,contact_name,address,province");
  const target = normCompany(companyName);
  const existing = ((allNames as { id: number; name: string; contact_name: string | null; address: string | null; province: string | null }[]) ?? [])
    .find((c) => normCompany(c.name) === target) ?? null;
  let customerId: number;
  let createdCompany = false;
  if (existing) {
    customerId = existing.id;
    const patch: Record<string, unknown> = {};
    if (!existing.contact_name && contactName) { patch.contact_name = contactName; patch.phone = f.phone ?? null; patch.email = f.email ?? null; }
    if (!existing.address && address) patch.address = address; // เติมที่อยู่จากนามบัตรให้ถ้ายังไม่มี
    if (!existing.province && parts.province) Object.assign(patch, parts);
    if (Object.keys(patch).length) await supabase.from("customers").update(patch).eq("id", customerId);
  } else {
    const { data: cust, error } = await supabase.from("customers").insert({
      name: companyName, contact_name: contactName, phone: f.phone ?? null, email: f.email ?? null, line_id: f.line_id ?? null, address, ...parts,
      owner: empId || null,
    }).select("id").single();
    if (error) throw error;
    customerId = cust.id;
    createdCompany = true;
  }
  let contactUpdated = false;
  if (contactName) {
    const { data: dup } = await supabase.from("customer_contacts").select("id")
      .eq("customer_id", customerId).ilike("name", contactName).limit(1);
    const row = {
      position: f.position ?? null, phone: f.phone ?? null, email: f.email ?? null, line_id: f.line_id ?? null,
    };
    if (dup?.[0]) {
      // คนเดิมสแกนซ้ำ → อัปเดตข้อมูลล่าสุดแทนการเพิ่มซ้ำ
      await supabase.from("customer_contacts").update(row).eq("id", dup[0].id);
      contactUpdated = true;
    } else {
      await supabase.from("customer_contacts").insert({ customer_id: customerId, name: contactName, ...row, created_by: empId || null });
    }
  }
  return { customerId, createdCompany, companyName, contactName, contactUpdated };
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

  const removeDeal = async () => {
    if (!supabase) return;
    if (!confirm(`ลบดีล ${dealCode(deal.id)} — ${deal.customer_name}?\n(ประวัติกิจกรรมและคอมเมนต์ของดีลนี้จะถูกลบด้วย — ข้อมูลลูกค้าไม่ถูกลบ)`)) return;
    await supabase.from("deals").delete().eq("id", deal.id);
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
              <button onClick={removeDeal} title="ลบดีลนี้ (กรณีเพิ่มผิด)"
                className="text-[12px] font-semibold text-[#D94141]/70 hover:text-[#D94141] px-1.5">🗑 ลบดีล</button>
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
  const [dragId, setDragId] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);

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

  // ย้ายขั้นดีล (ใช้ทั้งลาก-วางและปุ่มชิปในรายละเอียด)
  const moveStageDb = useCallback(async (id: number, stage: string) => {
    if (!supabase) return;
    const deal = deals.find((d) => d.id === id);
    if (!deal || deal.stage === stage) return;
    // อัปเดตทันทีในจอ (optimistic) แล้วค่อยบันทึก
    setDeals((prev) => prev.map((d) => (d.id === id ? { ...d, stage } : d)));
    await supabase.from("deals").update({ stage }).eq("id", id);
    const label = STAGES.find((s) => s.key === stage)?.label ?? stage;
    await supabase.from("deal_activities").insert({ deal_id: id, emp_id: empId || null, type: "ขั้นดีล", note: `ย้ายไปขั้น "${label}"` });
    load();
  }, [deals, empId, load]);

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
      {!readOnly && <AddDealForm customers={customers} empId={empId} onDone={load} />}

      {/* Pipeline */}
      {!readOnly && <p className="text-[11.5px] text-muted/70 mb-1.5 px-1">💡 ลากการ์ดดีลไปวางในช่องอื่นเพื่อเปลี่ยนขั้นได้เลย</p>}
      <div className="overflow-x-auto pb-2 -mx-1 px-1">
        <div className="flex gap-3 min-w-[1050px]">
          {STAGES.map((st) => {
            const items = deals.filter((d) => d.stage === st.key);
            const isOver = dragOver === st.key && dragId !== null;
            return (
              <div
                key={st.key}
                className={`flex-1 min-w-[145px] rounded-xl transition ${isOver ? "bg-brand/5 ring-2 ring-brand/40" : ""}`}
                onDragOver={(e) => { if (!readOnly && dragId !== null) { e.preventDefault(); setDragOver(st.key); } }}
                onDragLeave={(e) => { if (e.currentTarget === e.target) setDragOver(null); }}
                onDrop={(e) => {
                  e.preventDefault();
                  if (!readOnly && dragId !== null) moveStageDb(dragId, st.key);
                  setDragId(null); setDragOver(null);
                }}
              >
                <p className="text-[12px] font-bold text-navy px-1 mb-2">
                  {st.label} <span className="text-sky">({items.length})</span>
                </p>
                <div className="space-y-2 min-h-16 pb-4">
                  {items.map((d) => (
                    <button
                      key={d.id}
                      onClick={() => setSelectedId(d.id)}
                      draggable={!readOnly}
                      onDragStart={(e) => { setDragId(d.id); e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", String(d.id)); }}
                      onDragEnd={() => { setDragId(null); setDragOver(null); }}
                      title={readOnly ? undefined : "ลากไปวางในช่องอื่นเพื่อเปลี่ยนขั้นดีล"}
                      className={`w-full text-left rounded-xl border p-3 bg-white transition text-[12.5px] ${
                        readOnly ? "" : "cursor-grab active:cursor-grabbing"
                      } ${dragId === d.id ? "opacity-40" : ""} ${
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

// ── แท็บจัดการลูกค้า — บริษัท + ผู้ติดต่อหลายคน + แผนที่ + ดีลที่เกี่ยวข้อง ──
type DbCustomerFull = {
  id: number; name: string; industry: string | null; contact_name: string | null;
  phone: string | null; email: string | null; line_id: string | null; note: string | null;
  address: string | null; subdistrict: string | null; district: string | null; province: string | null; postcode: string | null;
  tax_id: string | null; map_url: string | null; owner: string | null; created_at: string;
};
type DbContact = { id: number; customer_id: number; name: string; position: string | null; phone: string | null; email: string | null; line_id: string | null; created_by: string | null };

function CustomersTab() {
  const { access, empId } = useDept();
  const readOnly = access("crm") === "read";
  const [emps, setEmps] = useState<{ id: string; name: string }[]>([]);
  const [customers, setCustomers] = useState<DbCustomerFull[]>([]);
  const [contacts, setContacts] = useState<DbContact[]>([]);
  const [custDeals, setCustDeals] = useState<DbDeal[]>([]);
  const [q, setQ] = useState("");
  const [provFilter, setProvFilter] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);
  // ฟอร์มแก้ไขบริษัท
  const [edit, setEdit] = useState<Partial<DbCustomerFull>>({});
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  // ฟอร์มผู้ติดต่อ (เพิ่มใหม่ / แก้ไข)
  const [cName, setCName] = useState(""); const [cPos, setCPos] = useState("");
  const [cPhone, setCPhone] = useState(""); const [cEmail, setCEmail] = useState(""); const [cLine, setCLine] = useState("");
  const [editContactId, setEditContactId] = useState<number | null>(null);
  const [ec, setEc] = useState<{ name: string; position: string; phone: string; email: string; line_id: string }>({ name: "", position: "", phone: "", email: "", line_id: "" });

  const load = useCallback(async () => {
    if (!supabase) return;
    const [c, ct, d, e] = await Promise.all([
      supabase.from("customers").select("*").order("name"),
      supabase.from("customer_contacts").select("*").order("created_at"),
      supabase.from("deals").select("*").order("created_at", { ascending: false }),
      supabase.from("employees").select("id,name"),
    ]);
    setEmps((e.data as { id: string; name: string }[]) ?? []);
    const list = (c.data as DbCustomerFull[]) ?? [];
    setCustomers(list);
    setContacts((ct.data as DbContact[]) ?? []);
    setCustDeals((d.data as DbDeal[]) ?? []);
    setSelectedId((prev) => (prev !== null && list.some((x) => x.id === prev) ? prev : list[0]?.id ?? null));
  }, []);
  useEffect(() => { load(); }, [load]);

  const selected = customers.find((c) => c.id === selectedId) ?? null;
  useEffect(() => {
    if (selected) setEdit({
      name: selected.name, industry: selected.industry, address: selected.address,
      subdistrict: selected.subdistrict, district: selected.district, province: selected.province, postcode: selected.postcode,
      map_url: selected.map_url, note: selected.note, owner: selected.owner, tax_id: selected.tax_id,
    });
    setMsg("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, selected?.name, selected?.industry, selected?.address, selected?.province, selected?.map_url, selected?.note]);

  const selContacts = contacts.filter((c) => c.customer_id === selectedId);
  const selDeals = selected ? custDeals.filter((d) => d.customer_id === selected.id || d.customer_name === selected.name) : [];
  const list = customers.filter((c) =>
    (!provFilter || c.province === provFilter) &&
    (!q.trim() || (c.name + " " + (c.industry ?? "") + " " + (c.province ?? "") + " " + (c.district ?? "") + " " + contacts.filter((x) => x.customer_id === c.id).map((x) => x.name).join(" ")).toLowerCase().includes(q.trim().toLowerCase())));

  const empName = (id: string | null) => emps.find((x) => x.id === id)?.name ?? id ?? "-";

  const scanCard = async (f: Record<string, string | null>) => {
    const r = await upsertFromCard(f, empId);
    await load();
    setSelectedId(r.customerId);
    return r.createdCompany
      ? `✅ เพิ่มบริษัท "${r.companyName}" + ผู้ติดต่อแล้ว`
      : r.contactUpdated
      ? `✅ บริษัทและผู้ติดต่อนี้มีอยู่แล้ว — อัปเดตข้อมูล "${r.contactName}" ให้เป็นล่าสุด`
      : `✅ บริษัทมีอยู่แล้ว — เพิ่ม "${r.contactName ?? "ผู้ติดต่อ"}" เป็นผู้ติดต่อของ ${r.companyName}`;
  };

  const addCustomer = async () => {
    if (!supabase || !String(edit.name ?? "").trim()) return;
    const dupe = customers.find((c) => normCompany(c.name) === normCompany(String(edit.name)));
    if (dupe) { setMsg(`⚠ บริษัทนี้มีอยู่แล้วในระบบ: "${dupe.name}" — เลือกจากรายชื่อแล้วเพิ่มผู้ติดต่อแทน`); return; }
    setSaving(true);
    const { data, error } = await supabase.from("customers").insert({
      name: String(edit.name).trim(), industry: edit.industry || null, address: edit.address || null,
      subdistrict: edit.subdistrict || null, district: edit.district || null, province: edit.province || null, postcode: edit.postcode || null,
      map_url: edit.map_url || null, note: edit.note || null, owner: (edit.owner as string) || empId || null, tax_id: edit.tax_id || null,
    }).select("id").single();
    setSaving(false);
    if (error) {
      setMsg(error.message.includes("uq_customers_norm_name") || error.message.includes("duplicate")
        ? "⚠ มีบริษัทชื่อนี้ (หรือชื่อเดียวกันที่สะกดต่างเล็กน้อย) อยู่แล้วในระบบ"
        : "⚠ " + error.message);
      return;
    }
    setAdding(false);
    await load();
    setSelectedId(data.id);
  };

  const saveCustomer = async () => {
    if (!supabase || !selected || !String(edit.name ?? "").trim()) return;
    setSaving(true);
    await supabase.from("customers").update({
      name: String(edit.name).trim(), industry: edit.industry || null, address: edit.address || null,
      subdistrict: edit.subdistrict || null, district: edit.district || null, province: edit.province || null, postcode: edit.postcode || null,
      map_url: edit.map_url || null, note: edit.note || null, owner: (edit.owner as string) || null, tax_id: edit.tax_id || null,
    }).eq("id", selected.id);
    setSaving(false); setMsg("✅ บันทึกแล้ว");
    load();
  };

  const removeCustomer = async () => {
    if (!supabase || !selected) return;
    if (!confirm(`ลบลูกค้า "${selected.name}"?\n(ผู้ติดต่อทั้งหมดจะถูกลบด้วย — ดีลที่มีอยู่จะไม่ถูกลบ)`)) return;
    await supabase.from("customers").delete().eq("id", selected.id);
    setSelectedId(null);
    load();
  };

  const addContact = async () => {
    if (!supabase || !selected || !cName.trim()) return;
    await supabase.from("customer_contacts").insert({
      customer_id: selected.id, name: cName.trim(), position: cPos.trim() || null,
      phone: cPhone.trim() || null, email: cEmail.trim() || null, line_id: cLine.trim() || null,
      created_by: empId || null,
    });
    if (!selected.contact_name) {
      await supabase.from("customers").update({ contact_name: cName.trim(), phone: cPhone.trim() || null, email: cEmail.trim() || null }).eq("id", selected.id);
    }
    setCName(""); setCPos(""); setCPhone(""); setCEmail(""); setCLine("");
    load();
  };

  const delContact = async (c: DbContact) => {
    if (!supabase) return;
    if (!confirm(`ลบผู้ติดต่อ "${c.name}"?`)) return;
    await supabase.from("customer_contacts").delete().eq("id", c.id);
    load();
  };

  const startEditContact = (c: DbContact) => {
    setEditContactId(c.id);
    setEc({ name: c.name, position: c.position ?? "", phone: c.phone ?? "", email: c.email ?? "", line_id: c.line_id ?? "" });
  };

  const saveContact = async () => {
    if (!supabase || editContactId === null || !ec.name.trim()) return;
    await supabase.from("customer_contacts").update({
      name: ec.name.trim(), position: ec.position.trim() || null, phone: ec.phone.trim() || null,
      email: ec.email.trim() || null, line_id: ec.line_id.trim() || null,
    }).eq("id", editContactId);
    setEditContactId(null);
    load();
  };

  const editForm = (isNew: boolean) => (
    <div className="grid gap-2.5 sm:grid-cols-2">
      <div>
        <label className="text-[11.5px] font-bold text-muted">ชื่อบริษัท *</label>
        <input value={String(edit.name ?? "")} onChange={(e) => setEdit({ ...edit, name: e.target.value })} disabled={readOnly}
          className="mt-1 w-full rounded-lg border border-ice px-3 py-2 text-[13px]" />
      </div>
      <div>
        <label className="text-[11.5px] font-bold text-muted">อุตสาหกรรม</label>
        <input value={String(edit.industry ?? "")} onChange={(e) => setEdit({ ...edit, industry: e.target.value })} disabled={readOnly}
          placeholder="เช่น ยานยนต์ / โลจิสติกส์" className="mt-1 w-full rounded-lg border border-ice px-3 py-2 text-[13px]" />
      </div>
      <div className="sm:col-span-2">
        <label className="text-[11.5px] font-bold text-muted">👤 ผู้รับผิดชอบ (Sale เจ้าของลูกค้า)</label>
        <select value={String(edit.owner ?? "")} onChange={(e) => setEdit({ ...edit, owner: e.target.value })} disabled={readOnly}
          className="mt-1 w-full rounded-lg border border-ice px-3 py-2 text-[13px] bg-white">
          <option value="">— ยังไม่ระบุ —</option>
          {emps.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
        </select>
      </div>
      <div className="sm:col-span-2">
        <label className="text-[11.5px] font-bold text-muted">ที่อยู่ (เลขที่/หมู่/ถนน/อาคาร)</label>
        <input value={String(edit.address ?? "")} onChange={(e) => setEdit({ ...edit, address: e.target.value })} disabled={readOnly}
          className="mt-1 w-full rounded-lg border border-ice px-3 py-2 text-[13px]" />
      </div>
      <div className="sm:col-span-2 grid grid-cols-2 min-[600px]:grid-cols-4 gap-2">
        <div>
          <label className="text-[11.5px] font-bold text-muted">ตำบล/แขวง</label>
          <input value={String(edit.subdistrict ?? "")} onChange={(e) => setEdit({ ...edit, subdistrict: e.target.value })} disabled={readOnly}
            className="mt-1 w-full rounded-lg border border-ice px-2.5 py-2 text-[13px]" />
        </div>
        <div>
          <label className="text-[11.5px] font-bold text-muted">อำเภอ/เขต</label>
          <input value={String(edit.district ?? "")} onChange={(e) => setEdit({ ...edit, district: e.target.value })} disabled={readOnly}
            className="mt-1 w-full rounded-lg border border-ice px-2.5 py-2 text-[13px]" />
        </div>
        <div>
          <label className="text-[11.5px] font-bold text-muted">จังหวัด</label>
          <select value={String(edit.province ?? "")} onChange={(e) => setEdit({ ...edit, province: e.target.value })} disabled={readOnly}
            className="mt-1 w-full rounded-lg border border-ice px-2 py-2 text-[13px] bg-white">
            <option value="">— เลือก —</option>
            {THAI_PROVINCES.map((pv) => <option key={pv} value={pv}>{pv}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[11.5px] font-bold text-muted">รหัสไปรษณีย์</label>
          <input value={String(edit.postcode ?? "")} onChange={(e) => setEdit({ ...edit, postcode: e.target.value })} disabled={readOnly}
            className="mt-1 w-full rounded-lg border border-ice px-2.5 py-2 text-[13px]" />
        </div>
      </div>
      <div>
        <label className="text-[11.5px] font-bold text-muted">Tax ID (เลขผู้เสียภาษี)</label>
        <input value={String(edit.tax_id ?? "")} onChange={(e) => setEdit({ ...edit, tax_id: e.target.value })} disabled={readOnly}
          placeholder="13 หลัก — ใช้เติมในใบเสนอราคาอัตโนมัติ" className="mt-1 w-full rounded-lg border border-ice px-3 py-2 text-[13px]" />
      </div>
      <div className="sm:col-span-2">
        <label className="text-[11.5px] font-bold text-muted">ลิงก์ Google Maps (คัดลอกลิงก์แชร์จาก Google Maps มาวาง)</label>
        <input value={String(edit.map_url ?? "")} onChange={(e) => setEdit({ ...edit, map_url: e.target.value })} disabled={readOnly}
          placeholder="https://maps.app.goo.gl/..." className="mt-1 w-full rounded-lg border border-ice px-3 py-2 text-[13px]" />
      </div>
      <div className="sm:col-span-2">
        <label className="text-[11.5px] font-bold text-muted">โน้ต</label>
        <input value={String(edit.note ?? "")} onChange={(e) => setEdit({ ...edit, note: e.target.value })} disabled={readOnly}
          className="mt-1 w-full rounded-lg border border-ice px-3 py-2 text-[13px]" />
      </div>
      {!readOnly && (
        <div className="sm:col-span-2 flex gap-2 items-center">
          <button onClick={isNew ? addCustomer : saveCustomer} disabled={saving} className="btn btn-primary text-[13px] py-2 px-4 disabled:opacity-50">
            {saving ? "กำลังบันทึก..." : isNew ? "เพิ่มลูกค้า" : "บันทึกการแก้ไข"}
          </button>
          {isNew && <button onClick={() => setAdding(false)} className="btn btn-outline text-[13px] py-2 px-4">ยกเลิก</button>}
          {msg && <span className={`text-[12.5px] font-semibold ${msg.startsWith("✅") ? "text-[#2E9E5B]" : "text-[#D94141]"}`}>{msg}</span>}
        </div>
      )}
    </div>
  );

  if (!supabase) {
    return <p className="text-[13px] text-muted bg-ice/50 rounded-lg px-3 py-2 inline-block">⚠ ยังไม่ได้เชื่อมต่อฐานข้อมูล</p>;
  }

  return (
    <>
      {!readOnly && <BizCardScan onAddLead={scanCard} addLabel="＋ บันทึกเข้าระบบลูกค้า" />}
      <div className="grid gap-5 min-[1040px]:grid-cols-[320px_1fr] items-start">
        {/* รายชื่อบริษัท */}
        <div className="card-white p-4 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="font-bold text-navy text-[14px]">ลูกค้า <span className="text-sky text-[12px]">({customers.length})</span></p>
            {!readOnly && !adding && (
              <button onClick={() => { setAdding(true); setEdit({}); setMsg(""); }} className="btn btn-primary text-[12px] py-1.5 px-2.5">＋ เพิ่มเอง</button>
            )}
          </div>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="🔍 ค้นหาบริษัท/ผู้ติดต่อ/จังหวัด..."
            className="mt-2.5 w-full rounded-lg border border-ice px-3 py-2 text-[12.5px]" />
          <select value={provFilter} onChange={(e) => setProvFilter(e.target.value)}
            className="mt-2 w-full rounded-lg border border-ice px-2.5 py-2 text-[12.5px] bg-white">
            <option value="">📍 ทุกจังหวัด</option>
            {THAI_PROVINCES.map((pv) => {
              const n = customers.filter((c) => c.province === pv).length;
              return <option key={pv} value={pv}>{pv}{n > 0 ? ` (${n})` : ""}</option>;
            })}
          </select>
          <div className="mt-2.5 space-y-2 max-h-[520px] overflow-y-auto pr-1">
            {list.map((c) => {
              const n = contacts.filter((x) => x.customer_id === c.id).length;
              const nd = custDeals.filter((d) => d.customer_id === c.id || d.customer_name === c.name).length;
              return (
                <button key={c.id} onClick={() => { setSelectedId(c.id); setAdding(false); }}
                  className={`w-full text-left rounded-xl border p-3 transition text-[12.5px] ${selectedId === c.id && !adding ? "border-brand bg-ice/40" : "border-ice hover:border-brand"}`}>
                  <p className="font-bold text-navy leading-snug">{c.name}</p>
                  <p className="text-[11px] text-muted/80 mt-0.5">
                    {[c.industry, c.province && `📍 ${c.province}`, c.owner && `👤 ${empName(c.owner)}`].filter(Boolean).join(" · ") || "-"} · ผู้ติดต่อ {n} · 🤝 {nd} ดีล
                  </p>
                </button>
              );
            })}
            {list.length === 0 && <p className="text-[12.5px] text-muted/70">ไม่พบลูกค้า</p>}
          </div>
        </div>

        {/* รายละเอียด */}
        <div className="space-y-4 min-w-0">
          {adding ? (
            <div className="card-white p-5">
              <p className="font-bold text-navy text-[15px] mb-3">เพิ่มลูกค้าใหม่ (กรอกเอง)</p>
              {editForm(true)}
            </div>
          ) : selected ? (
            <>
              <div className="card-white p-5">
                <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
                  <div>
                    <p className="font-bold text-navy text-[16px]">{selected.name}</p>
                    <p className="text-[11.5px] text-muted mt-0.5">👤 ผู้รับผิดชอบ: <strong className="text-brand">{empName(selected.owner)}</strong></p>
                  </div>
                  <div className="flex gap-2">
                    {selected.map_url && (
                      <a href={selected.map_url} target="_blank" rel="noreferrer" className="btn btn-outline text-[12px] py-1.5 px-3">📍 เปิดแผนที่</a>
                    )}
                    {!readOnly && <button onClick={removeCustomer} className="text-[12px] font-semibold text-[#D94141]/70 hover:text-[#D94141] px-1">🗑 ลบ</button>}
                  </div>
                </div>
                {editForm(false)}
              </div>

              {/* ผู้ติดต่อ */}
              <div className="card-white p-5">
                <p className="font-bold text-navy text-[14.5px]">👤 ผู้ติดต่อ <span className="text-sky text-[12px]">({selContacts.length})</span></p>
                <div className="mt-3 grid gap-2 min-[700px]:grid-cols-2">
                  {selContacts.map((c) => (
                    <div key={c.id} className="rounded-xl border border-ice p-3 text-[12.5px]">
                      {editContactId === c.id ? (
                        <div className="space-y-1.5">
                          <div className="flex gap-1.5">
                            <input value={ec.name} onChange={(e) => setEc({ ...ec, name: e.target.value })} placeholder="ชื่อ *" className="flex-1 min-w-0 rounded border border-ice px-2 py-1 text-[12px]" />
                            <input value={ec.position} onChange={(e) => setEc({ ...ec, position: e.target.value })} placeholder="ตำแหน่ง" className="flex-1 min-w-0 rounded border border-ice px-2 py-1 text-[12px]" />
                          </div>
                          <div className="flex gap-1.5">
                            <input value={ec.phone} onChange={(e) => setEc({ ...ec, phone: e.target.value })} placeholder="โทร" className="flex-1 min-w-0 rounded border border-ice px-2 py-1 text-[12px]" />
                            <input value={ec.line_id} onChange={(e) => setEc({ ...ec, line_id: e.target.value })} placeholder="LINE" className="w-24 rounded border border-ice px-2 py-1 text-[12px]" />
                          </div>
                          <input value={ec.email} onChange={(e) => setEc({ ...ec, email: e.target.value })} placeholder="อีเมล" className="w-full rounded border border-ice px-2 py-1 text-[12px]" />
                          <div className="flex gap-1.5">
                            <button onClick={saveContact} disabled={!ec.name.trim()} className="btn btn-primary text-[11.5px] py-1 px-2.5 disabled:opacity-50">บันทึก</button>
                            <button onClick={() => setEditContactId(null)} className="btn btn-outline text-[11.5px] py-1 px-2.5">ยกเลิก</button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-start justify-between gap-2">
                            <p className="font-bold text-navy">{c.name}</p>
                            {!readOnly && (
                              <span className="flex gap-1 shrink-0">
                                <button onClick={() => startEditContact(c)} title="แก้ไขผู้ติดต่อ"
                                  className="text-[11px] font-bold bg-ice text-sky rounded px-1.5 py-0.5 hover:bg-sky/20">✎ แก้ไข</button>
                                <button onClick={() => delContact(c)} title="ลบผู้ติดต่อ (เช่น ลาออกแล้ว)"
                                  className="text-[11px] font-bold bg-ice text-muted rounded px-1.5 py-0.5 hover:bg-[#D94141]/10 hover:text-[#D94141]">🗑</button>
                              </span>
                            )}
                          </div>
                          {c.position && <p className="text-muted">{c.position}</p>}
                          <p className="text-[11.5px] text-muted/80 mt-1">
                            {[c.phone && `📞 ${c.phone}`, c.email && `✉ ${c.email}`, c.line_id && `LINE: ${c.line_id}`].filter(Boolean).join(" · ") || "—"}
                          </p>
                          {c.created_by && <p className="text-[10.5px] text-muted/60 mt-0.5">เพิ่มโดย {empName(c.created_by)}</p>}
                        </>
                      )}
                    </div>
                  ))}
                  {selContacts.length === 0 && <p className="text-[12.5px] text-muted/70">ยังไม่มีผู้ติดต่อ — สแกนนามบัตรด้านบน หรือกรอกด้านล่าง</p>}
                </div>
                {!readOnly && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <input value={cName} onChange={(e) => setCName(e.target.value)} placeholder="ชื่อผู้ติดต่อ *" className="rounded-lg border border-ice px-2.5 py-1.5 text-[12.5px] w-36" />
                    <input value={cPos} onChange={(e) => setCPos(e.target.value)} placeholder="ตำแหน่ง" className="rounded-lg border border-ice px-2.5 py-1.5 text-[12.5px] w-32" />
                    <input value={cPhone} onChange={(e) => setCPhone(e.target.value)} placeholder="โทร" className="rounded-lg border border-ice px-2.5 py-1.5 text-[12.5px] w-32" />
                    <input value={cEmail} onChange={(e) => setCEmail(e.target.value)} placeholder="อีเมล" className="rounded-lg border border-ice px-2.5 py-1.5 text-[12.5px] w-44" />
                    <input value={cLine} onChange={(e) => setCLine(e.target.value)} placeholder="LINE" className="rounded-lg border border-ice px-2.5 py-1.5 text-[12.5px] w-28" />
                    <button onClick={addContact} disabled={!cName.trim()} className="btn btn-primary text-[12.5px] py-1.5 px-3 disabled:opacity-50">＋ เพิ่ม</button>
                  </div>
                )}
              </div>

              {/* ดีลของบริษัทนี้ */}
              <div className="card-white p-5">
                <p className="font-bold text-navy text-[14.5px]">🤝 ดีลกับบริษัทนี้ <span className="text-sky text-[12px]">({selDeals.length})</span></p>
                <div className="mt-3 space-y-2">
                  {selDeals.map((d) => (
                    <div key={d.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-ice p-3 text-[12.5px]">
                      <span className="font-bold text-sky">{dealCode(d.id)}</span>
                      <span className="text-ink flex-1 min-w-[140px]">{d.solution ?? "ยังไม่ระบุโซลูชัน"}</span>
                      {d.lead_score !== null && <span className="text-[10.5px] font-bold bg-ice text-navy rounded px-1.5 py-0.5">🎯 {d.lead_score}</span>}
                      <span className={`text-[10.5px] font-bold rounded px-1.5 py-0.5 ${
                        d.stage === "won" ? "bg-[#2E9E5B]/15 text-[#2E9E5B]" : d.stage === "lost" ? "bg-[#D94141]/10 text-[#D94141]" : "bg-amber/15 text-amber"
                      }`}>{STAGES.find((s) => s.key === d.stage)?.label ?? d.stage}</span>
                      <span className="text-[10.5px] font-bold bg-ice text-sky rounded px-1.5 py-0.5">มูลค่า{d.value_level}</span>
                    </div>
                  ))}
                  {selDeals.length === 0 && <p className="text-[12.5px] text-muted/70">ยังไม่มีดีลกับบริษัทนี้ — สร้างได้ที่แท็บ Pipeline ดีล</p>}
                </div>
              </div>
            </>
          ) : (
            <p className="card-white p-8 text-center text-[13px] text-muted/70">เลือกลูกค้าจากรายชื่อด้านซ้าย</p>
          )}
        </div>
      </div>
    </>
  );
}

export default function CrmPage() {
  const [tab, setTab] = useState<"pipeline" | "customers">("pipeline");
  return (
    <StaffShell title="CRM / ดีล">
      <div className="flex gap-1 mb-4 bg-ice rounded-xl p-1 w-fit">
        {([["pipeline", "Pipeline ดีล"], ["customers", "จัดการลูกค้า"]] as const).map(([k, label]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`px-4 py-2 rounded-lg text-[13.5px] font-semibold transition ${tab === k ? "bg-white text-navy shadow-sm" : "text-muted"}`}>
            {label}
          </button>
        ))}
      </div>
      {tab === "pipeline" ? <CrmBody /> : <CustomersTab />}
    </StaffShell>
  );
}
