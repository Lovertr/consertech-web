"use client";

import { useState } from "react";

// โมดูล KPI / ประเมินผล — จาก personal-kpis + performance-reviews ของ tomas-tech-pm
// KPI ส่วนบุคคลดึงจากข้อมูลจริงในระบบอัตโนมัติ (CRM/เอกสาร/งาน) ไม่ต้องกรอกเอง

import StaffShell, { useDept } from "@/components/staff/StaffShell";
import { callCopilot } from "@/lib/copilot";
import { personalKpis, reviewCycle, teamReviews } from "@/lib/staffData";

// ✨ AI ช่วยร่างประเมินตนเองจากผลงาน (KPI บนหน้านี้)
function SelfReviewAI() {
  const [st, setSt] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [text, setText] = useState("");
  const run = async () => {
    setSt("loading");
    try {
      const j = await callCopilot({
        action: "self_review",
        payload: personalKpis.map((k) => `${k.metric}: ${k.value} (เป้า ${k.target}, ${k.pct}%) — ${k.auto}`).join("\n"),
      });
      setText(String(j.text ?? ""));
      setSt("done");
    } catch (e) { setText(String(e)); setSt("error"); }
  };
  return (
    <>
      <button onClick={run} disabled={st === "loading"} className="btn btn-primary w-full mt-4 text-[13.5px] py-2 disabled:opacity-60">
        {st === "loading" ? "⏳ AI กำลังร่างจากผลงานจริง..." : "✨ ให้ AI ช่วยร่างประเมินตนเอง"}
      </button>
      {st === "done" && (
        <div className="mt-3 text-[12.5px] text-ink whitespace-pre-wrap leading-relaxed bg-ice/40 rounded-lg p-3 max-h-72 overflow-y-auto">{text}</div>
      )}
      {st === "error" && <p className="mt-2 text-[12px] text-[#D94141]">⚠ {text}</p>}
      <p className="mt-2 text-[11px] text-muted/70 italic">
        <span className="text-[10px] font-bold bg-brand/10 text-brand rounded px-1 py-0.5 not-italic mr-1">AI จริง</span>
        AI ร่างจากตัวเลข KPI บนหน้านี้ — พนักงานแก้ไขก่อนส่งได้
      </p>
    </>
  );
}

function KpiBody() {
  const { dept } = useDept();
  const isManager = dept === "management";

  return (
    <>
      {/* KPI ส่วนตัว */}
      <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
        <p className="font-bold text-navy text-[15px]">KPI ของฉัน (เดือนนี้)</p>
        <span className="text-[11.5px] text-sky bg-ice font-semibold rounded px-2 py-1">อัปเดตอัตโนมัติจากข้อมูลจริงในระบบ — ไม่ต้องกรอกเอง</span>
      </div>
      <div className="grid gap-4 grid-cols-2 min-[1040px]:grid-cols-4">
        {personalKpis.map((k) => (
          <div key={k.metric} className="card-white p-4">
            <p className="text-[12px] text-muted leading-snug">{k.metric}</p>
            <p className="mt-1 text-[22px] font-bold text-navy leading-none">
              {k.value} <span className="text-[12px] font-semibold text-muted">/ เป้า {k.target}</span>
            </p>
            <div className="mt-2.5 h-1.5 rounded-full bg-ice overflow-hidden">
              <div className={`h-full rounded-full ${k.pct >= 100 ? "bg-brand" : k.pct >= 70 ? "bg-amber" : "bg-red-400"}`} style={{ width: `${Math.min(k.pct, 100)}%` }} />
            </div>
            <p className="mt-1.5 text-[10.5px] text-muted/70">{k.auto}</p>
          </div>
        ))}
      </div>

      {/* รอบประเมิน */}
      <div className="mt-6 grid gap-5 min-[1040px]:grid-cols-[380px_1fr] items-start">
        <div className="card-white p-5">
          <p className="font-bold text-navy text-[15px]">รอบประเมินปัจจุบัน</p>
          <p className="text-[12.5px] text-muted mt-0.5">{reviewCycle.period}</p>
          <p className="mt-2 text-[13px]"><span className="font-bold text-amber">{reviewCycle.status}</span> · ครบกำหนด {reviewCycle.due}</p>
          <div className="mt-4 space-y-0">
            {reviewCycle.steps.map((s, i) => (
              <div key={s.name} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <span className={`w-6 h-6 rounded-full text-[11px] font-bold flex items-center justify-center ${
                    s.done ? "bg-brand text-white" : s.current ? "bg-amber text-navy" : "bg-ice text-muted"
                  }`}>{s.done ? "✓" : i + 1}</span>
                  {i < reviewCycle.steps.length - 1 && <span className="w-0.5 h-5 bg-ice" />}
                </div>
                <p className={`text-[13.5px] pt-0.5 ${s.current ? "font-bold text-navy" : "text-muted"}`}>{s.name}</p>
              </div>
            ))}
          </div>
          <SelfReviewAI />
        </div>

        {/* ทีม (สำหรับหัวหน้า/ผู้บริหาร) */}
        <div className="card-white overflow-hidden">
          <p className="px-5 pt-4 pb-2 font-bold text-navy">
            สถานะการประเมินของทีม {!isManager && <span className="text-[11.5px] font-semibold text-muted">(มุมมองหัวหน้า/ผู้บริหาร — เดโมแสดงให้ทุกแผนกดูได้)</span>}
          </p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-[13px]">
              <thead>
                <tr className="bg-ice/70 text-navy">
                  {["พนักงาน", "แผนก", "ประเมินตนเอง", "หัวหน้าประเมิน", "คะแนน"].map((h) => (
                    <th key={h} className="text-left px-4 py-2.5 font-bold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {teamReviews.map((r, i) => (
                  <tr key={r.employee} className={i % 2 ? "bg-ice/30" : ""}>
                    <td className="px-4 py-2.5 font-semibold text-navy">{r.employee}</td>
                    <td className="px-4 py-2.5 text-muted">{r.dept}</td>
                    <td className="px-4 py-2.5">
                      <span className={`text-[11px] font-bold rounded px-2 py-0.5 ${r.self === "ส่งแล้ว" ? "bg-ice text-brand" : "bg-amber/15 text-amber"}`}>{r.self}</span>
                    </td>
                    <td className="px-4 py-2.5 text-muted">{r.manager}</td>
                    <td className="px-4 py-2.5 font-bold text-navy">{r.score}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="px-5 py-3 text-[11.5px] text-muted/70 italic border-t border-ice">
            ระบบจริง: คะแนนเชื่อมโบนัส/แผนพัฒนารายบุคคล และเก็บประวัติทุกครึ่งปี — สิทธิ์เห็นข้อมูลทีมจำกัดเฉพาะหัวหน้าขึ้นไป
          </p>
        </div>
      </div>
    </>
  );
}

export default function KpiPage() {
  return (
    <StaffShell title="KPI / ประเมินผล">
      <KpiBody />
    </StaffShell>
  );
}
