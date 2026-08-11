"use client";

import { useState } from "react";

// ภาพรวมตามแผนก (dummy KPI — รอ data source จริง) ภายใต้ StaffShell เมนูตามสิทธิ์

import { staffDashboards } from "@/lib/data";
import StaffShell, { useDept } from "@/components/staff/StaffShell";
import { callCopilot } from "@/lib/copilot";

// ✨ AI สรุปประจำสัปดาห์ — เรียกจริงจากข้อมูลบนหน้า
function AiWeekly({ data }: { data: { kpis: { label: string; value: string; sub?: string }[]; tableTitle: string; tableHead: string[]; tableRows: string[][] } }) {
  const [st, setSt] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [text, setText] = useState("");
  const run = async () => {
    setSt("loading");
    try {
      const j = await callCopilot({
        action: "weekly_report",
        payload: [
          `KPI: ${data.kpis.map((k) => `${k.label}=${k.value}${k.sub ? ` (${k.sub})` : ""}`).join(" | ")}`,
          `${data.tableTitle}:`,
          data.tableHead.join(" / "),
          ...data.tableRows.map((r) => "- " + r.join(" / ")),
        ].join("\n"),
      });
      setText(String(j.text ?? ""));
      setSt("done");
    } catch (e) { setText(String(e)); setSt("error"); }
  };
  return (
    <div className="mt-5 rounded-xl border border-amber/50 bg-amber/5 p-4 text-[13px]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-bold text-navy">✨ AI สรุปประจำสัปดาห์ <span className="text-[10px] font-bold bg-brand/10 text-brand rounded px-1.5 py-0.5 align-middle">AI จริง</span></p>
        <button onClick={run} disabled={st === "loading"} className="btn btn-amber text-[12px] py-1.5 px-3 disabled:opacity-60">
          {st === "loading" ? "⏳ กำลังสรุป..." : "สร้างสรุปตอนนี้"}
        </button>
      </div>
      {st === "done" && <div className="mt-2 text-ink whitespace-pre-wrap leading-relaxed">{text}</div>}
      {st === "error" && <p className="mt-2 text-[#D94141]">⚠ {text}</p>}
      {st === "idle" && <p className="text-muted mt-1">กดปุ่มเพื่อให้ AI วิเคราะห์ตัวเลขบนหน้านี้และสรุปสิ่งที่ควรสั่งการ — ระบบจริงตั้งเวลาส่งเข้าอีเมล/ไลน์ทุกเช้าวันจันทร์ได้</p>}
    </div>
  );
}

function DashboardBody() {
  const { dept } = useDept();
  const data = staffDashboards[dept];

  return (
    <>
      <div className="grid gap-4 grid-cols-2 min-[1040px]:grid-cols-4">
        {data.kpis.map((k) => (
          <div key={k.label} className="card-white p-5">
            <p className="text-[12.5px] text-muted">{k.label}</p>
            <p className="mt-1 text-[26px] font-bold text-navy leading-none">
              {k.value}
              {k.delta && <span className="ml-2 text-[13px] font-semibold text-amber">{k.delta}</span>}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-5 rounded-[14px] bg-navy text-white px-5 py-4 text-[14px]">
        <span className="text-amber font-bold mr-2">●</span>
        {data.highlight}
      </div>

      <div className="mt-5 card-white overflow-hidden">
        <p className="px-5 pt-4 pb-2 font-bold text-navy">{data.tableTitle}</p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-[13.5px]">
            <thead>
              <tr className="bg-ice/70 text-navy">
                {data.tableHead.map((h) => (
                  <th key={h} className="text-left px-5 py-2.5 font-bold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.tableRows.map((row, ri) => (
                <tr key={ri} className={ri % 2 ? "bg-ice/30" : "bg-white"}>
                  {row.map((cell, ci) => (
                    <td key={ci} className={`px-5 py-3 ${ci === 0 ? "font-semibold text-navy" : "text-muted"}`}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <AiWeekly data={data} />
    </>
  );
}

export default function StaffDashboard() {
  return (
    <StaffShell title="ภาพรวม">
      <DashboardBody />
    </StaffShell>
  );
}
