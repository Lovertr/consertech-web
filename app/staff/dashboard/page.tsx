"use client";

// ภาพรวมตามแผนก (dummy KPI — รอ data source จริง) ภายใต้ StaffShell เมนูตามสิทธิ์

import { staffDashboards } from "@/lib/data";
import StaffShell, { useDept } from "@/components/staff/StaffShell";

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

      <div className="mt-5 rounded-xl border border-amber/50 bg-amber/5 p-4 text-[13px]">
        <p className="font-bold text-navy">✨ AI สรุปประจำสัปดาห์ (ตัวอย่าง)</p>
        <p className="text-muted mt-1">
          &ldquo;สัปดาห์นี้มีดีลมูลค่าสูง 2 ดีลรอการตัดสินใจ (A, D) — แนะนำ follow-up ภายในพฤหัส · โปรเจกต์ PJ-2569-02 ใกล้ถึง Acceptance Test ควรเตรียมเอกสาร · ใบแจ้งหนี้ INV-2569-025 ครบกำหนด 8 ส.ค.&rdquo;
          — ระบบจริงส่งสรุปแบบนี้เข้าอีเมล/ไลน์ทุกเช้าวันจันทร์อัตโนมัติ
        </p>
      </div>
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
