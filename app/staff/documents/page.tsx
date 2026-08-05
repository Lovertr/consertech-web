"use client";

// โมดูลเอกสารขาย — ใบเสนอราคา (สร้างจากข้อมูล Master) + Proposal (AI ร่าง จำลอง) + ทะเบียนเอกสาร

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import StaffShell, { useDept } from "@/components/staff/StaffShell";
import { products, quotations, proposals, deals } from "@/lib/staffData";

const fmt = (n: number) => n.toLocaleString("th-TH");

function QuotationBuilder({ readOnly }: { readOnly: boolean }) {
  const [items, setItems] = useState<{ code: string; qty: number }[]>([
    { code: "SEN-002", qty: 3 },
    { code: "MOT-002", qty: 3 },
    { code: "SVC-001", qty: 3 },
  ]);
  const [customer, setCustomer] = useState("โรงงานชิ้นส่วนยานยนต์ A");

  const rows = items.map((it) => {
    const p = products.find((x) => x.code === it.code)!;
    return { ...p, qty: it.qty, total: p.price * it.qty };
  });
  const subtotal = rows.reduce((a, r) => a + r.total, 0);
  const vat = Math.round(subtotal * 0.07);

  return (
    <div className="grid gap-5 min-[1040px]:grid-cols-[1fr_360px] items-start">
      <div className="card-white p-5 min-w-0">
        <div className="flex flex-wrap justify-between gap-2">
          <div>
            <p className="text-[11px] font-bold text-sky">เลขที่เอกสาร (รันอัตโนมัติ)</p>
            <p className="font-bold text-navy text-[18px]">QT-2569-015 <span className="text-[11px] font-semibold text-muted">(ร่าง)</span></p>
          </div>
          <select value={customer} onChange={(e) => setCustomer(e.target.value)} disabled={readOnly}
            className="text-[13.5px] rounded-lg border border-ice px-3 py-2 bg-white h-fit max-w-full">
            {deals.map((d) => <option key={d.id}>{d.customer}</option>)}
          </select>
        </div>

        <div className="overflow-x-auto mt-4 -mx-1 px-1">
        <table className="w-full min-w-[430px] text-[13px]">
          <thead>
            <tr className="bg-ice/70 text-navy">
              <th className="text-left px-3 py-2 font-bold">รายการ (จากข้อมูล Master)</th>
              <th className="text-right px-2 py-2 font-bold w-16">จำนวน</th>
              <th className="text-right px-3 py-2 font-bold w-28">ราคา/หน่วย</th>
              <th className="text-right px-3 py-2 font-bold w-28">รวม</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.code} className={i % 2 ? "bg-ice/30" : ""}>
                <td className="px-3 py-2">
                  <span className="text-[10.5px] text-sky font-bold mr-1.5">{r.code}</span>{r.name}
                </td>
                <td className="text-right px-2 py-2">
                  <input type="number" min={1} value={r.qty} disabled={readOnly}
                    onChange={(e) => setItems(items.map((it) => it.code === r.code ? { ...it, qty: +e.target.value || 1 } : it))}
                    className="w-14 text-right rounded border border-ice px-1.5 py-0.5" />
                </td>
                <td className="text-right px-3 py-2 text-muted">{fmt(r.price)}</td>
                <td className="text-right px-3 py-2 font-semibold text-navy">{fmt(r.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>

        {!readOnly && (
          <select
            className="mt-3 max-w-full text-[13px] rounded-lg border border-dashed border-sky px-3 py-2 bg-white text-sky"
            value=""
            onChange={(e) => { if (e.target.value) setItems([...items, { code: e.target.value, qty: 1 }]); }}
          >
            <option value="">＋ เพิ่มรายการจากข้อมูล Master...</option>
            {products.filter((p) => !items.some((it) => it.code === p.code)).map((p) => (
              <option key={p.code} value={p.code}>{p.code} — {p.name} ({fmt(p.price)}฿)</option>
            ))}
          </select>
        )}

        <div className="mt-4 border-t border-ice pt-3 text-[13.5px] space-y-1 text-right">
          <p className="text-muted">รวม {fmt(subtotal)} ฿ · VAT 7% {fmt(vat)} ฿</p>
          <p className="text-[18px] font-bold text-navy">ยอดสุทธิ {fmt(subtotal + vat)} ฿</p>
        </div>

        {!readOnly && (
          <div className="mt-4 flex flex-wrap gap-2">
            <button className="btn btn-primary text-[13.5px] py-2">บันทึกร่าง</button>
            <button className="btn btn-amber text-[13.5px] py-2">ส่งขออนุมัติ (ผู้บริหาร)</button>
            <button className="btn btn-outline text-[13.5px] py-2">พรีวิว PDF</button>
          </div>
        )}
        <p className="mt-3 text-[11px] text-muted/70 italic">* ราคาในเดโมเป็นตัวเลขสมมุติทั้งหมด — ระบบจริงดึงราคากลางจากข้อมูล Master ตามสิทธิ์</p>
      </div>

      {/* ทะเบียนเอกสาร */}
      <div className="card-white p-5 min-w-0">
        <h3 className="font-bold text-navy text-[15px]">ใบเสนอราคาล่าสุด</h3>
        <div className="mt-3 space-y-2.5">
          {quotations.map((q) => (
            <div key={q.no} className="rounded-lg border border-ice p-3 text-[12.5px]">
              <div className="flex justify-between font-bold text-navy">
                <span>{q.no}</span><span>{fmt(q.total)}฿</span>
              </div>
              <p className="text-muted mt-0.5">{q.customer}</p>
              <p className="mt-1"><span className={`text-[10.5px] font-bold rounded px-1.5 py-0.5 ${q.status.includes("อนุมัติ") ? "bg-ice text-brand" : "bg-amber/15 text-amber"}`}>{q.status}</span> <span className="text-muted/70 ml-1">{q.date}</span></p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ProposalTab({ readOnly }: { readOnly: boolean }) {
  const sections = ["แนะนำบริษัท", "ปัญหาและโจทย์ของลูกค้า (จาก Site Survey)", "โซลูชันที่เสนอ + สเปกอุปกรณ์", "Scope of Work", "แผนงานและ Timeline", "เงื่อนไขชำระเงิน + รับประกัน"];
  const [checked, setChecked] = useState<boolean[]>(sections.map(() => true));
  const [state, setState] = useState<"idle" | "loading" | "done">("idle");

  return (
    <div className="grid gap-5 min-[1040px]:grid-cols-[380px_1fr] items-start">
      <div className="card-white p-5 min-w-0">
        <p className="text-[11px] font-bold text-sky">เลขที่เอกสาร</p>
        <p className="font-bold text-navy text-[18px]">PR-2569-008 <span className="text-[11px] font-semibold text-muted">(ร่าง)</span></p>
        <label className="block text-[12.5px] font-semibold text-navy mt-3 mb-1">ดีลอ้างอิง</label>
        <select className="w-full text-[13.5px] rounded-lg border border-ice px-3 py-2 bg-white" disabled={readOnly}>
          {deals.filter((d) => d.stage !== "won").map((d) => <option key={d.id}>{d.id} — {d.customer}</option>)}
        </select>
        <p className="text-[12.5px] font-semibold text-navy mt-4 mb-1.5">หัวข้อที่ใส่ใน Proposal</p>
        {sections.map((s, i) => (
          <label key={s} className="flex items-center gap-2 text-[13px] py-1 cursor-pointer">
            <input type="checkbox" checked={checked[i]} disabled={readOnly}
              onChange={() => setChecked(checked.map((c, j) => (j === i ? !c : c)))} />
            {s}
          </label>
        ))}
        {!readOnly && (
          <button
            onClick={() => { setState("loading"); setTimeout(() => setState("done"), 1200); }}
            className="btn btn-amber w-full mt-4 text-[14px]"
          >
            {state === "loading" ? "✨ AI กำลังร่างเอกสาร..." : "✨ ให้ AI ร่าง Proposal"}
          </button>
        )}
        <p className="mt-2 text-[11px] text-muted/70 italic">AI ดึงข้อมูลจาก: บันทึก Survey ในดีล + ข้อมูล Master + Template บริษัท</p>
      </div>

      <div className="card-white p-6 min-h-[380px] min-w-0">
        {state !== "done" ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-muted py-16">
            <p className="text-4xl">📄</p>
            <p className="mt-3 text-[14px]">เลือกดีลและหัวข้อ แล้วกด &ldquo;ให้ AI ร่าง Proposal&rdquo;<br />ตัวอย่างเอกสารจะแสดงตรงนี้</p>
          </div>
        ) : (
          <div className="text-[13.5px] leading-relaxed space-y-3">
            <p className="text-[11px] font-bold text-amber">✨ ร่างโดย AI — รอพนักงานตรวจแก้ก่อนส่งจริง</p>
            <h3 className="text-[18px] font-bold text-navy">ข้อเสนอโครงการ: ระบบ Lifter AGV x3 + Fleet Management System</h3>
            <p className="text-muted text-[12px]">เรียน โรงงานชิ้นส่วนยานยนต์ A | อ้างอิงการสำรวจหน้างานวันที่ 2 ส.ค. 2569</p>
            <p><strong className="text-brand">1. แนะนำบริษัท —</strong> บริษัท คันเซอร์เทคช์ จำกัด ที่ปรึกษาและวิศวกรระบบ Intra-Logistic Automation... (ดึงจาก Template บริษัท)</p>
            <p><strong className="text-brand">2. โจทย์ของท่าน —</strong> จากการสำรวจ: ลำเลียงชิ้นส่วนจากคลังเข้าไลน์ประกอบ ระยะ 120 ม. น้ำหนักเฉลี่ย 450 กก./เที่ยว ปัจจุบันใช้พนักงาน 4 คน/กะ...</p>
            <p><strong className="text-brand">3. โซลูชันที่เสนอ —</strong> Lifter/Underride AGV จำนวน 3 คัน (รองรับ 600 กก. เผื่อ 33%) นำทางด้วย PICOSCAN LOC + ระบบ FMS จ่ายงานอัตโนมัติ... สเปกอุปกรณ์ดึงจากข้อมูล Master 8 รายการ</p>
            <p><strong className="text-brand">4. Scope of Work —</strong> ตาม Template TPL-SOW: ออกแบบ → ติดตั้ง → ทดสอบ → อบรม → ส่งมอบเอกสารครบชุด</p>
            <p><strong className="text-brand">5. Timeline —</strong> 10 สัปดาห์นับจากเซ็นสัญญา แบ่ง 4 งวดตาม Milestone...</p>
            <p className="text-[11px] text-muted/70 italic">* เนื้อหาจำลองเพื่อเดโม — ระบบจริงสร้างเอกสารเต็มพร้อม Export PDF ตามแบรนด์บริษัท</p>
            <div className="flex gap-2 pt-1">
              <button className="btn btn-primary text-[13px] py-2">บันทึกร่าง</button>
              <button className="btn btn-outline text-[13px] py-2">Export PDF</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function DocumentsBody() {
  const params = useSearchParams();
  const [tab, setTab] = useState<"quotation" | "proposal">(params.get("tab") === "proposal" ? "proposal" : "quotation");
  const { access } = useDept();
  const readOnly = access("documents") === "read";

  return (
    <>
      <div className="flex flex-wrap gap-1 mb-4 bg-ice rounded-xl p-1 w-fit max-w-full">
        {([["quotation", "ใบเสนอราคา"], ["proposal", "Proposal"]] as const).map(([k, label]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`px-3.5 min-[600px]:px-4 py-2 rounded-lg text-[13.5px] font-semibold transition ${tab === k ? "bg-white text-navy shadow-sm" : "text-muted"}`}>
            {label}
          </button>
        ))}
        <span className="hidden min-[600px]:inline px-4 py-2 text-[13.5px] text-muted/50">ใบสั่งขาย (เฟสถัดไป)</span>
      </div>
      {readOnly && (
        <p className="mb-3 text-[12.5px] bg-ice text-sky font-semibold rounded-lg px-3 py-2 inline-block">👁️ ดูอย่างเดียว — สร้าง/แก้ไขได้เฉพาะฝ่ายขาย</p>
      )}
      {tab === "quotation" ? <QuotationBuilder readOnly={readOnly} /> : <ProposalTab readOnly={readOnly} />}
      {tab === "proposal" && (
        <div className="mt-5 card-white p-4">
          <h3 className="font-bold text-navy text-[14px]">Proposal ล่าสุด</h3>
          <div className="mt-2 grid gap-2 min-[700px]:grid-cols-2">
            {proposals.map((p) => (
              <div key={p.no} className="rounded-lg border border-ice p-3 text-[12.5px]">
                <p className="font-bold text-navy">{p.no} — {p.title}</p>
                <p className="text-muted mt-0.5">{p.customer} · {p.status} · {p.date}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

export default function DocumentsPage() {
  return (
    <StaffShell title="เอกสารขาย">
      <Suspense>
        <DocumentsBody />
      </Suspense>
    </StaffShell>
  );
}
