"use client";

// โมดูลประชุม/บันทึกเสียง — จาก meeting-notes + ai/transcribe-audio + ai/extract-meeting ของ tomas-tech-pm
// อัดเสียง → AI ถอดความ → สรุปประเด็น + แตก Action item เป็นงานอัตโนมัติ

import { useState } from "react";
import StaffShell from "@/components/staff/StaffShell";
import { meetingNotes, meetingAISummary } from "@/lib/staffData";

export default function MeetingsPage() {
  const [recording, setRecording] = useState<"idle" | "rec" | "processing" | "done">("idle");
  const [selected, setSelected] = useState(0);

  const startDemo = () => {
    setRecording("rec");
    setTimeout(() => setRecording("processing"), 1500);
    setTimeout(() => setRecording("done"), 3200);
  };

  return (
    <StaffShell title="ประชุม / บันทึกเสียง">
      <div className="grid gap-5 min-[1040px]:grid-cols-[360px_1fr] items-start">
        {/* ซ้าย: อัดเสียง + รายการประชุม */}
        <div className="space-y-4">
          <div className="card-white p-5 text-center">
            <p className="font-bold text-navy text-[15px]">อัดเสียงการประชุม</p>
            <button
              onClick={startDemo}
              disabled={recording === "rec" || recording === "processing"}
              className={`mt-4 w-20 h-20 rounded-full mx-auto flex items-center justify-center text-3xl transition shadow ${
                recording === "rec" ? "bg-red-500 animate-pulse" : "bg-brand hover:bg-navy"
              }`}
            >
              🎙️
            </button>
            <p className="mt-3 text-[13px] font-semibold text-navy">
              {recording === "idle" && "กดเพื่อเริ่มอัด (เดโม)"}
              {recording === "rec" && "● กำลังอัดเสียง... 00:03"}
              {recording === "processing" && "✨ AI กำลังถอดความ + สรุป..."}
              {recording === "done" && "✅ ถอดความเสร็จ — ดูสรุปด้านขวา"}
            </p>
            <p className="mt-2 text-[11px] text-muted/70">
              ระบบจริง: รองรับไฟล์ยาว อัปโหลดย้อนหลังได้ ถอดความไทย/อังกฤษ ผูกกับดีล/โปรเจกต์
            </p>
          </div>

          <div className="card-white p-4">
            <p className="font-bold text-navy text-[14px] px-1">บันทึกประชุมล่าสุด</p>
            <div className="mt-2 space-y-2">
              {meetingNotes.map((m, i) => (
                <button key={m.id} onClick={() => setSelected(i)}
                  className={`w-full text-left rounded-xl border p-3 text-[12.5px] transition ${selected === i ? "border-brand bg-ice/40" : "border-ice hover:border-brand"}`}>
                  <p className="font-bold text-navy leading-snug">{m.title}</p>
                  <p className="text-muted mt-0.5">{m.date} · อ้างอิง {m.ref}</p>
                  <p className="text-[11px] mt-1">
                    <span className={m.hasAI ? "text-amber font-semibold" : "text-muted/70"}>{m.source}</span>
                  </p>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ขวา: สรุปโดย AI */}
        <div className="card-white p-6">
          <div className="flex flex-wrap justify-between gap-2 border-b border-ice pb-3">
            <div>
              <p className="text-[11px] font-bold text-sky">{meetingNotes[selected].id} · {meetingNotes[selected].date}</p>
              <h2 className="text-[18px] font-bold text-navy leading-snug">{meetingNotes[selected].title}</h2>
              <p className="text-[12.5px] text-muted mt-0.5">ผู้เข้าร่วม: {meetingNotes[selected].attendees}</p>
            </div>
            <button className="btn btn-outline text-[12.5px] py-1.5 px-3 h-fit">เปิดคำถอดความเต็ม</button>
          </div>

          <p className="mt-4 text-[12px] font-bold text-amber">✨ สรุปโดย AI</p>
          <p className="mt-1.5 text-[14px] leading-[1.8] text-ink">{meetingAISummary.summary}</p>

          <p className="mt-5 text-[13px] font-bold text-navy">Action Items (AI แตกจากบทสนทนา → สร้างเป็นงานอัตโนมัติ)</p>
          <div className="mt-2 space-y-2">
            {meetingAISummary.actions.map((a, i) => (
              <div key={i} className="flex items-start gap-3 rounded-xl border border-ice p-3 text-[13px]">
                <span className="w-5 h-5 rounded bg-brand text-white text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                <div className="flex-1">
                  <p className="font-semibold text-navy">{a.task}</p>
                  <p className="text-[12px] text-muted mt-0.5">👤 {a.owner} · ⏰ {a.due}</p>
                </div>
                <span className="text-[11px] font-bold text-sky bg-ice rounded px-2 py-1 shrink-0">{a.linked}</span>
              </div>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button className="btn btn-primary text-[13px] py-2">ส่งสรุปให้ผู้เข้าร่วม (อีเมล/Line)</button>
            <button className="btn btn-outline text-[13px] py-2">แนบเข้าโปรเจกต์ {meetingNotes[selected].ref}</button>
          </div>
          <p className="mt-3 text-[11px] text-muted/70 italic">* เนื้อหาจำลองเพื่อเดโม — ระบบจริงใช้ AI ถอดความจากไฟล์เสียงจริงและซิงก์งานเข้าโมดูลงานของทีม</p>
        </div>
      </div>
    </StaffShell>
  );
}
