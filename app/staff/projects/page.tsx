"use client";

// โมดูลโปรเจกต์ — Milestone/งวดจ่าย + Acceptance Test + Ticket ซ่อมบำรุง

import { useState } from "react";
import StaffShell, { useDept } from "@/components/staff/StaffShell";
import { projects, tickets, ganttMonths, ganttRows, knowledgeBase, type Project } from "@/lib/staffData";
import { callCopilot } from "@/lib/copilot";

// Gantt chart อย่างง่าย (จากโมดูล gantt ของ tomas-tech-pm)
function GanttSection() {
  const colW = 100 / ganttMonths.length;
  const barColor = { brand: "bg-brand", amber: "bg-amber", sky: "bg-sky/70" } as const;
  return (
    <div className="mt-5 card-white p-5 overflow-x-auto">
      <p className="font-bold text-navy mb-3">แผนงานรวม (Gantt) — มิ.ย. ถึง ต.ค. 69</p>
      <div className="min-w-[720px]">
        {/* หัวเดือน */}
        <div className="flex text-[11.5px] font-bold text-sky border-b border-ice pb-1.5 ml-[220px]">
          {ganttMonths.map((m) => (
            <div key={m} style={{ width: `${colW}%` }} className="text-center border-l border-ice/60">{m}</div>
          ))}
        </div>
        {/* แถวงาน */}
        <div className="mt-2 space-y-1.5">
          {ganttRows.map((r, i) => (
            <div key={i} className="flex items-center text-[12px]">
              <div className="w-[220px] shrink-0 pr-3">
                <p className="font-semibold text-navy leading-tight truncate">{r.label}</p>
                <p className="text-[10.5px] text-muted/70">{r.project}</p>
              </div>
              <div className="relative flex-1 h-6 rounded bg-ice/40">
                {/* เส้นแบ่งเดือน */}
                {ganttMonths.map((_, mi) => (
                  <span key={mi} className="absolute top-0 bottom-0 border-l border-ice/60" style={{ left: `${mi * colW}%` }} />
                ))}
                <div
                  className={`absolute top-0.5 bottom-0.5 rounded ${barColor[r.color ?? "brand"]}`}
                  style={{ left: `${(r.start / ganttMonths.length) * 100}%`, width: `${(r.span / ganttMonths.length) * 100}%` }}
                >
                  {r.pct > 0 && (
                    <span className="absolute inset-y-0 left-0 bg-navy/25 rounded-l" style={{ width: `${r.pct}%` }} />
                  )}
                  <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white">{r.pct}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>
        {/* เส้นวันนี้ */}
        <p className="mt-3 text-[11px] text-muted/70">
          <span className="inline-block w-2.5 h-2.5 bg-sky/70 rounded-sm mr-1" />เสร็จแล้ว
          <span className="inline-block w-2.5 h-2.5 bg-brand rounded-sm ml-3 mr-1" />กำลังทำ
          <span className="inline-block w-2.5 h-2.5 bg-amber rounded-sm ml-3 mr-1" />รอเริ่ม
          <span className="ml-3">— ระบบจริงลากปรับแผนได้และซิงก์กับ Milestone/งวดจ่ายอัตโนมัติ</span>
        </p>
      </div>
    </div>
  );
}

// ✨ AI ผู้ช่วยวิศวกร — ถาม-ตอบเชิงเทคนิคจริง (แนบคลังความรู้ภายในเป็นบริบท)
function EngineerQA() {
  const [q, setQ] = useState("");
  const [st, setSt] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [a, setA] = useState("");
  const ask = async () => {
    if (!q.trim()) return;
    setSt("loading");
    try {
      const kb = knowledgeBase.map((k) => `- ${k.topic} (แหล่ง: ${k.source})`).join("\n");
      const j = await callCopilot({ action: "engineer_qa", payload: `คลังความรู้ภายใน:\n${kb}\n\nคำถาม: ${q.trim()}` });
      setA(String(j.text ?? ""));
      setSt("done");
    } catch (e) { setA(String(e)); setSt("error"); }
  };
  return (
    <div className="mt-4 rounded-xl border border-amber/50 bg-amber/5 p-3.5 text-[12.5px]">
      <p className="font-bold text-navy">✨ AI ผู้ช่วยวิศวกร <span className="text-[10px] font-bold bg-brand/10 text-brand rounded px-1.5 py-0.5 align-middle">AI จริง</span></p>
      <div className="mt-2 flex gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") ask(); }}
          placeholder="เช่น ตั้งค่า Protective Field ของ PICOSCAN ที่ 1.2 m/s ยังไง?"
          className="flex-1 min-w-0 rounded-lg border border-ice px-3 py-1.5 text-[12.5px] bg-white" />
        <button onClick={ask} disabled={st === "loading"} className="btn btn-amber text-[12px] py-1.5 px-3 disabled:opacity-60 shrink-0">
          {st === "loading" ? "⏳" : "ถาม"}
        </button>
      </div>
      {st === "done" && <div className="mt-2.5 text-ink whitespace-pre-wrap leading-relaxed bg-white rounded-lg border border-ice p-3">{a}</div>}
      {st === "error" && <p className="mt-2 text-[#D94141]">⚠ {a}</p>}
      <p className="mt-1.5 text-[10.5px] text-muted/70">เฟสถัดไป: เชื่อมเอกสาร Master 180 หน้าเข้าฐานความรู้ (RAG) เพื่อตอบตามคู่มือบริษัทโดยตรง</p>
    </div>
  );
}

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
          <EngineerQA />
        </div>
      </div>

      <GanttSection />

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
