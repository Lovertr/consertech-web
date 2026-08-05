"use client";

// Zone C — Department Dashboard (dummy data ทั้งหมด — รอ data source จริงจากแต่ละแผนก)
// department switcher ใน sidebar มีไว้เดโม — production ต้องผูก role ผู้ใช้จริงและลบออก

import Link from "next/link";
import { useEffect, useState } from "react";
import { departments, staffDashboards, type Department } from "@/lib/data";

export default function StaffDashboard() {
  const [dept, setDept] = useState<Department>("sales");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("consertech-staff-dept") as Department | null;
      if (saved && staffDashboards[saved]) setDept(saved);
    } catch {}
  }, []);

  const data = staffDashboards[dept];
  const deptLabel = departments.find((d) => d.key === dept)?.label;

  return (
    <div className="min-h-[80vh] bg-ice/40">
      <div className="container-site py-8 grid gap-6 min-[820px]:grid-cols-[220px_1fr] items-start">
        {/* sidebar — ต่ำกว่า 820px เปลี่ยนเป็นแถบแนวนอน scroll ได้ตาม README */}
        <aside className="card-white p-4 min-[820px]:sticky min-[820px]:top-24">
          <p className="text-[11px] font-bold tracking-widest text-sky uppercase px-2">Departments</p>
          <nav className="mt-2 flex min-[820px]:flex-col gap-1 overflow-x-auto">
            {departments.map((d) => (
              <button
                key={d.key}
                onClick={() => {
                  setDept(d.key);
                  try { localStorage.setItem("consertech-staff-dept", d.key); } catch {}
                }}
                className={`text-left px-3 py-2.5 rounded-lg text-[14px] whitespace-nowrap transition ${
                  d.key === dept ? "bg-brand text-white font-bold" : "text-muted hover:bg-ice"
                }`}
              >
                {d.label}
              </button>
            ))}
          </nav>
          <div className="mt-4 border-t border-ice pt-3 px-2">
            <Link href="/staff" className="text-[13px] text-sky font-semibold hover:text-brand">← ออกจากระบบ</Link>
            <p className="mt-2 text-[10.5px] text-muted/60">* ตัวสลับแผนกมีไว้สำหรับเดโมเท่านั้น</p>
          </div>
        </aside>

        <div>
          <h1 className="text-[24px] min-[900px]:text-[30px] font-bold">Dashboard — {deptLabel}</h1>
          <p className="text-[13px] text-muted">ข้อมูลตัวอย่าง (dummy) — รอเชื่อมต่อ data source จริงของแผนก</p>

          {/* KPI cards */}
          <div className="mt-5 grid gap-4 grid-cols-2 min-[1040px]:grid-cols-4">
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

          {/* highlight */}
          <div className="mt-5 rounded-[14px] bg-navy text-white px-5 py-4 text-[14px]">
            <span className="text-amber font-bold mr-2">●</span>
            {data.highlight}
          </div>

          {/* table */}
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
                        <td key={ci} className={`px-5 py-3 ${ci === 0 ? "font-semibold text-navy" : "text-muted"}`}>
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
