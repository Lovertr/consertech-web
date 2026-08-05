"use client";

// โมดูลโปรเจกต์ — Milestone/งวดจ่าย + Acceptance Test + Ticket ซ่อมบำรุง

import { useState } from "react";
import StaffShell, { useDept } from "@/components/staff/StaffShell";
import { projects, tickets, type Project } from "@/lib/staffData";

function ProjectsBody() {
  const [selected, setSelected] = useState<Project>(projects[0]);
  const { access } = useDept();
  const readOnly = access("projects") === "read";

  return (
    <>
      {readOnly && (
        <p className="mb-3 text-[12.5px] bg-ice text-sky font-semibold rounded-lg px-3 py-2 inline-block">
          👁️ ดูอย่างเดียว — จัดการได้เฉพาะฝ่ายวิศวกรรม / PM
        </p>
      )}

      <div className="grid gap-4 min-[900px]:grid-cols-3">
        {projects.map((p) => (
          <button key={p.code} onClick={() => setSelected(p)}
            className={`text-left card-white p-4 transition ${selected.code === p.code ? "!border-brand shadow-sm" : ""}`}>
            <div className="flex justify-between text-[11px] font-bold">
              <span className="text-sky">{p.code}</span>
              <span className={`rounded px-1.5 py-0.5 ${p.status === "ติดตั้ง" ? "bg-amber/15 text-amber" : p.status === "ทดสอบ" ? "bg-ice text-brand" : "bg-ice text-muted"}`}>{p.status}</span>
            </div>
            <p className="mt-1.5 font-bold text-navy text-[14px] leading-snug">{p.name}</p>
            <p className="text-[12px] text-muted">{p.customer} · {p.pm}</p>
            <div className="mt-2.5 flex items-center gap-2">
              <div className="flex-1 h-1.5 rounded-full bg-ice overflow-hidden">
                <div className="h-full bg-brand rounded-full" style={{ width: `${p.progress}%` }} />
              </div>
              <span className="text-[11.5px] font-bold text-brand">{p.progress}%</span>
            </div>
          </button>
        ))}
      </div>

      <div className="mt-5 grid gap-5 min-[1040px]:grid-cols-2 items-start">
        {/* Milestones */}
        <div className="card-white p-5">
          <h3 className="font-bold text-navy text-[15px]">Milestone / งวดจ่าย — {selected.code}</h3>
          <div className="mt-3 space-y-2.5">
            {selected.milestones.map((m, i) => (
              <div key={i} className={`flex items-center gap-3 rounded-lg border p-3 text-[13px] ${m.done ? "border-ice bg-ice/40" : "border-dashed border-ice"}`}>
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[12px] font-bold shrink-0 ${m.done ? "bg-brand text-white" : "bg-ice text-muted"}`}>
                  {m.done ? "✓" : i + 1}
                </span>
                <div className="flex-1">
                  <p className={`font-semibold ${m.done ? "text-navy" : "text-muted"}`}>{m.name}</p>
                  {m.invoice && <p className="text-[11px] text-sky">→ ออกใบแจ้งหนี้ {m.invoice} แล้ว (ส่งเข้า PEAK อัตโนมัติในระบบจริง)</p>}
                </div>
                <span className="text-[12px] font-bold text-amber shrink-0">{m.pct}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Acceptance */}
        <div className="card-white p-5">
          <h3 className="font-bold text-navy text-[15px]">Acceptance Test Checklist</h3>
          <div className="mt-3 space-y-1.5">
            {selected.acceptance.map((a, i) => (
              <label key={i} className="flex items-start gap-2.5 text-[13px] py-1">
                <input type="checkbox" checked={a.done} disabled={readOnly} readOnly className="mt-0.5" />
                <span className={a.done ? "text-ink" : "text-muted"}>{a.item}</span>
              </label>
            ))}
          </div>
          {!readOnly && (
            <button className="btn btn-outline text-[13px] py-2 mt-3">＋ เพิ่มเกณฑ์ทดสอบ (จาก Template TPL-AT)</button>
          )}
          <div className="mt-4 rounded-xl border border-amber/50 bg-amber/5 p-3.5 text-[12.5px]">
            <p className="font-bold text-navy">✨ AI ผู้ช่วยวิศวกร</p>
            <p className="text-muted mt-1">&ldquo;ถามจากคู่มือ: ตั้งค่า Protective Field ของ PICOSCAN สำหรับความเร็ว 1.2 m/s ยังไง?&rdquo; — ระบบจริงตอบจากเอกสาร Master 180 หน้าได้ทันที</p>
          </div>
        </div>
      </div>

      {/* Tickets */}
      <div className="mt-5 card-white overflow-hidden">
        <p className="px-5 pt-4 pb-2 font-bold text-navy">Ticket ซ่อมบำรุง / บริการหลังการขาย</p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-[13px]">
            <thead>
              <tr className="bg-ice/70 text-navy">
                {["Ticket", "ไซต์งาน", "งาน", "ผู้รับผิดชอบ", "กำหนด", "สถานะ"].map((h) => (
                  <th key={h} className="text-left px-4 py-2.5 font-bold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tickets.map((t, i) => (
                <tr key={t.no} className={i % 2 ? "bg-ice/30" : ""}>
                  <td className="px-4 py-2.5 font-semibold text-sky">{t.no}</td>
                  <td className="px-4 py-2.5 text-navy">{t.site}</td>
                  <td className="px-4 py-2.5 text-muted">{t.issue}</td>
                  <td className="px-4 py-2.5 text-muted">{t.assignee}</td>
                  <td className="px-4 py-2.5 text-muted">{t.due}</td>
                  <td className="px-4 py-2.5">
                    <span className={`text-[11px] font-bold rounded px-2 py-0.5 ${t.status === "ปิด" ? "bg-ice text-muted" : "bg-amber/15 text-amber"}`}>{t.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

export default function ProjectsPage() {
  return (
    <StaffShell title="โปรเจกต์">
      <ProjectsBody />
    </StaffShell>
  );
}
