"use client";

// โมดูลงานของทีม — Kanban board ดัดแปลงจาก tasks/board + my-tasks ของ tomas-tech-pm

import StaffShell from "@/components/staff/StaffShell";
import { taskBoard } from "@/lib/staffData";

const prColor: Record<string, string> = { "สูง": "bg-amber/15 text-amber", "กลาง": "bg-ice text-sky", "ต่ำ": "bg-ice text-muted" };

export default function TasksPage() {
  return (
    <StaffShell title="งานของทีม">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <p className="text-[13px] text-muted">มุมมองรวมทุกแผนก — ระบบจริงมี &ldquo;งานของฉัน&rdquo;, งานประจำ (Recurring), Checklist และการแจ้งเตือนครบ</p>
        <button className="btn btn-primary text-[13px] py-2 px-3.5">＋ เพิ่มงาน</button>
      </div>

      <div className="overflow-x-auto pb-2 -mx-1 px-1">
        <div className="flex gap-3 min-w-[860px]">
          {taskBoard.map((col) => (
            <div key={col.column} className="flex-1 min-w-[200px]">
              <p className="text-[12.5px] font-bold text-navy px-1 mb-2">
                {col.column} <span className="text-sky">({col.tasks.length})</span>
              </p>
              <div className="space-y-2">
                {col.tasks.map((t) => (
                  <div key={t.id} className="rounded-xl border border-ice bg-white p-3 text-[12.5px] hover:border-brand transition">
                    <div className="flex justify-between items-start gap-2">
                      <p className="font-bold text-navy leading-snug">{t.title}</p>
                      <span className={`shrink-0 text-[10px] font-bold rounded px-1.5 py-0.5 ${prColor[t.priority]}`}>{t.priority}</span>
                    </div>
                    <p className="text-[11.5px] text-muted mt-1.5">
                      <span className="text-sky font-semibold">{t.id}</span> · {t.project}
                    </p>
                    <div className="flex justify-between text-[11.5px] text-muted/80 mt-1">
                      <span>👤 {t.assignee}</span>
                      <span>{t.due !== "-" ? `⏰ ${t.due}` : ""}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-5 rounded-xl border border-amber/50 bg-amber/5 p-4 text-[13px]">
        <p className="font-bold text-navy">✨ AI Standup (ตัวอย่างจาก tomas-tech-pm)</p>
        <p className="text-muted mt-1">
          &ldquo;วันนี้ทีมมีงานเร่ง 3 งาน: ตั้งค่า Virtual Path ไซต์ A (พุธ), ทดสอบ Failover ไซต์ B (พฤหัส), เอกสาร Acceptance ไซต์ B (ศุกร์)
          — งาน T-196 รอรีวิวเกิน 2 วันแล้ว ควรเร่งตรวจ&rdquo; — ระบบจริงสรุปให้อัตโนมัติทุกเช้า
        </p>
      </div>
    </StaffShell>
  );
}
