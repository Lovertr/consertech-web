"use client";

// โมดูลงานของทีม — เชื่อมฐานข้อมูลจริง: Kanban + กรองแผนก/ค้นหารายคน + รายละเอียดงาน + คอมเมนต์โต้ตอบ

import { useCallback, useEffect, useMemo, useState } from "react";
import StaffShell, { useDept } from "@/components/staff/StaffShell";
import { supabase } from "@/lib/supabase";
import { departments, type Department } from "@/lib/data";

type TaskRow = {
  id: number; title: string; detail: string | null; dept: string;
  assignee: string | null; status: "todo" | "doing" | "done"; due: string | null;
  created_by: string | null; created_at: string;
};
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
  const [newTask, setNewTask] = useState({ title: "", detail: "", assignee: "", due: "" });

  const empName = useCallback((id: string | null) => emps.find((e) => e.id === id)?.name ?? "-", [emps]);

  const reload = useCallback(async () => {
    if (!supabase) return;
    const [{ data: ts }, { data: es }] = await Promise.all([
      supabase.from("tasks").select("*").order("due", { ascending: true, nullsFirst: false }),
      supabase.from("employees").select("id,name,dept").order("id"),
    ]);
    if (ts) setTasks(ts as TaskRow[]);
    if (es) setEmps(es);
  }, []);
  useEffect(() => { reload(); }, [reload]);

  // โหลดคอมเมนต์ของงานที่เลือก
  useEffect(() => {
    if (!supabase || !selected) { setComments([]); return; }
    supabase.from("task_comments").select("*").eq("task_id", selected.id).order("created_at")
      .then(({ data }) => setComments((data as CommentRow[]) ?? []));
  }, [selected]);

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
    setSelected((s) => (s && s.id === t.id ? { ...s, status: next } : s));
    reload();
  };

  const addTask = async () => {
    if (!supabase || !newTask.title.trim()) return;
    const assignee = newTask.assignee || empId;
    const dept = emps.find((e) => e.id === assignee)?.dept ?? myDept;
    await supabase.from("tasks").insert({
      title: newTask.title.trim(), detail: newTask.detail.trim() || null,
      dept, assignee, due: newTask.due || null, created_by: empId,
    });
    setAdding(false);
    setNewTask({ title: "", detail: "", assignee: "", due: "" });
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
              <p className="text-[13px] text-muted mt-0.5">👤 {empName(selected.assignee)}{selected.due ? ` · กำหนด ${fmtD(selected.due)}` : ""}</p>
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
