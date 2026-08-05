"use client";

// โมดูลการเงิน — สรุป AR/ใบแจ้งหนี้ + เชื่อม PEAK/FlowAccount (จำลอง)

import StaffShell, { useDept } from "@/components/staff/StaffShell";
import { invoices, financeSummary } from "@/lib/staffData";

const fmt = (n: number) => n.toLocaleString("th-TH");

function FinanceBody() {
  const { access } = useDept();
  const readOnly = access("finance") === "read";

  const cards = [
    { label: "ลูกหนี้คงค้าง (AR)", value: financeSummary.arOutstanding },
    { label: "เกินกำหนดชำระ", value: financeSummary.arOverdue },
    { label: "ออกใบแจ้งหนี้เดือนนี้", value: financeSummary.invoicedThisMonth },
  ];

  return (
    <>
      {readOnly && (
        <p className="mb-3 text-[12.5px] bg-ice text-sky font-semibold rounded-lg px-3 py-2 inline-block">
          👁️ ดูอย่างเดียว — จัดการได้เฉพาะฝ่ายบัญชีการเงิน
        </p>
      )}

      <div className="grid gap-4 grid-cols-2 min-[900px]:grid-cols-3">
        {cards.map((c) => (
          <div key={c.label} className="card-white p-5">
            <p className="text-[12.5px] text-muted">{c.label}</p>
            <p className="mt-1 text-[24px] font-bold text-navy">{c.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-[14px] bg-navy text-white px-5 py-4 text-[13.5px] flex flex-wrap items-center justify-between gap-3">
        <span><span className="text-amber font-bold mr-2">●</span>งวดถัดไปที่จะเรียกเก็บ: {financeSummary.nextMilestoneBilling}</span>
        <button className="btn btn-amber text-[13px] py-2 px-4">เปิดใน PEAK / FlowAccount ↗</button>
      </div>

      <div className="mt-5 card-white overflow-hidden">
        <p className="px-5 pt-4 pb-2 font-bold text-navy">ใบแจ้งหนี้ (sync จากระบบบัญชีในระบบจริง)</p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-[13px]">
            <thead>
              <tr className="bg-ice/70 text-navy">
                {["เลขที่", "ลูกค้า", "โปรเจกต์", "จำนวนเงิน", "สถานะ", "ครบกำหนด"].map((h) => (
                  <th key={h} className="text-left px-4 py-2.5 font-bold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {invoices.map((iv, i) => (
                <tr key={iv.no} className={i % 2 ? "bg-ice/30" : ""}>
                  <td className="px-4 py-2.5 font-semibold text-sky">{iv.no}</td>
                  <td className="px-4 py-2.5 text-navy">{iv.customer}</td>
                  <td className="px-4 py-2.5 text-muted">{iv.project}</td>
                  <td className="px-4 py-2.5 font-semibold text-navy">{fmt(iv.amount)} ฿</td>
                  <td className="px-4 py-2.5">
                    <span className={`text-[11px] font-bold rounded px-2 py-0.5 ${iv.status === "ชำระแล้ว" ? "bg-ice text-brand" : "bg-amber/15 text-amber"}`}>{iv.status}</span>
                  </td>
                  <td className="px-4 py-2.5 text-muted">{iv.due}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="mt-4 text-[12px] text-muted/70 italic">
        แนวทางระบบจริง: งานบัญชี/ภาษีทำใน PEAK หรือ FlowAccount — Portal ดึงสรุปมาแสดงและส่งใบสั่งขายที่อนุมัติแล้วเข้าไปอัตโนมัติ (ตาม Blueprint ข้อ 2)
      </p>
    </>
  );
}

export default function FinancePage() {
  return (
    <StaffShell title="การเงิน">
      <FinanceBody />
    </StaffShell>
  );
}
