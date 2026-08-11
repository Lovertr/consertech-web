"use client";

// โมดูลประชุม — นัดประชุมจริง (วัน/เวลา/ผู้เข้าร่วม) + บันทึกประชุมจริง + อัดเสียง/อัปโหลดให้ AI ถอดความ
// ผลถอดความบันทึกเข้าการประชุมได้จริง

import { useCallback, useEffect, useRef, useState } from "react";
import StaffShell, { useDept } from "@/components/staff/StaffShell";
import { supabase } from "@/lib/supabase";
import { callCopilot } from "@/lib/copilot";

const MAX_AUDIO_MB = 12;

type DbMeeting = {
  id: number; title: string; meet_date: string; meet_time: string | null; duration_min: number;
  location: string | null; ref_doc: string | null; attendees: string[]; agenda: string | null;
  notes: string | null; transcript: string | null; status: string; created_by: string | null; created_at: string;
};
type EmpLite = { id: string; name: string };

const fmtDate = (iso: string) => new Date(iso + "T00:00:00").toLocaleDateString("th-TH", { weekday: "short", day: "numeric", month: "short", year: "2-digit" });
const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

// ── ฟอร์มนัดประชุมใหม่ / แก้ไข ──
function MeetingForm({ emps, empId, meeting, onDone, onCancel }: {
  emps: EmpLite[]; empId: string; meeting: DbMeeting | null; onDone: (id: number) => void; onCancel: () => void;
}) {
  const [title, setTitle] = useState(meeting?.title ?? "");
  const [date, setDate] = useState(meeting?.meet_date ?? todayStr());
  const [time, setTime] = useState(meeting?.meet_time ?? "10:00");
  const [duration, setDuration] = useState(meeting?.duration_min ?? 60);
  const [location, setLocation] = useState(meeting?.location ?? "");
  const [refDoc, setRefDoc] = useState(meeting?.ref_doc ?? "");
  const [agenda, setAgenda] = useState(meeting?.agenda ?? "");
  const [attendees, setAttendees] = useState<string[]>(meeting?.attendees ?? (empId ? [empId] : []));
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const toggleAttendee = (id: string) =>
    setAttendees((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);

  const save = async () => {
    if (!supabase || !title.trim() || !date) { setErr("กรุณาระบุหัวข้อและวันประชุม"); return; }
    setSaving(true); setErr("");
    try {
      const row = {
        title: title.trim(), meet_date: date, meet_time: time || null, duration_min: duration,
        location: location.trim() || null, ref_doc: refDoc.trim() || null,
        attendees, agenda: agenda.trim() || null,
      };
      if (meeting) {
        const { error } = await supabase.from("meetings").update(row).eq("id", meeting.id);
        if (error) throw error;
        onDone(meeting.id);
      } else {
        const { data, error } = await supabase.from("meetings").insert({ ...row, created_by: empId || null }).select("id").single();
        if (error) throw error;
        onDone(data.id);
      }
    } catch (e) {
      setErr(String((e as Error).message ?? e));
      setSaving(false);
    }
  };

  return (
    <div className="card-white p-5 mb-4 border-2 border-brand/30">
      <p className="font-bold text-navy text-[15px]">{meeting ? "แก้ไขนัดประชุม" : "📅 นัดประชุมใหม่"}</p>
      <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="text-[11.5px] font-bold text-muted">หัวข้อประชุม *</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="เช่น Kickoff โปรเจกต์ / Follow-up ลูกค้า A"
            className="mt-1 w-full rounded-lg border border-ice px-3 py-2 text-[13px]" />
        </div>
        <div className="flex gap-2.5">
          <div className="flex-1">
            <label className="text-[11.5px] font-bold text-muted">วันที่ *</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
              className="mt-1 w-full rounded-lg border border-ice px-2.5 py-2 text-[13px]" />
          </div>
          <div>
            <label className="text-[11.5px] font-bold text-muted">เวลา</label>
            <input type="time" value={time} onChange={(e) => setTime(e.target.value)}
              className="mt-1 w-24 rounded-lg border border-ice px-2 py-2 text-[13px]" />
          </div>
          <div>
            <label className="text-[11.5px] font-bold text-muted">นาที</label>
            <input type="number" min={15} step={15} value={duration} onChange={(e) => setDuration(+e.target.value || 60)}
              className="mt-1 w-20 rounded-lg border border-ice px-2 py-2 text-[13px] text-right" />
          </div>
        </div>
        <div>
          <label className="text-[11.5px] font-bold text-muted">สถานที่ / ลิงก์ออนไลน์</label>
          <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="เช่น ห้องประชุม 1 / Google Meet"
            className="mt-1 w-full rounded-lg border border-ice px-3 py-2 text-[13px]" />
        </div>
        <div>
          <label className="text-[11.5px] font-bold text-muted">อ้างอิงดีล/โปรเจกต์</label>
          <input value={refDoc} onChange={(e) => setRefDoc(e.target.value)} placeholder="เช่น D-001 / PJ-2569-01"
            className="mt-1 w-full rounded-lg border border-ice px-3 py-2 text-[13px]" />
        </div>
        <div>
          <label className="text-[11.5px] font-bold text-muted">วาระ/หัวข้อที่จะคุย</label>
          <input value={agenda} onChange={(e) => setAgenda(e.target.value)} placeholder="เช่น สรุปแผนติดตั้ง / ติดตามใบเสนอราคา"
            className="mt-1 w-full rounded-lg border border-ice px-3 py-2 text-[13px]" />
        </div>
        <div className="sm:col-span-2">
          <label className="text-[11.5px] font-bold text-muted">ผู้เข้าร่วม ({attendees.length} คน)</label>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {emps.map((e) => (
              <button key={e.id} onClick={() => toggleAttendee(e.id)}
                className={`text-[12px] font-semibold rounded-lg px-2.5 py-1.5 border transition ${
                  attendees.includes(e.id) ? "bg-brand text-white border-brand" : "bg-white border-ice text-muted hover:border-brand hover:text-brand"
                }`}>
                {attendees.includes(e.id) ? "✓ " : ""}{e.name}
              </button>
            ))}
          </div>
        </div>
      </div>
      {err && <p className="mt-2 text-[12.5px] text-[#D94141]">⚠ {err}</p>}
      <div className="mt-3 flex gap-2">
        <button onClick={save} disabled={saving} className="btn btn-primary text-[13px] py-2 px-4 disabled:opacity-50">
          {saving ? "กำลังบันทึก..." : meeting ? "บันทึกการแก้ไข" : "บันทึกนัดประชุม"}
        </button>
        <button onClick={onCancel} className="btn btn-outline text-[13px] py-2 px-4">ยกเลิก</button>
      </div>
    </div>
  );
}

function MeetingsBody() {
  const { empId } = useDept();
  const [meetings, setMeetings] = useState<DbMeeting[]>([]);
  const [emps, setEmps] = useState<EmpLite[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editMeeting, setEditMeeting] = useState<DbMeeting | null>(null);
  const [notesDraft, setNotesDraft] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);

  // อัดเสียง
  const [recording, setRecording] = useState<"idle" | "rec" | "processing" | "done" | "error">("idle");
  const [seconds, setSeconds] = useState(0);
  const [aiResult, setAiResult] = useState("");
  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const empName = (id: string) => emps.find((e) => e.id === id)?.name ?? id;

  const load = useCallback(async () => {
    if (!supabase) return;
    const [m, e] = await Promise.all([
      supabase.from("meetings").select("*").order("meet_date", { ascending: false }).order("meet_time"),
      supabase.from("employees").select("id,name"),
    ]);
    const list = (m.data as DbMeeting[]) ?? [];
    setMeetings(list);
    setEmps((e.data as EmpLite[]) ?? []);
    setSelectedId((prev) => (prev !== null && list.some((x) => x.id === prev) ? prev : list[0]?.id ?? null));
  }, []);
  useEffect(() => { load(); }, [load]);

  const selected = meetings.find((m) => m.id === selectedId) ?? null;
  useEffect(() => { setNotesDraft(selected?.notes ?? ""); }, [selectedId, selected?.notes]);

  const today = todayStr();
  const upcoming = meetings.filter((m) => m.meet_date >= today && m.status === "นัดแล้ว").sort((a, b) => a.meet_date.localeCompare(b.meet_date) || (a.meet_time ?? "").localeCompare(b.meet_time ?? ""));
  const past = meetings.filter((m) => !(m.meet_date >= today && m.status === "นัดแล้ว"));

  const saveNotes = async () => {
    if (!supabase || !selected) return;
    setSavingNotes(true);
    await supabase.from("meetings").update({ notes: notesDraft.trim() || null, status: "เสร็จสิ้น" }).eq("id", selected.id);
    setSavingNotes(false);
    load();
  };

  const setMeetingStatus = async (m: DbMeeting, status: string) => {
    if (!supabase) return;
    await supabase.from("meetings").update({ status }).eq("id", m.id);
    load();
  };

  const removeMeeting = async (m: DbMeeting) => {
    if (!supabase) return;
    if (!confirm(`ลบการประชุม "${m.title}"?`)) return;
    await supabase.from("meetings").delete().eq("id", m.id);
    load();
  };

  const saveTranscript = async () => {
    if (!supabase || !selected || !aiResult) return;
    await supabase.from("meetings").update({ transcript: aiResult, status: "เสร็จสิ้น" }).eq("id", selected.id);
    setRecording("idle"); setAiResult("");
    load();
  };

  const transcribe = async (blob: Blob, mime: string) => {
    if (blob.size > MAX_AUDIO_MB * 1024 * 1024) {
      setAiResult(`ไฟล์เสียงใหญ่เกิน ${MAX_AUDIO_MB}MB — ลองอัดสั้นลงหรือบีบอัดไฟล์ก่อน`);
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
      setAiResult(String(j.text ?? ""));
      setRecording("done");
    } catch (e) {
      setAiResult(String(e));
      setRecording("error");
    }
  };

  const startStop = async () => {
    if (recording === "rec") { recRef.current?.stop(); return; }
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
      setAiResult("ไม่ได้รับอนุญาตใช้ไมโครโฟน — อัปโหลดไฟล์เสียงแทนได้");
      setRecording("error");
    }
  };

  const mmss = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;

  if (!supabase) {
    return <p className="text-[13px] text-muted bg-ice/50 rounded-lg px-3 py-2 inline-block">⚠ ยังไม่ได้เชื่อมต่อฐานข้อมูล</p>;
  }

  const MeetingRow = ({ m }: { m: DbMeeting }) => (
    <button onClick={() => { setSelectedId(m.id); if (recording === "done" || recording === "error") setRecording("idle"); }}
      className={`w-full text-left rounded-xl border p-3 text-[12.5px] transition ${selectedId === m.id ? "border-brand bg-ice/40" : "border-ice hover:border-brand"}`}>
      <div className="flex justify-between gap-2">
        <p className="font-bold text-navy leading-snug">{m.title}</p>
        <span className={`text-[10px] font-bold rounded px-1.5 py-0.5 h-fit shrink-0 ${
          m.status === "นัดแล้ว" ? "bg-amber/15 text-amber" : m.status === "เสร็จสิ้น" ? "bg-[#2E9E5B]/15 text-[#2E9E5B]" : "bg-ice text-muted"
        }`}>{m.status}</span>
      </div>
      <p className="text-muted mt-0.5">{fmtDate(m.meet_date)}{m.meet_time && ` · ${m.meet_time} น.`}{m.ref_doc && ` · ${m.ref_doc}`}</p>
      <p className="text-[11px] text-sky mt-0.5">👥 {m.attendees.length} คน{m.location && ` · 📍 ${m.location}`}</p>
    </button>
  );

  return (
    <>
      {showForm && (
        <MeetingForm emps={emps} empId={empId} meeting={editMeeting}
          onDone={(id) => { setShowForm(false); setEditMeeting(null); setSelectedId(id); load(); }}
          onCancel={() => { setShowForm(false); setEditMeeting(null); }} />
      )}
      <div className="grid gap-5 min-[1040px]:grid-cols-[360px_1fr] items-start">
        {/* ซ้าย: นัดใหม่ + อัดเสียง + รายการประชุม */}
        <div className="space-y-4 min-w-0">
          {!showForm && (
            <button onClick={() => { setEditMeeting(null); setShowForm(true); }} className="btn btn-primary w-full text-[14px] py-2.5">
              📅 นัดประชุมใหม่ + เลือกผู้เข้าร่วม
            </button>
          )}

          <div className="card-white p-5 text-center">
            <p className="font-bold text-navy text-[15px]">อัดเสียงการประชุม <span className="text-[10px] font-bold bg-brand/10 text-brand rounded px-1.5 py-0.5 align-middle">AI จริง</span></p>
            <p className="text-[11.5px] text-muted mt-0.5">{selected ? `บันทึกเข้า: ${selected.title}` : "เลือกการประชุมก่อนอัด"}</p>
            <button
              onClick={startStop}
              disabled={recording === "processing" || !selected}
              className={`mt-3 w-20 h-20 rounded-full mx-auto flex items-center justify-center text-3xl transition shadow ${
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
            <button onClick={() => fileRef.current?.click()} disabled={recording === "rec" || recording === "processing" || !selected}
              className="mt-2 text-[12.5px] font-semibold text-sky hover:text-brand disabled:opacity-50">
              📁 หรืออัปโหลดไฟล์เสียง (≤{MAX_AUDIO_MB}MB)
            </button>
          </div>

          {upcoming.length > 0 && (
            <div className="card-white p-4">
              <p className="font-bold text-navy text-[14px] px-1">📅 นัดประชุมที่จะถึง ({upcoming.length})</p>
              <div className="mt-2 space-y-2">{upcoming.map((m) => <MeetingRow key={m.id} m={m} />)}</div>
            </div>
          )}
          <div className="card-white p-4">
            <p className="font-bold text-navy text-[14px] px-1">บันทึกประชุมที่ผ่านมา ({past.length})</p>
            <div className="mt-2 space-y-2 max-h-[380px] overflow-y-auto pr-1">
              {past.map((m) => <MeetingRow key={m.id} m={m} />)}
              {past.length === 0 && <p className="text-[12.5px] text-muted/70 px-1">ยังไม่มี</p>}
            </div>
          </div>
        </div>

        {/* ขวา: รายละเอียด + ผล AI + บันทึกประชุม */}
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
                <p className="mt-3 text-[13px] text-[#D94141] bg-[#D94141]/10 rounded-lg px-3 py-2">⚠ {aiResult}</p>
              ) : (
                <>
                  <div className="mt-2 text-[13.5px] leading-[1.8] text-ink whitespace-pre-wrap max-h-[420px] overflow-y-auto">{aiResult}</div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button onClick={saveTranscript} className="btn btn-primary text-[13px] py-2">💾 บันทึกเข้าการประชุมนี้</button>
                    <button onClick={() => navigator.clipboard?.writeText(aiResult)} className="btn btn-outline text-[13px] py-2">คัดลอกทั้งหมด</button>
                    <button onClick={() => setRecording("idle")} className="text-[12.5px] text-muted hover:text-navy px-2">ปิดผลนี้</button>
                  </div>
                </>
              )}
            </>
          ) : selected ? (
            <>
              <div className="flex flex-wrap justify-between gap-2 border-b border-ice pb-3">
                <div>
                  <p className="text-[11px] font-bold text-sky">MT-{String(selected.id).padStart(3, "0")} · {fmtDate(selected.meet_date)}{selected.meet_time && ` · ${selected.meet_time} น.`} ({selected.duration_min} นาที)</p>
                  <h2 className="text-[18px] font-bold text-navy leading-snug">{selected.title}</h2>
                  <p className="text-[12.5px] text-muted mt-0.5">
                    ผู้เข้าร่วม: {selected.attendees.map(empName).join(", ") || "-"}
                    {selected.location && ` · 📍 ${selected.location}`}
                    {selected.ref_doc && ` · อ้างอิง ${selected.ref_doc}`}
                  </p>
                </div>
                <div className="flex gap-1.5 h-fit">
                  <button onClick={() => { setEditMeeting(selected); setShowForm(true); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                    className="text-[11.5px] font-bold bg-ice text-navy rounded px-2 py-1 hover:bg-sky/20">✎ แก้ไขนัด</button>
                  {selected.status === "นัดแล้ว" && (
                    <button onClick={() => setMeetingStatus(selected, "ยกเลิก")} className="text-[11.5px] font-bold bg-ice text-muted rounded px-2 py-1 hover:bg-[#D94141]/10 hover:text-[#D94141]">ยกเลิกนัด</button>
                  )}
                  <button onClick={() => removeMeeting(selected)} className="text-[11.5px] font-bold bg-ice text-muted rounded px-2 py-1 hover:bg-[#D94141]/10 hover:text-[#D94141]">🗑</button>
                </div>
              </div>

              {selected.agenda && (
                <p className="mt-3 text-[13px] bg-ice/50 rounded-lg px-3 py-2"><strong className="text-navy">วาระ:</strong> {selected.agenda}</p>
              )}

              {selected.transcript && (
                <>
                  <p className="mt-4 text-[12px] font-bold text-amber">✨ ถอดความโดย AI</p>
                  <div className="mt-1.5 text-[13px] leading-[1.75] text-ink whitespace-pre-wrap bg-amber/5 border border-amber/30 rounded-xl p-3.5 max-h-72 overflow-y-auto">{selected.transcript}</div>
                </>
              )}

              <p className="mt-4 text-[13px] font-bold text-navy">📝 บันทึกประชุม / สรุปประเด็น</p>
              <textarea value={notesDraft} onChange={(e) => setNotesDraft(e.target.value)} rows={7}
                placeholder="พิมพ์สรุปประเด็น มติ และ Action Items ของการประชุมนี้..."
                className="mt-1.5 w-full rounded-xl border border-ice px-3.5 py-2.5 text-[13.5px] leading-relaxed" />
              <div className="mt-2 flex flex-wrap gap-2">
                <button onClick={saveNotes} disabled={savingNotes || notesDraft === (selected.notes ?? "")}
                  className="btn btn-primary text-[13px] py-2 disabled:opacity-50">
                  {savingNotes ? "กำลังบันทึก..." : "บันทึก (ปิดประชุม)"}
                </button>
                <p className="text-[11.5px] text-muted/70 self-center">บันทึกแล้วสถานะจะเป็น &ldquo;เสร็จสิ้น&rdquo; · อัดเสียงด้านซ้ายเพื่อให้ AI ถอดความเพิ่มได้</p>
              </div>
            </>
          ) : (
            <div className="py-20 text-center text-muted">
              <p className="text-4xl">📅</p>
              <p className="mt-3 text-[14px]">ยังไม่มีการประชุม — กด &ldquo;นัดประชุมใหม่&rdquo; เพื่อเริ่มต้น</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default function MeetingsPage() {
  return (
    <StaffShell title="ประชุม / บันทึกเสียง">
      <MeetingsBody />
    </StaffShell>
  );
}
