"use client";

// โมดูลประชุม/บันทึกเสียง — อัดเสียงจริง (MediaRecorder) หรืออัปโหลดไฟล์เสียง
// → AI (Gemini) ถอดความ + สรุปประเด็น/มติ/Action Items จริง

import { useRef, useState } from "react";
import StaffShell from "@/components/staff/StaffShell";
import { meetingNotes, meetingAISummary } from "@/lib/staffData";
import { callCopilot } from "@/lib/copilot";

const MAX_AUDIO_MB = 12; // จำกัดขนาดส่งขึ้น AI (เดโม — ระบบจริงแบ่ง chunk ได้)

export default function MeetingsPage() {
  const [recording, setRecording] = useState<"idle" | "rec" | "processing" | "done" | "error">("idle");
  const [seconds, setSeconds] = useState(0);
  const [result, setResult] = useState("");
  const [selected, setSelected] = useState(0);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const transcribe = async (blob: Blob, mime: string) => {
    if (blob.size > MAX_AUDIO_MB * 1024 * 1024) {
      setResult(`ไฟล์เสียงใหญ่เกิน ${MAX_AUDIO_MB}MB — ลองอัดสั้นลงหรือบีบอัดไฟล์ก่อน`);
      setRecording("error");
      return;
    }
    setRecording("processing");
    try {
      const b64 = await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(String(r.result).split(",")[1] ?? "");
        r.onerror = reject;
        r.readAsDataURL(blob);
      });
      const j = await callCopilot({ action: "transcribe_meeting", audio: b64, audioMime: mime });
      setResult(String(j.text ?? ""));
      setRecording("done");
    } catch (e) {
      setResult(String(e));
      setRecording("error");
    }
  };

  const startStop = async () => {
    if (recording === "rec") {
      recRef.current?.stop();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4";
      const rec = new MediaRecorder(stream, { mimeType: mime });
      chunksRef.current = [];
      rec.ondataavailable = (e) => { if (e.data.size) chunksRef.current.push(e.data); };
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        if (timerRef.current) clearInterval(timerRef.current);
        transcribe(new Blob(chunksRef.current, { type: mime }), mime);
      };
      rec.start();
      recRef.current = rec;
      setSeconds(0);
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
      setRecording("rec");
    } catch {
      setResult("ไม่ได้รับอนุญาตใช้ไมโครโฟน — อัปโหลดไฟล์เสียงแทนได้");
      setRecording("error");
    }
  };

  const mmss = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;

  return (
    <StaffShell title="ประชุม / บันทึกเสียง">
      <div className="grid gap-5 min-[1040px]:grid-cols-[360px_1fr] items-start">
        {/* ซ้าย: อัดเสียง + รายการประชุม */}
        <div className="space-y-4">
          <div className="card-white p-5 text-center">
            <p className="font-bold text-navy text-[15px]">อัดเสียงการประชุม <span className="text-[10px] font-bold bg-brand/10 text-brand rounded px-1.5 py-0.5 align-middle">AI จริง</span></p>
            <button
              onClick={startStop}
              disabled={recording === "processing"}
              className={`mt-4 w-20 h-20 rounded-full mx-auto flex items-center justify-center text-3xl transition shadow ${
                recording === "rec" ? "bg-red-500 animate-pulse" : "bg-brand hover:bg-navy"
              } disabled:opacity-60`}
            >
              {recording === "rec" ? "⏹" : "🎙️"}
            </button>
            <p className="mt-3 text-[13px] font-semibold text-navy">
              {recording === "idle" && "กดเพื่อเริ่มอัดเสียงจริง"}
              {recording === "rec" && `● กำลังอัดเสียง... ${mmss} — กดอีกครั้งเพื่อหยุด`}
              {recording === "processing" && "✨ AI กำลังถอดความ + สรุป..."}
              {recording === "done" && "✅ ถอดความเสร็จ — ดูผลด้านขวา"}
              {recording === "error" && "⚠ มีข้อผิดพลาด — ดูรายละเอียดด้านขวา"}
            </p>
            <input ref={fileRef} type="file" accept="audio/*" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) transcribe(f, f.type || "audio/mpeg"); e.target.value = ""; }} />
            <button onClick={() => fileRef.current?.click()} disabled={recording === "rec" || recording === "processing"}
              className="mt-3 text-[12.5px] font-semibold text-sky hover:text-brand disabled:opacity-50">
              📁 หรืออัปโหลดไฟล์เสียง (≤{MAX_AUDIO_MB}MB)
            </button>
            <p className="mt-2 text-[11px] text-muted/70">
              ถอดความไทย/อังกฤษด้วย Gemini — เหมาะกับประชุมสั้น ไฟล์ยาวมากให้แบ่งอัดเป็นช่วง
            </p>
          </div>

          <div className="card-white p-4">
            <p className="font-bold text-navy text-[14px] px-1">บันทึกประชุมล่าสุด (ตัวอย่าง)</p>
            <div className="mt-2 space-y-2">
              {meetingNotes.map((m, i) => (
                <button key={m.id} onClick={() => { setSelected(i); if (recording === "done" || recording === "error") setRecording("idle"); }}
                  className={`w-full text-left rounded-xl border p-3 text-[12.5px] transition ${selected === i && recording === "idle" ? "border-brand bg-ice/40" : "border-ice hover:border-brand"}`}>
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

        {/* ขวา: ผลถอดความจริง หรือ ตัวอย่างบันทึกเดิม */}
        <div className="card-white p-6 min-w-0">
          {recording === "done" || recording === "error" || recording === "processing" ? (
            <>
              <p className="text-[12px] font-bold text-amber">✨ ผลจาก AI (ถอดจากเสียงที่อัด/อัปโหลดจริง)</p>
              {recording === "processing" ? (
                <div className="py-16 text-center text-muted">
                  <p className="text-4xl">⏳</p>
                  <p className="mt-3 text-[14px]">AI กำลังฟังและถอดความ... (เสียงยาวใช้เวลาสักครู่)</p>
                </div>
              ) : recording === "error" ? (
                <p className="mt-3 text-[13px] text-[#D94141] bg-[#D94141]/10 rounded-lg px-3 py-2">⚠ {result}</p>
              ) : (
                <>
                  <div className="mt-2 text-[13.5px] leading-[1.8] text-ink whitespace-pre-wrap">{result}</div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button onClick={() => navigator.clipboard?.writeText(result)} className="btn btn-outline text-[13px] py-2">คัดลอกทั้งหมด</button>
                    <button className="btn btn-primary text-[13px] py-2">บันทึกเป็นบันทึกประชุม (เฟสถัดไป)</button>
                  </div>
                </>
              )}
            </>
          ) : (
            <>
              <div className="flex flex-wrap justify-between gap-2 border-b border-ice pb-3">
                <div>
                  <p className="text-[11px] font-bold text-sky">{meetingNotes[selected].id} · {meetingNotes[selected].date}</p>
                  <h2 className="text-[18px] font-bold text-navy leading-snug">{meetingNotes[selected].title}</h2>
                  <p className="text-[12.5px] text-muted mt-0.5">ผู้เข้าร่วม: {meetingNotes[selected].attendees}</p>
                </div>
              </div>
              <p className="mt-4 text-[12px] font-bold text-amber">✨ สรุปโดย AI (ตัวอย่าง)</p>
              <p className="mt-1.5 text-[14px] leading-[1.8] text-ink">{meetingAISummary.summary}</p>
              <p className="mt-5 text-[13px] font-bold text-navy">Action Items</p>
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
              <p className="mt-3 text-[11px] text-muted/70 italic">รายการนี้เป็นตัวอย่าง — กดอัดเสียงหรืออัปโหลดไฟล์ด้านซ้ายเพื่อใช้ AI ถอดความจริง</p>
            </>
          )}
        </div>
      </div>
    </StaffShell>
  );
}
