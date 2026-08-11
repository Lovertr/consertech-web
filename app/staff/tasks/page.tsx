"use client";

// โมดูลงานของทีม — เชื่อมฐานข้อมูลจริง: Kanban + กรองแผนก/ค้นหารายคน + รายละเอียดงาน + คอมเมนต์โต้ตอบ

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import StaffShell, { useDept } from "@/components/staff/StaffShell";
import { supabase } from "@/lib/supabase";
import { departments, type Department } from "@/lib/data";

type TaskRow = {
  id: number; title: string; detail: string | null; dept: string;
  assignee: string | null; status: "todo" | "doing" | "done"; due: string | null;
  created_by: string | null; created_at: string; recur: "daily" | "weekly" | "monthly" | null;
};
type CheckItem = { id: number; label: string; done: boolean };
type Attachment = { id: number; name: string; path: string; size_bytes: number | null; uploaded_by: string | null };
type Activity = { id: number; emp_id: string | null; action: string; created_at: string };

const recurLabel: Record<string, string> = { daily: "ทุกวัน", weekly: "ทุกสัปดาห์", monthly: "ทุกเดือน" };

function nextDue(due: string | null, recur: string): string {
  const d = due ? new Date(due + "T00:00:00") : new Date();
  if (recur === "daily") d.setDate(d.getDate() + 1);
  else if (recur === "weekly") d.setDate(d.getDate() + 7);
  else d.setMonth(d.getMonth() + 1);
  return d.toISOString().slice(0, 10);
}
type EmpLite = { id: string; name: string; dept: string };
type CommentRow = { id: number; emp_id: string | null; body: string; created_at: string };

