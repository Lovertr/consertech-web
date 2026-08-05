"use client";

// โมดูลเบิกค่าใช้จ่าย/เดินทาง — ดัดแปลงจาก personal-vehicle-requests ของ tomas-tech-pm
// CONSERTECH ใช้รถส่วนตัว (ยังไม่มีรถบริษัท) → เบิกตามกิโลเมตร × อัตรากลาง

import { useState } from "react";
import StaffShell from "@/components/staff/StaffShell";
import { expenseClaims, expensePolicy, deals, projects } from "@/lib/staffData";

const fmt = (n: number) => n.toLocaleString("th-TH");

function ClaimForm() {
  const [km, setKm] = useState(120);
  const [toll, setToll] = useState(150);
  const [other, setOther] = useState(0);
  const kmAmount = km * expensePolicy.kmRate;
  const total = kmAmount + toll + other;

  return (
    <div className="card-white p-5">
      <p className="font-bold text-navy text-[15px]">สร้างรายการเบิกใหม่</p>
      <p className="text-[11px] font-bold text-sky mt-0.5">เลขที่ EXP-2569-043 (รันอัตโนมัติ)</p>

      <div className="mt-4 space-y-3 text-[13.5px]">
        <div>
          <label className="block font-semibold text-navy mb-1">วัตถุประสงค์ / งานที่ไป</label>
          <input defaultValue="Site Survey ลูกค้าใหม่" className="w-full rounded-lg border border-ice px-3 py-2" />
        </div>
        <div>
          <label className="block font-semibold text-navy mb-1">อ้างอิงดีล/โปรเจกต์</label>
          <select className="w-full rounded-lg border border-ice px-3 py-2 bg-white">
            {deals.map((d) => <option key={d.id}>{d.id} — {d.customer}</option>)}
            {projects.map((p) => <option key={p.code}>{p.code} — {p.name}</option>)}
          </select>
        </div>
        <div className="rounded-xl bg-ice/50 p-3.5 space-y-2.5">
          <p className="text-[12px] font-bold text-navy">🚗 รถส่วนตัว (อัตรา {expensePolicy.kmRate} ฿/กม.)</p>
          <div className="flex items-center gap-2">
            <label className="text-muted w-28">ระยะทาง (กม.)</label>
            <input type="number" value={km} onChange={(e) => setKm(+e.target.value || 0)}
              className="w-24 rounded-lg border border-ice px-2.5 py-1.5 text-right bg-white" />
            <span className="ml-auto font-semibold text-navy">{fmt(kmAmount)} ฿</span>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-muted w-28">ค่าทางด่วน</label>
            <input type="number" value={toll} onChange={(e) => setToll(+e.target.value || 0)}
              className="w-24 rounded-lg border border-ice px-2.5 py-1.5 text-right bg-white" />
            <span className="ml-auto font-semibold text-navy">{fmt(toll)} ฿</span>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-muted w-28">อื่นๆ (ที่พัก/เบี้ยเลี้ยง)</label>
            <input type="number" value={other} onChange={(e) => setOther(+e.target.value || 0)}
              className="w-24 rounded-lg border border-ice px-2.5 py-1.5 text-right bg-white" />
            <span className="ml-auto font-semibold text-navy">{fmt(other)} ฿</span>
          </div>
        </div>
        <div>
          <label className="block font-semibold text-navy mb-1">แนบใบเสร็จ/หลักฐาน</label>
          <input type="file" multiple className="w-full text-[12.5px] text-muted" />
        </div>
        <div className="flex items-center justify-between border-t border-ice pt-3">
          <span className="text-muted">ยอดเบิกรวม</span>
          <span className="text-[20px] font-bold text-navy">{fmt(total)} ฿</span>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-primary text-[13.5px] py-2 flex-1">ส่งขออนุมัติ</button>
          <button className="btn btn-outline text-[13.5px] py-2">บันทึกร่าง</button>
        </div>
        <p className="text-[11px] text-muted/70 italic">{expensePolicy.note} — อัตรา/กม. เป็นตัวเลขสมมุติ รอบริษัทกำหนดจริง (รองรับเพิ่มรถบริษัท+ระบบจองรถในอนาคต)</p>
      </div>
    </div>
  );
}

export default function ExpensesPage() {
  const pending = expenseClaims.filter((c) => c.status === "รออนุมัติ");
  const monthTotal = expenseClaims.reduce((a, c) => a + c.items.reduce((x, i) => x + i.amount, 0), 0);

  return (
    <StaffShell title="เบิกค่าใช้จ่าย / เดินทาง">
      <div className="grid gap-4 grid-cols-2 min-[900px]:grid-cols-3 mb-5">
        <div className="card-white p-4"><p className="text-[12px] text-muted">ยอดเบิกเดือนนี้ (ทีม)</p><p className="text-[22px] font-bold text-navy">{fmt(monthTotal)} ฿</p></div>
        <div className="card-white p-4"><p className="text-[12px] text-muted">รออนุมัติ</p><p className="text-[22px] font-bold text-amber">{pending.length} รายการ</p></div>
        <div className="card-white p-4"><p className="text-[12px] text-muted">อัตรารถส่วนตัว</p><p className="text-[22px] font-bold text-navy">{expensePolicy.kmRate} ฿/กม.</p></div>
      </div>

      <div className="grid gap-5 min-[1040px]:grid-cols-[380px_1fr] items-start">
        <ClaimForm />

        <div className="card-white overflow-hidden">
          <p className="px-5 pt-4 pb-2 font-bold text-navy">รายการเบิกล่าสุด</p>
          <div className="divide-y divide-ice">
            {expenseClaims.map((c) => {
              const total = c.items.reduce((a, i) => a + i.amount, 0);
              return (
                <div key={c.no} className="px-5 py-3.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-[13.5px] font-bold text-navy">
                        <span className="text-sky">{c.no}</span> · {c.employee} <span className="text-muted font-normal">({c.dept})</span>
                      </p>
                      <p className="text-[12.5px] text-muted mt-0.5">{c.purpose} · อ้างอิง {c.ref} · {c.date}</p>
                      <p className="text-[11.5px] text-muted/70 mt-0.5">{c.items.map((i) => `${i.label} ${fmt(i.amount)}฿`).join(" · ")}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-navy">{fmt(total)} ฿</p>
                      <span className={`inline-block mt-1 text-[10.5px] font-bold rounded px-2 py-0.5 ${
                        c.status === "รออนุมัติ" ? "bg-amber/15 text-amber" : c.status === "ร่าง" ? "bg-ice text-muted" : "bg-ice text-brand"
                      }`}>{c.status}</span>
                      {c.status === "รออนุมัติ" && (
                        <div className="flex gap-1.5 mt-1.5 justify-end">
                          <button className="text-[11px] font-bold text-white bg-brand rounded px-2 py-1">อนุมัติ</button>
                          <button className="text-[11px] font-bold text-muted bg-ice rounded px-2 py-1">ตีกลับ</button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <p className="px-5 py-3 text-[11.5px] text-muted/70 italic border-t border-ice">
            ระบบจริง: รายการที่อนุมัติแล้วส่งเข้าโมดูลการเงิน/PEAK อัตโนมัติ และคำนวณระยะทางจาก Google Maps ได้
          </p>
        </div>
      </div>
    </StaffShell>
  );
}
