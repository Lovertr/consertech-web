"use client";

// โมดูลการลา — ดัดแปลงจาก leave ของ tomas-tech-pm

import StaffShell from "@/components/staff/StaffShell";
import { leaveBalance, leaveRequests } from "@/lib/staffData";

const types = [
  { key: "annual", label: "ลาพักร้อน", ...leaveBalance.annual },
  { key: "sick", label: "ลาป่วย", ...leaveBalance.sick },
  { key: "personal", label: "ลากิจ", ...leaveBalance.personal },
];

export default function LeavePage() {
  return (
    <StaffShell title="การลา">
      <div className="grid gap-4 grid-cols-3 mb-5">
        {types.map((t) => (
          <div key={t.key} className="card-white p-4">
            <p className="text-[12.5px] text-muted">{t.label}</p>
            <p className="text-[20px] font-bold text-navy mt-0.5">{t.total - t.used} <span className="text-[12px] font-semibold text-muted">/ {t.total} วัน</span></p>
            <div className="mt-2 h-1.5 rounded-full bg-ice overflow-hidden">
              <div className="h-full bg-brand rounded-full" style={{ width: `${(t.used / t.total) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-5 min-[1040px]:grid-cols-[360px_1fr] items-start">
        <div className="card-white p-5">
          <p className="font-bold text-navy text-[15px]">ขอลา</p>
          <div className="mt-3 space-y-3 text-[13.5px]">
            <div>
              <label className="block font-semibold text-navy mb-1">ประเภท</label>
              <select className="w-full rounded-lg border border-ice px-3 py-2 bg-white">
                {types.map((t) => <option key={t.key}>{t.label}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block font-semibold text-navy mb-1">ตั้งแต่</label>
                <input type="date" className="w-full rounded-lg border border-ice px-3 py-2" />
              </div>
              <div>
                <label className="block font-semibold text-navy mb-1">ถึง</label>
                <input type="date" className="w-full rounded-lg border border-ice px-3 py-2" />
              </div>
            </div>
            <div>
              <label className="block font-semibold text-navy mb-1">เหตุผล</label>
              <textarea rows={2} className="w-full rounded-lg border border-ice px-3 py-2" />
            </div>
            <button className="btn btn-primary w-full text-[13.5px] py-2">ส่งขออนุมัติ</button>
            <p className="text-[11px] text-muted/70 italic">ระบบจริง: หัวหน้าอนุมัติในระบบ + ลงปฏิทินทีม (Google Calendar) อัตโนมัติ เพื่อไม่ให้ชนนัดติดตั้งหน้างาน</p>
          </div>
        </div>

        <div className="card-white overflow-hidden">
          <p className="px-5 pt-4 pb-2 font-bold text-navy">คำขอลาล่าสุดของทีม</p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-[13px]">
              <thead>
                <tr className="bg-ice/70 text-navy">
                  {["เลขที่", "พนักงาน", "ประเภท", "ช่วงเวลา", "สถานะ"].map((h) => (
                    <th key={h} className="text-left px-4 py-2.5 font-bold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {leaveRequests.map((l, i) => (
                  <tr key={l.no} className={i % 2 ? "bg-ice/30" : ""}>
                    <td className="px-4 py-2.5 font-semibold text-sky">{l.no}</td>
                    <td className="px-4 py-2.5 text-navy">{l.employee}</td>
                    <td className="px-4 py-2.5 text-muted">{l.type}</td>
                    <td className="px-4 py-2.5 text-muted">{l.range}</td>
                    <td className="px-4 py-2.5">
                      <span className={`text-[11px] font-bold rounded px-2 py-0.5 ${l.status === "รออนุมัติ" ? "bg-amber/15 text-amber" : "bg-ice text-brand"}`}>{l.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </StaffShell>
  );
}