const cols: { key: TaskRow["status"]; label: string }[] = [
  { key: "todo", label: "รอทำ" },
  { key: "doing", label: "กำลังทำ" },
  { key: "done", label: "เสร็จแล้ว" },
];
const deptLabel = (k: string) => departments.find((d) => d.key === k)?.label ?? k;
const fmtD = (s: string | null) => (s ? new Date(s + "T00:00:00").toLocaleDateString("th-TH", { day: "numeric", month: "short" }) : null);
const fmtDT = (s: string) => new Date(s).toLocaleString("th-TH", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

function TasksBody() {
  const { dept: myDept, empId } = useDept();
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [emps, setEmps] = useState<EmpLite[]>([]);
  const [deptFilter, setDeptFilter] = useState<string>("mine");
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<TaskRow | null>(null);
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [newComment, setNewComment] = useState("");
  const [adding, setAdding] = useState(false);
  const [newTask, setNewTask] = useState({ title: "", detail: "", assignee: "", due: "", recur: "" });
  const [checklist, setChecklist] = useState<CheckItem[]>([]);
  const [newCheck, setNewCheck] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [activity, setActivity] = useState<Activity[]>([]);
  const [showActivity, setShowActivity] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [counts, setCounts] = useState<Record<number, { cl: number; clDone: number; cm: number; at: number }>>({});
  const fileRef = useRef<HTMLInputElement>(null);

  // บันทึกประวัติการเปลี่ยนแปลง
  const logAct = useCallback(async (taskId: number, action: string) => {
    if (supabase) await supabase.from("task_activity").insert({ task_id: taskId, emp_id: empId, action });
  }, [empId]);

  const empName = useCallback((id: string | null) => emps.find((e) => e.id === id)?.name ?? "-", [emps]);

  const reload = useCallback(async () => {
    if (!supabase) return;
    const [{ data: ts }, { data: es }] = await Promise.all([
      supabase.from("tasks").select("*").order("due", { ascending: true, nullsFirst: false }),
      supabase.from("employees").select("id,name,dept").order("id"),
    ]);
    if (ts) setTasks(ts as TaskRow[]);
    if (es) setEmps(es);
    // นับ checklist/คอมเมนต์/ไฟล์แนบ ต่อการ์ด
    const [{ data: cls }, { data: cms }, { data: ats }] = await Promise.all([
      supabase.from("task_checklist").select("task_id,done"),
      supabase.from("task_comments").select("task_id"),
      supabase.from("task_attachments").select("task_id"),
    ]);
    const c: Record<number, { cl: number; clDone: number; cm: number; at: number }> = {};
    const ensure = (id: number) => (c[id] ??= { cl: 0, clDone: 0, cm: 0, at: 0 });
    for (const r of cls ?? []) { const e = ensure(r.task_id); e.cl++; if (r.done) e.clDone++; }
    for (const r of cms ?? []) ensure(r.task_id).cm++;
    for (const r of ats ?? []) ensure(r.task_id).at++;
    setCounts(c);
  }, []);
  useEffect(() => { reload(); }, [reload]);

  // โหลดรายละเอียดของงานที่เลือก (คอมเมนต์/Checklist/ไฟล์แนบ/ประวัติ)
  useEffect(() => {
    if (!supabase || !selected) { setComments([]); setChecklist([]); setAttachments([]); setActivity([]); return; }
    const id = selected.id;
    supabase.from("task_comments").select("*").eq("task_id", id).order("created_at")
      .then(({ data }) => setComments((data as CommentRow[]) ?? []));
    supabase.from("task_checklist").select("id,label,done").eq("task_id", id).order("id")
      .then(({ data }) => setChecklist((data as CheckItem[]) ?? []));
    supabase.from("task_attachments").select("*").eq("task_id", id).order("id")
      .then(({ data }) => setAttachments((data as Attachment[]) ?? []));
    supabase.from("task_activity").select("*").eq("task_id", id).order("created_at", { ascending: false }).limit(20)
      .then(({ data }) => setActivity((data as Activity[]) ?? []));
  }, [selected]);

  const refreshActivity = async () => {
    if (!supabase || !selected) return;
    const { data } = await supabase.from("task_activity").select("*").eq("task_id", selected.id).order("created_at", { ascending: false }).limit(20);
    setActivity((data as Activity[]) ?? []);
  };

  // ── กรอง: แผนก + พิมพ์ค้นหา (ชื่อคน / ชื่องาน) ──
  const filtered = useMemo(() => {
    let list = tasks;
    if (deptFilter === "mine") list = list.filter((t) => t.dept === myDept);
    else if (deptFilter !== "all") list = list.filter((t) => t.dept === deptFilter);
    const term = q.trim().toLowerCase();
    if (term) {
      list = list.filter((t) => {
        const an = empName(t.assignee).toLowerCase();
        return an.includes(term) || t.title.toLowerCase().includes(term);
      });
    }
    return list;
  }, [tasks, deptFilter, q, myDept, empName]);

  const move = async (t: TaskRow, dir: 1 | -1) => {
    const order: TaskRow["status"][] = ["todo", "doing", "done"];
    const next = order[order.indexOf(t.status) + dir];
    if (!next || !supabase) return;
    await supabase.from("tasks").update({ status: next }).eq("id", t.id);
    const labels: Record<string, string> = { todo: "รอทำ", doing: "กำลังทำ", done: "เสร็จแล้ว" };
    await logAct(t.id, `เลื่อนสถานะ → ${labels[next]}`);
    // งานซ้ำ: เมื่อเสร็จ สร้างรอบถัดไปอัตโนมัติ
    if (next === "done" && t.recur) {
      const due = nextDue(t.due, t.recur);
      const { data: created } = await supabase.from("tasks").insert({
        title: t.title, detail: t.detail, dept: t.dept, assignee: t.assignee,
        due, recur: t.recur, created_by: t.created_by,
      }).select("id").single();
      if (created) await logAct(created.id, `สร้างอัตโนมัติจากงานซ้ำ (${recurLabel[t.recur]}) ต่อจาก TASK-${t.id}`);
    }
    setSelected((s) => (s && s.id === t.id ? { ...s, status: next } : s));
    reload();
    refreshActivity();
  };

  // ── Checklist ──
  const addCheck = async () => {
    if (!supabase || !selected || !newCheck.trim()) return;
    await supabase.from("task_checklist").insert({ task_id: selected.id, label: newCheck.trim() });
    setNewCheck("");
    const { data } = await supabase.from("task_checklist").select("id,label,done").eq("task_id", selected.id).order("id");
    setChecklist((data as CheckItem[]) ?? []);
    reload();
  };
  const toggleCheck = async (item: CheckItem) => {
    if (!supabase) return;
    setChecklist((cl) => cl.map((c) => (c.id === item.id ? { ...c, done: !c.done } : c)));
    await supabase.from("task_checklist").update({ done: !item.done }).eq("id", item.id);
    reload();
  };

  // ── ไฟล์แนบ ──
  const uploadFile = async (file: File) => {
    if (!supabase || !selected) return;
    setUploading(true);
    const path = `tasks/${selected.id}/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("attachments").upload(path, file);
    if (!error) {
      await supabase.from("task_attachments").insert({
        task_id: selected.id, name: file.name, path, size_bytes: file.size, uploaded_by: empId,
      });
      await logAct(selected.id, `แนบไฟล์ "${file.name}"`);
      const { data } = await supabase.from("task_attachments").select("*").eq("task_id", selected.id).order("id");
      setAttachments((data as Attachment[]) ?? []);
      reload();
      refreshActivity();
    }
    setUploading(false);
  };
  const fileUrl = (path: string) =>
    supabase ? supabase.storage.from("attachments").getPublicUrl(path).data.publicUrl : "#";

  const addTask = async () => {
    if (!supabase || !newTask.title.trim()) return;
    const assignee = newTask.assignee || empId;
    const dept = emps.find((e) => e.id === assignee)?.dept ?? myDept;
    const { data: created } = await supabase.from("tasks").insert({
      title: newTask.title.trim(), detail: newTask.detail.trim() || null,
      dept, assignee, due: newTask.due || null, recur: newTask.recur || null, created_by: empId,
    }).select("id").single();
    if (created) await logAct(created.id, "สร้างงาน");
    setAdding(false);
    setNewTask({ title: "", detail: "", assignee: "", due: "", recur: "" });
    reload();
  };

  const postComment = async () => {
    if (!supabase || !selected || !newComment.trim()) return;
    await supabase.from("task_comments").insert({ task_id: selected.id, emp_id: empId, body: newComment.trim() });
    setNewComment("");
    const { data } = await supabase.from("task_comments").select("*").eq("task_id", selected.id).order("created_at");
    setComments((data as CommentRow[]) ?? []);
  };

  return (
    <>
      {/* ── แถบกรอง ── */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)}
          className="rounded-lg border border-ice px-3 py-2 bg-white text-[13px] max-w-full">
          <option value="mine">แผนกของฉัน ({deptLabel(myDept)})</option>
          <option value="all">ทุกแผนก</option>
          {departments.map((d) => <option key={d.key} value={d.key}>{d.label}</option>)}
        </select>
        <input value={q} onChange={(e) => setQ(e.target.value)}
          placeholder="🔍 พิมพ์ชื่อคนหรือชื่องานเพื่อกรอง..."
          className="rounded-lg border border-ice px-3 py-2 text-[13px] flex-1 min-w-[180px]" />
        {q && <button onClick={() => setQ("")} className="text-[12px] text-muted hover:text-brand font-bold">✕ ล้าง</button>}
        <button onClick={() => setAdding(!adding)} className="btn btn-primary text-[13px] py-2 px-3.5 ml-auto">＋ เพิ่มงาน</button>
      </div>

      {/* ── ฟอร์มเพิ่มงาน ── */}
      {adding && (
        <div className="card-white p-4 mb-4 min-w-0">
          <div className="grid gap-3 min-[700px]:grid-cols-2">
            <input autoFocus placeholder="ชื่องาน..." value={newTask.title}
              onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
              className="rounded-lg border border-ice px-3 py-2 text-[13.5px] min-[700px]:col-span-2" />
            <textarea placeholder="รายละเอียด (ไม่บังคับ)" rows={2} value={newTask.detail}
              onChange={(e) => setNewTask({ ...newTask, detail: e.target.value })}
              className="rounded-lg border border-ice px-3 py-2 text-[13px] min-[700px]:col-span-2" />
            <select value={newTask.assignee} onChange={(e) => setNewTask({ ...newTask, assignee: e.target.value })}
              className="rounded-lg border border-ice px-3 py-2 bg-white text-[13px]">
              <option value="">ผู้รับผิดชอบ: ฉันเอง</option>
              {emps.map((e) => <option key={e.id} value={e.id}>{e.name} — {deptLabel(e.dept)}</option>)}
            </select>
            <input type="date" value={newTask.due} onChange={(e) => setNewTask({ ...newTask, due: e.target.value })}
              className="rounded-lg border border-ice px-3 py-2 text-[13px]" />
            <select value={newTask.recur} onChange={(e) => setNewTask({ ...newTask, recur: e.target.value })}
              className="rounded-lg border border-ice px-3 py-2 bg-white text-[13px] min-[700px]:col-span-2">
              <option value="">งานครั้งเดียว (ไม่ซ้ำ)</option>
              <option value="daily">🔁 งานซ้ำทุกวัน</option>
              <option value="weekly">🔁 งานซ้ำทุกสัปดาห์</option>
              <option value="monthly">🔁 งานซ้ำทุกเดือน</option>
            </select>
          </div>
          <div className="mt-3 flex gap-2">
            <button onClick={addTask} className="btn btn-primary text-[13px] py-2 px-4">บันทึกงาน</button>
            <button onClick={() => setAdding(false)} className="btn btn-outline text-[13px] py-2 px-4">ยกเลิก</button>
          </div>
        </div>
      )}

      {/* ── Kanban ── */}
      <div className="overflow-x-auto pb-2 -mx-1 px-1">
        <div className="flex gap-3 min-w-[760px]">
          {cols.map((c) => {
            const items = filtered.filter((t) => t.status === c.key);
            return (
              <div key={c.key} className="flex-1 min-w-[220px]">
                <p className="text-[12.5px] font-bold text-navy px-1 mb-2">{c.label} <span className="text-sky">({items.length})</span></p>
                <div className="space-y-2">
                  {items.map((t) => (
                    <button key={t.id} onClick={() => setSelected(t)}
                      className={`w-full text-left rounded-xl border bg-white p-3 text-[12.5px] transition ${selected?.id === t.id ? "border-brand shadow-sm" : "border-ice hover:border-brand"}`}>
                      <p className="font-bold text-navy leading-snug">{t.title}</p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px]">
                        <span className="font-semibold text-brand">👤 {empName(t.assignee)}</span>
                        <span className="bg-ice text-sky font-bold rounded px-1.5 py-0.5 text-[10px]">{deptLabel(t.dept)}</span>
                        {t.due && <span className="text-muted">📅 {fmtD(t.due)}</span>}
                        {t.recur && <span className="text-amber font-bold">🔁 {recurLabel[t.recur]}</span>}
                        {(counts[t.id]?.cl ?? 0) > 0 && (
                          <span className={counts[t.id].clDone === counts[t.id].cl ? "text-brand font-bold" : "text-muted"}>
                            ☑ {counts[t.id].clDone}/{counts[t.id].cl}
                          </span>
                        )}
                        {(counts[t.id]?.cm ?? 0) > 0 && <span className="text-muted">💬 {counts[t.id].cm}</span>}
                        {(counts[t.id]?.at ?? 0) > 0 && <span className="text-muted">📎 {counts[t.id].at}</span>}
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

      {/* ── รายละเอียดงาน + คอมเมนต์ ── */}
      {selected && (
        <div className="mt-5 card-white p-4 min-[600px]:p-5 min-w-0">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-bold text-sky">TASK-{selected.id} · {deptLabel(selected.dept)} · มอบหมายโดย {empName(selected.created_by)}</p>
              <h2 className="text-[18px] font-bold text-navy">{selected.title}</h2>
              <p className="text-[13px] text-muted mt-0.5">
                👤 {empName(selected.assignee)}{selected.due ? ` · กำหนด ${fmtD(selected.due)}` : ""}
                {selected.recur && <span className="ml-2 text-[11px] font-bold text-amber">🔁 งานซ้ำ{recurLabel[selected.recur]} — เสร็จแล้วระบบสร้างรอบถัดไปให้อัตโนมัติ</span>}
              </p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {selected.status !== "todo" && (
                <button onClick={() => move(selected, -1)} className="btn btn-outline text-[12px] py-1.5 px-2.5">← ถอยสถานะ</button>
              )}
              {selected.status !== "done" ? (
                <button onClick={() => move(selected, 1)} className="btn btn-primary text-[12px] py-1.5 px-2.5">
                  {selected.status === "todo" ? "เริ่มทำ →" : "✓ เสร็จแล้ว"}
                </button>
              ) : (
                <span className="text-[11px] font-bold bg-brand/10 text-brand rounded px-2 py-1">✓ เสร็จแล้ว</span>
              )}
              <button onClick={() => setSelected(null)} className="text-muted hover:text-navy text-[16px] px-1.5">✕</button>
            </div>
          </div>
          {selected.detail && <p className="mt-3 text-[13.5px] text-ink bg-ice/40 rounded-lg px-3.5 py-2.5 whitespace-pre-wrap">{selected.detail}</p>}

          {/* Checklist ย่อย */}
          <div className="mt-4">
            <h3 className="text-[14px] font-bold text-navy">
              ☑ Checklist {checklist.length > 0 && <span className="text-[12px] font-semibold text-sky">({checklist.filter((c) => c.done).length}/{checklist.length})</span>}
            </h3>
            {checklist.length > 0 && (
              <div className="mt-1.5 h-1.5 rounded-full bg-ice overflow-hidden max-w-[280px]">
                <div className="h-full bg-brand rounded-full transition-all" style={{ width: `${(checklist.filter((c) => c.done).length / checklist.length) * 100}%` }} />
              </div>
            )}
            <div className="mt-2 space-y-1">
              {checklist.map((c) => (
                <label key={c.id} className="flex items-start gap-2.5 text-[13px] py-0.5 cursor-pointer">
                  <input type="checkbox" checked={c.done} onChange={() => toggleCheck(c)} className="mt-0.5" />
                  <span className={c.done ? "text-muted line-through" : "text-ink"}>{c.label}</span>
                </label>
              ))}
            </div>
            <div className="mt-2 flex gap-2 max-w-[420px]">
              <input value={newCheck} onChange={(e) => setNewCheck(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") addCheck(); }}
                placeholder="＋ เพิ่มรายการย่อย แล้วกด Enter..."
                className="flex-1 min-w-0 rounded-lg border border-ice px-3 py-1.5 text-[12.5px]" />
            </div>
          </div>

          {/* ไฟล์แนบ */}
          <div className="mt-4">
            <h3 className="text-[14px] font-bold text-navy">📎 ไฟล์แนบ ({attachments.length})</h3>
            <div className="mt-2 flex flex-wrap gap-2">
              {attachments.map((a) => (
                <a key={a.id} href={fileUrl(a.path)} target="_blank" rel="noreferrer"
                  className="flex items-center gap-1.5 rounded-lg border border-ice bg-ice/30 px-3 py-1.5 text-[12.5px] text-brand hover:border-brand">
                  📄 {a.name}
                  {a.size_bytes != null && <span className="text-muted/70 text-[11px]">({Math.max(1, Math.round(a.size_bytes / 1024))} KB)</span>}
                </a>
              ))}
              <input ref={fileRef} type="file" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadFile(f); e.target.value = ""; }} />
              <button onClick={() => fileRef.current?.click()} disabled={uploading}
                className="rounded-lg border border-dashed border-sky/60 px-3 py-1.5 text-[12.5px] font-semibold text-sky hover:border-brand hover:text-brand disabled:opacity-60">
                {uploading ? "⏳ กำลังอัปโหลด..." : "＋ แนบไฟล์"}
              </button>
            </div>
          </div>

          {/* ประวัติการเปลี่ยนแปลง */}
          <div className="mt-4">
            <button onClick={() => setShowActivity(!showActivity)} className="text-[13px] font-bold text-sky hover:text-brand">
              🕐 ประวัติการเปลี่ยนแปลง ({activity.length}) {showActivity ? "▾" : "▸"}
            </button>
            {showActivity && (
              <div className="mt-2 space-y-1 border-l-2 border-ice pl-3">
                {activity.map((a) => (
                  <p key={a.id} className="text-[12px] text-muted">
                    <span className="font-semibold text-navy">{empName(a.emp_id)}</span> {a.action}
                    <span className="text-muted/60"> · {fmtDT(a.created_at)}</span>
                  </p>
                ))}
                {activity.length === 0 && <p className="text-[12px] text-muted/60">ยังไม่มีประวัติ</p>}
              </div>
            )}
          </div>

          {/* คอมเมนต์โต้ตอบ */}
          <h3 className="mt-4 text-[14px] font-bold text-navy">💬 คอมเมนต์ ({comments.length})</h3>
          <div className="mt-2 space-y-2.5">
            {comments.map((cm) => {
              const mine = cm.emp_id === empId;
              return (
                <div key={cm.id} className={`max-w-[85%] rounded-xl px-3.5 py-2 text-[13px] ${mine ? "ml-auto bg-brand/10" : "bg-ice/60"}`}>
                  <p className="text-[11px] font-bold text-brand">{empName(cm.emp_id)} <span className="text-muted/70 font-normal">· {fmtDT(cm.created_at)}</span></p>
                  <p className="text-ink mt-0.5 whitespace-pre-wrap">{cm.body}</p>
                </div>
              );
            })}
            {comments.length === 0 && <p className="text-[12.5px] text-muted/70">ยังไม่มีคอมเมนต์ — เริ่มคุยเรื่องงานนี้ได้เลย</p>}
          </div>
          <div className="mt-3 flex gap-2">
            <input value={newComment} onChange={(e) => setNewComment(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") postComment(); }}
              placeholder="พิมพ์คอมเมนต์แล้วกด Enter..."
              className="flex-1 min-w-0 rounded-lg border border-ice px-3 py-2 text-[13px]" />
            <button onClick={postComment} disabled={!newComment.trim()} className="btn btn-primary text-[13px] py-2 px-3.5 disabled:opacity-50">ส่ง</button>
          </div>
        </div>
      )}

      <p className="mt-4 text-[11.5px] text-muted/70 italic">
        🟢 งานและคอมเมนต์บันทึกลงฐานข้อมูลจริง — ทุกคนเห็นชุดเดียวกัน · ระบบจริงเพิ่มการแจ้งเตือน (Line/อีเมล) เมื่อถูกมอบหมายงานหรือมีคอมเมนต์ใหม่
      </p>
    </>
  );
}

export default function TasksPage() {
  return (
    <StaffShell title="งานของทีม">
      <TasksBody />
    </StaffShell>
  );
}
