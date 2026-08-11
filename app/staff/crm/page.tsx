"use client";

// โมดูล CRM — Pipeline ดีล + รายละเอียด + AI ช่วยสรุป (จำลอง)

import { useState } from "react";
import Link from "next/link";
import StaffShell, { useDept } from "@/components/staff/StaffShell";
import { deals, dealStages, type Deal } from "@/lib/staffData";
import { callCopilot } from "@/lib/copilot";
import { useRef } from "react";



function AiSummary({ deal }: { deal: Deal }) {
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [text, setText] = useState("");

  const run = async () => {
    setState("loading");
    try {
      const j = await callCopilot({
        action: "summarize_deal",
        payload: [
          `บริษัทเรา: CONSERTECH ผู้ขายระบบ AGV และอุปกรณ์อัตโนมัติในโรงงาน`,
          `ลูกค้า: ${deal.customer} (${deal.industry})`,
          `โซลูชันที่สนใจ: ${deal.solution}`,
          `ขั้นดีล: ${dealStages.find((s) => s.key === deal.stage)?.label} | มูลค่าระดับ: ${deal.value}`,
          `งานถัดไปที่วางไว้: ${deal.nextAction}`,
          `ประวัติกิจกรรม:`,
          ...deal.activities.map((a) => `- ${a.date} ${a.type}: ${a.note}`),
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
      {state === "done" && (
        <div className="mt-3 text-[13px] leading-relaxed text-ink whitespace-pre-wrap">{text}</div>
      )}
      {state === "error" && (
        <p className="mt-3 text-[12.5px] text-[#D94141] bg-[#D94141]/10 rounded-lg px-3 py-2">⚠ {text}</p>
      )}
    </div>
  );
}

// สแกนนามบัตรด้วย AI (จาก ai/scan-business-card ของ tomas-tech-pm)
function BizCardScan() {
  const [state, setState] = useState<"idle" | "scanning" | "done" | "error">("idle");
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
        // edge function คืน JSON ในรูป text → parse
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

  return (
    <div className="mb-4 rounded-xl border border-dashed border-sky/60 bg-ice/30 p-3.5">
      <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) scan(f); e.target.value = ""; }} />
      <div className="flex flex-wrap items-center gap-3">
        <button onClick={() => fileRef.current?.click()} disabled={state === "scanning"}
          className="btn btn-outline text-[13px] py-2 px-3.5 disabled:opacity-60">
          {state === "scanning" ? "✨ AI กำลังอ่านนามบัตร..." : "📇 สแกนนามบัตร (ถ่ายรูป/อัปโหลด)"}
        </button>
        <p className="text-[12px] text-muted">ถ่ายรูปนามบัตรแล้ว AI อ่านข้อมูลกรอกให้จริง <span className="text-[10px] font-bold bg-brand/10 text-brand rounded px-1.5 py-0.5">AI จริง</span></p>
      </div>
      {state === "done" && (
        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-[12.5px] bg-white rounded-lg border border-ice p-3">
          <span><strong className="text-navy">ชื่อ:</strong> {[fields.first_name, fields.last_name].filter(Boolean).join(" ") || "-"}</span>
          <span><strong className="text-navy">ตำแหน่ง:</strong> {fields.position ?? "-"}</span>
          <span><strong className="text-navy">บริษัท:</strong> {fields.company_name ?? "-"}</span>
          <span><strong className="text-navy">โทร:</strong> {fields.phone ?? "-"}</span>
          <span><strong className="text-navy">อีเมล:</strong> {fields.email ?? "-"}</span>
          {fields.line_id && <span><strong className="text-navy">LINE:</strong> {fields.line_id}</span>}
          <button className="btn btn-primary text-[11.5px] py-1 px-2.5 ml-auto">＋ เพิ่มเป็น Lead ใหม่</button>
        </div>
      )}
      {state === "error" && <p className="mt-2 text-[12.5px] text-[#D94141]">⚠ {err}</p>}
    </div>
  );
}

function CrmBody() {
  const [selected, setSelected] = useState<Deal | null>(deals[0]);
  const { access } = useDept();
  const readOnly = access("crm") === "read";

  return (
    <>
      {readOnly && (
        <p className="mb-3 text-[12.5px] bg-ice text-sky font-semibold rounded-lg px-3 py-2 inline-block">
          👁️ แผนกของคุณดูข้อมูลได้อย่างเดียว — แก้ไขได้เฉพาะฝ่ายขาย
        </p>
      )}
      {!readOnly && <BizCardScan />}

      {/* Pipeline */}
      <div className="overflow-x-auto pb-2 -mx-1 px-1">
        <div className="flex gap-3 min-w-[900px]">
          {dealStages.map((st) => {
            const items = deals.filter((d) => d.stage === st.key);
            return (
              <div key={st.key} className="flex-1 min-w-[150px]">
                <p className="text-[12px] font-bold text-navy px-1 mb-2">
                  {st.label} <span className="text-sky">({items.length})</span>
                </p>
                <div className="space-y-2">
                  {items.map((d) => (
                    <button
                      key={d.id}
                      onClick={() => setSelected(d)}
                      className={`w-full text-left rounded-xl border p-3 bg-white transition text-[12.5px] ${
                        selected?.id === d.id ? "border-brand shadow-sm" : "border-ice hover:border-brand"
                      }`}
                    >
                      <p className="font-bold text-navy leading-snug">{d.customer}</p>
                      <p className="text-muted mt-0.5">{d.solution}</p>
                      <span className={`inline-block mt-1.5 text-[10.5px] font-bold rounded px-1.5 py-0.5 ${
                        d.value === "สูง" ? "bg-amber/15 text-amber" : "bg-ice text-sky"
                      }`}>มูลค่า{d.value}</span>
                    </button>
                  ))}
                  {items.length === 0 && <div className="rounded-xl border border-dashed border-ice h-16" />}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Deal detail */}
      {selected && (
        <div className="mt-5 card-white p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold text-sky">{selected.id} · {selected.industry} · ผู้ดูแล: {selected.owner}</p>
              <h2 className="text-[20px] font-bold text-navy">{selected.customer}</h2>
              <p className="text-[14px] text-muted">{selected.solution}</p>
            </div>
            {!readOnly && (
              <div className="flex flex-wrap gap-2">
                <Link href="/staff/documents" className="btn btn-primary text-[13px] py-2 px-3.5">สร้างใบเสนอราคา</Link>
                <Link href="/staff/documents?tab=proposal" className="btn btn-outline text-[13px] py-2 px-3.5">สร้าง Proposal</Link>
              </div>
            )}
          </div>

          <div className="mt-3 rounded-lg bg-ice/60 px-3 py-2 text-[13px]">
            <strong className="text-navy">งานถัดไป:</strong> {selected.nextAction}
            <span className="text-muted/70 ml-2 text-[11.5px]">(เชื่อม Google Calendar ในระบบจริง)</span>
          </div>

          <h3 className="mt-4 text-[14px] font-bold text-navy">ประวัติกิจกรรม</h3>
          <div className="mt-2 space-y-2">
            {selected.activities.map((a, i) => (
              <div key={i} className="flex gap-3 text-[13px]">
                <span className="text-muted/70 w-14 shrink-0">{a.date}</span>
                <span className="font-semibold text-brand w-14 shrink-0">{a.type}</span>
                <span className="text-ink">{a.note}</span>
              </div>
            ))}
          </div>

          <AiSummary deal={selected} />
        </div>
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
