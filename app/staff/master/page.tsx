"use client";

// โมดูลข้อมูล Master — สินค้า/อุปกรณ์, รุ่นรถ AGV, Template เอกสาร, ฐานความรู้
// ราคากลางแสดงเฉพาะแผนกที่มีสิทธิ์ (ตาม Permission Matrix)

import { useState } from "react";
import StaffShell, { useDept } from "@/components/staff/StaffShell";
import { products, agvModels, docTemplates, knowledgeBase } from "@/lib/staffData";

const fmt = (n: number) => n.toLocaleString("th-TH");
const tabs = ["สินค้า/อุปกรณ์", "รุ่นรถ AGV", "Template เอกสาร", "ฐานความรู้"] as const;

function MasterBody() {
  const [tab, setTab] = useState<(typeof tabs)[number]>("สินค้า/อุปกรณ์");
  const { dept, access } = useDept();
  const readOnly = access("master") === "read";
  const canSeePrice = dept === "sales" || dept === "admin" || dept === "management"; // ราคากลาง: ตามสิทธิ์

  return (
    <>
      <div className="flex gap-1 mb-4 bg-ice rounded-xl p-1 w-fit flex-wrap">
        {tabs.map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-3.5 py-2 rounded-lg text-[13px] font-semibold transition ${tab === t ? "bg-white text-navy shadow-sm" : "text-muted"}`}>
            {t}
          </button>
        ))}
      </div>
      <p className="mb-3 text-[12px] text-muted">
        แก้ที่เดียว ใช้ทั้งระบบ: เว็บ · ใบเสนอราคา · Proposal · AI — {readOnly ? "แผนกของคุณดูได้อย่างเดียว" : "แผนกของคุณแก้ไขได้"}
        {!canSeePrice && " · ราคากลางถูกซ่อนตามสิทธิ์"}
      </p>

      {tab === "สินค้า/อุปกรณ์" && (
        <div className="card-white overflow-hidden">
          <div className="flex justify-between items-center px-5 pt-4 pb-2">
            <p className="font-bold text-navy">สินค้าและอุปกรณ์ ({products.length} รายการ)</p>
            {!readOnly && <button className="btn btn-primary text-[12.5px] py-1.5 px-3">＋ เพิ่มรายการ</button>}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-[13px]">
              <thead>
                <tr className="bg-ice/70 text-navy">
                  <th className="text-left px-4 py-2.5 font-bold">รหัส</th>
                  <th className="text-left px-4 py-2.5 font-bold">ชื่อรายการ</th>
                  <th className="text-left px-4 py-2.5 font-bold">หมวด</th>
                  <th className="text-right px-4 py-2.5 font-bold">ราคากลาง (สมมุติ)</th>
                  <th className="text-right px-4 py-2.5 font-bold">สต็อก</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p, i) => (
                  <tr key={p.code} className={i % 2 ? "bg-ice/30" : ""}>
                    <td className="px-4 py-2.5 font-semibold text-sky">{p.code}</td>
                    <td className="px-4 py-2.5 text-navy">{p.name}</td>
                    <td className="px-4 py-2.5 text-muted">{p.category}</td>
                    <td className="px-4 py-2.5 text-right font-semibold text-navy">
                      {canSeePrice ? `${fmt(p.price)} ฿/${p.unit}` : <span className="text-muted/50">••••• (ตามสิทธิ์)</span>}
                    </td>
                    <td className="px-4 py-2.5 text-right text-muted">{p.stock ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "รุ่นรถ AGV" && (
        <div className="grid gap-4 min-[900px]:grid-cols-2">
          {agvModels.map((m) => (
            <div key={m.code} className="card-white p-4 text-[13.5px]">
              <div className="flex justify-between">
                <p className="font-bold text-navy">{m.name}</p>
                <span className="text-[11px] font-bold bg-ice text-brand rounded px-2 py-0.5 h-fit">{m.status}</span>
              </div>
              <p className="text-muted mt-1">รหัส {m.code} · รองรับ {m.load} · ขับเคลื่อน {m.drive}</p>
              <p className="text-[12px] text-sky mt-1.5">ข้อมูลชุดนี้แสดงบนเว็บสาธารณะหน้า &ldquo;รถ AGV&rdquo; โดยอัตโนมัติ</p>
            </div>
          ))}
        </div>
      )}

      {tab === "Template เอกสาร" && (
        <div className="card-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-[13px]">
              <thead>
                <tr className="bg-ice/70 text-navy">
                  <th className="text-left px-4 py-2.5 font-bold">Template</th>
                  <th className="text-left px-4 py-2.5 font-bold">รหัส</th>
                  <th className="text-left px-4 py-2.5 font-bold">ผู้ดูแล</th>
                  <th className="text-left px-4 py-2.5 font-bold">อัปเดตล่าสุด</th>
                  <th className="px-4 py-2.5"></th>
                </tr>
              </thead>
              <tbody>
                {docTemplates.map((t, i) => (
                  <tr key={t.code} className={i % 2 ? "bg-ice/30" : ""}>
                    <td className="px-4 py-2.5 font-semibold text-navy">{t.name}</td>
                    <td className="px-4 py-2.5 text-sky font-semibold">{t.code}</td>
                    <td className="px-4 py-2.5 text-muted">{t.owner}</td>
                    <td className="px-4 py-2.5 text-muted">{t.updated}</td>
                    <td className="px-4 py-2.5 text-right">
                      <button className="text-[12px] font-semibold text-brand hover:text-navy" disabled={readOnly}>
                        {readOnly ? "ดู" : "แก้ไข"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "ฐานความรู้" && (
        <div className="space-y-3">
          {knowledgeBase.map((k) => (
            <div key={k.topic} className="card-white p-4 flex flex-wrap items-center justify-between gap-3 text-[13.5px]">
              <div>
                <p className="font-bold text-navy">{k.topic}</p>
                <p className="text-[12px] text-muted">{k.source}</p>
              </div>
              <span className={`text-[11px] font-bold rounded px-2 py-1 ${k.aiReady ? "bg-ice text-brand" : "bg-amber/15 text-amber"}`}>
                {k.aiReady ? "✨ AI พร้อมตอบจากเอกสารนี้" : "รอจัดเข้าฐาน AI"}
              </span>
            </div>
          ))}
          <p className="text-[12px] text-muted/70 italic">
            ฐานความรู้จากเอกสาร Master 180 หน้า — พนักงานถามได้ทั้งใน Portal และผ่านแชทบอทหน้าเว็บ (ระบบจริงใช้ RAG + AI API)
          </p>
        </div>
      )}
    </>
  );
}

export default function MasterPage() {
  return (
    <StaffShell title="ข้อมูล Master">
      <MasterBody />
    </StaffShell>
  );
}
