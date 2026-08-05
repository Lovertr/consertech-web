"use client";

// ฟอร์มติดต่อ — mock UI ตาม README (ยังไม่ต่อ backend)
// TODO: ต่อ API/อีเมล/CRM เมื่อมีเซิร์ฟเวอร์ + เพิ่ม validation จริง

import { useState } from "react";

const fields = [
  { name: "name", label: "ชื่อ-นามสกุล", type: "text", required: true },
  { name: "companyName", label: "บริษัท", type: "text", required: true },
  { name: "phone", label: "เบอร์โทรศัพท์", type: "tel", required: true },
  { name: "email", label: "อีเมล", type: "email", required: false },
  { name: "product", label: "ประเภทสินค้าที่ลำเลียง", type: "text", required: false },
  { name: "weight", label: "น้ำหนักโดยประมาณ (กก.)", type: "text", required: false },
];

export default function ContactForm() {
  const [sent, setSent] = useState(false);

  if (sent) {
    return (
      <div className="card-white p-8 text-center">
        <p className="text-3xl">✅</p>
        <h3 className="mt-3 text-xl font-bold text-navy">ได้รับข้อมูลแล้ว ขอบคุณครับ</h3>
        <p className="mt-2 text-muted text-sm">
          (เดโม — ยังไม่ส่งข้อมูลจริง) ทีมงานจะติดต่อกลับภายใน 1 วันทำการ
        </p>
      </div>
    );
  }

  return (
    <form
      className="card-white p-7 space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        setSent(true);
      }}
    >
      {fields.map((f) => (
        <div key={f.name}>
          <label className="block text-[13.5px] font-semibold text-navy mb-1" htmlFor={f.name}>
            {f.label} {f.required && <span className="text-amber">*</span>}
          </label>
          <input
            id={f.name}
            name={f.name}
            type={f.type}
            required={f.required}
            className="w-full rounded-xl border border-ice px-4 py-2.5 text-[15px] focus:outline-none focus:border-brand"
          />
        </div>
      ))}
      <div>
        <label className="block text-[13.5px] font-semibold text-navy mb-1" htmlFor="layout">
          แนบผังโรงงาน (ไม่บังคับ)
        </label>
        <input id="layout" type="file" className="w-full text-[13px] text-muted" />
      </div>
      <button type="submit" className="btn btn-primary w-full">ส่งข้อมูล — นัดสำรวจหน้างานฟรี</button>
      <p className="text-[11.5px] text-muted/70">
        การส่งฟอร์มถือว่ายอมรับนโยบายความเป็นส่วนตัว (PDPA — เอกสารอยู่ระหว่างจัดทำ)
      </p>
    </form>
  );
}
