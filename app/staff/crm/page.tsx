"use client";

// โมดูล CRM — Pipeline ดีล + รายละเอียด + AI ช่วยสรุป (จำลอง)

import { useState } from "react";
import Link from "next/link";
import StaffShell, { useDept } from "@/components/staff/StaffShell";
import { deals, dealStages, type Deal } from "@/lib/staffData";

function AiSummary({ deal }: { deal: Deal }) {
  const [state, setState] = useState<"idle" | "loading" | "done">("idle");
  return (
    <div className="mt-4 rounded-xl border border-amber/50 bg-amber/5 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[13px] font-bold text-navy">✨ AI ผู้ช่วยฝ่ายขาย</p>
        <button
          onClick={() => { setState("loading"); setTimeout(() => setState("done"), 900); }}
          className="btn btn-amber text-[12.5px] py-1.5 px-3"
        >
          {state === "loading" ? "กำลังวิเคราะห์..." : "สรุปดีลนี้ให้หน่อย"}
        </button>
      </div>
      {state === "done" && (
        <div className="mt-3 text-[13px] leading-relaxed text-ink space-y-1.5">
          <p><strong className="text-brand">สรุป:</strong> {deal.customer} ({deal.industry}) สนใจ {deal.solution} — อยู่ขั้น &ldquo;{dealStages.find(s => s.key === deal.stage)?.label}&rdquo; มูลค่าระดับ{deal.value} มีกิจกรรมล่าสุด {deal.activities.length} รายการ</p>
          <p><strong className="text-brand">สิ่งที่ควรทำถัดไป:</strong> {deal.nextAction}</p>
          <p><strong className="text-brand">ข้อเสนอแนะ:</strong> ลูกค้ากลุ่ม{deal.industry}มักถามเรื่องมาตรฐานความปลอดภัยและ ROI — เตรียมเคสอ้างอิงและตาราง Payback ไปด้วย</p>
          <p className="text-[11px] text-muted/70 italic">* คำตอบจำลองเพื่อเดโม — ระบบจริงเชื่อม Claude API + ข้อมูลดีลจริง</p>
        </div>
      )}
    </div>
  );
}

// สแกนนามบัตรด้วย AI (จาก ai/scan-business-card ของ tomas-tech-pm)
function BizCardScan() {
  const [state, setState] = useState<"idle" | "scanning" | "done">("idle");
  return (
    <div className="mb-4 rounded-xl border border-dashed border-sky/60 bg-ice/30 p-3.5">
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={() => { setState("scanning"); setTimeout(() => setState("done"), 1100); }}
          className="btn btn-outline text-[13px] py-2 px-3.5"
        >
          {state === "scanning" ? "✨ AI กำลังอ่านนามบัตร..." : "📇 สแกนนามบัตร (ถ่ายรูป/อัปโหลด)"}
        </button>
        <p className="text-[12px] text-muted">ได้นามบัตรจากงานแฟร์/เข้าพบลูกค้า → ถ่ายรูปแล้ว AI กรอกข้อมูลเข้า CRM ให้อัตโนมัติ</p>
      </div>
      {state === "done" && (
        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-[12.5px] bg-white rounded-lg border border-ice p-3">
          <span><strong className="text-navy">ชื่อ:</strong> คุณประวิทย์ ใจดี</span>
          <span><strong className="text-navy">ตำแหน่ง:</strong> ผจก.ฝ่ายผลิต</span>
          <span><strong className="text-navy">บริษัท:</strong> โรงงานพลาสติก H</span>
          <span><strong className="text-navy">โทร:</strong> 08x-xxx-1234</span>
          <span><strong className="text-navy">อีเมล:</strong> prawit@example.co.th</span>
          <button className="btn btn-primary text-[11.5px] py-1 px-2.5 ml-auto">＋ เพิ่มเป็น Lead ใหม่</button>
        </div>
      )}
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
