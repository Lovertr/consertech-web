"use client";

// โมดูลเบิกค่าใช้จ่าย — แยกประเภท 7 หมวด
// ค่าเดินทาง: ต้นทาง-ปลายทางค้นหาแบบ Google Maps (จำลอง) คำนวณระยะทาง × 6.5 ฿/กม. + ทางด่วน
// ทุกหมวดแนบรูปใบเสร็จได้ (หมวดที่มีใบเสร็จบังคับแนบ)

import { useRef, useState } from "react";
import StaffShell from "@/components/staff/StaffShell";
import {
  expenseClaims, expensePolicy, expenseCategories, mapPlaces,
  deals, projects, type ExpenseCategoryKey,
} from "@/lib/staffData";

const fmt = (n: number) => n.toLocaleString("th-TH");
const catMeta = (k: ExpenseCategoryKey) => expenseCategories.find((c) => c.key === k)!;

function NumField({ label, value, onChange, suffix }: { label: string; value: number; onChange: (n: number) => void; suffix?: string }) {
  return (
    <div className="flex items-center gap-2 min-w-0">
      <label className="text-muted flex-1 min-w-0 text-[13px]">{label}</label>
      <input type="number" value={value} onChange={(e) => onChange(+e.target.value || 0)}
        className="w-24 shrink-0 rounded-lg border border-ice px-2.5 py-1.5 text-right bg-white" />
      {suffix && <span className="text-[12px] text-muted w-8 shrink-0">{suffix}</span>}
    </div>
  );
}

// แนบรูปใบเสร็จ — อัปโหลดรูปแล้วแสดงตัวอย่างทันที (mockup เก็บในหน่วยความจำ)
function ReceiptUpload({ required }: { required: boolean }) {
  const [previews, setPreviews] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div>
      <label className="block font-semibold text-navy mb-1 text-[13.5px]">
        แนบรูปใบเสร็จ / หลักฐาน{" "}
        {required ? (
          <span className="text-[10.5px] font-bold bg-amber/15 text-amber rounded px-1.5 py-0.5 align-middle">บังคับแนบ</span>
        ) : (
          <span className="text-[10.5px] font-bold bg-ice text-sky rounded px-1.5 py-0.5 align-middle">ถ้ามี</span>
        )}
      </label>
      <input
        ref={inputRef} type="file" accept="image/*" multiple
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          setPreviews((p) => [...p, ...files.map((f) => URL.createObjectURL(f))]);
        }}
        className="hidden"
      />
      <button type="button" onClick={() => inputRef.current?.click()}
        className="w-full rounded-xl border border-dashed border-sky/60 bg-ice/30 py-3 text-[13px] font-semibold text-sky hover:border-brand hover:text-brand transition">
        📷 ถ่ายรูป / อัปโหลดรูปใบเสร็จ
      </button>
      {previews.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {previews.map((src, i) => (
            <div key={i} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt={`ใบเสร็จ ${i + 1}`} className="w-16 h-16 object-cover rounded-lg border border-ice" />
              <button type="button" onClick={() => setPreviews((p) => p.filter((_, j) => j !== i))}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-navy text-white text-[10px] leading-5 text-center">✕</button>
            </div>
          ))}
        </div>
      )}
      <p className="mt-1 text-[11px] text-muted/70">ระบบจริง: อัปโหลดเข้า Storage + AI อ่านยอด/ร้านค้า/วันที่จากใบเสร็จให้อัตโนมัติ</p>
    </div>
  );
}

// ค่าเดินทาง — ค้นหาต้นทาง/ปลายทาง + คำนวณระยะทาง (จำลอง Google Maps)
function TravelForm({ onTotal }: { onTotal: (n: number) => void }) {
  const [from, setFrom] = useState(mapPlaces[0].name);
  const [to, setTo] = useState("");
  const [roundTrip, setRoundTrip] = useState(true);
  const [km, setKm] = useState(0);
  const [calcMsg, setCalcMsg] = useState<string | null>(null);
  const [toll, setToll] = useState(0);
  const [parking, setParking] = useState(0);

  const kmAmount = Math.round(km * expensePolicy.kmRate);
  const total = kmAmount + toll + parking;
  onTotal(total);

  const calc = () => {
    const a = mapPlaces.find((p) => p.name === from.trim());
    const b = mapPlaces.find((p) => p.name === to.trim());
    if (a && b) {
      const oneWay = Math.max(Math.abs(a.km - b.km), 5);
      setKm(roundTrip ? oneWay * 2 : oneWay);
      setCalcMsg(`ระยะทางโดยประมาณจาก Google Maps: ${oneWay} กม./เที่ยว${roundTrip ? " × ไป-กลับ" : ""} (เดโม)`);
    } else {
      setCalcMsg("ไม่พบสถานที่ในข้อมูลเดโม — กรอกระยะทางเองได้เลย (ระบบจริงค้นหาได้ทุกที่ผ่าน Google Maps API)");
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <label className="block font-semibold text-navy mb-1 text-[13.5px]">จุดเริ่มต้น</label>
        <input list="map-places" value={from} onChange={(e) => setFrom(e.target.value)}
          placeholder="พิมพ์ค้นหาสถานที่..." className="w-full rounded-lg border border-ice px-3 py-2" />
      </div>
      <div>
        <label className="block font-semibold text-navy mb-1 text-[13.5px]">จุดสิ้นสุด</label>
        <input list="map-places" value={to} onChange={(e) => setTo(e.target.value)}
          placeholder="พิมพ์ค้นหาสถานที่..." className="w-full rounded-lg border border-ice px-3 py-2" />
      </div>
      <datalist id="map-places">
        {mapPlaces.map((p) => <option key={p.name} value={p.name} />)}
      </datalist>
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-1.5 text-[13px] text-ink">
          <input type="checkbox" checked={roundTrip} onChange={(e) => setRoundTrip(e.target.checked)} /> ไป-กลับ (×2)
        </label>
        <button type="button" onClick={calc} className="btn btn-outline text-[12.5px] py-1.5 px-3">📍 คำนวณระยะทาง</button>
      </div>
      {calcMsg && <p className="text-[11.5px] text-sky bg-ice/50 rounded-lg px-3 py-2">{calcMsg}</p>}

      <div className="rounded-xl bg-ice/50 p-3.5 space-y-2.5">
        <p className="text-[12px] font-bold text-navy">🚗 รถส่วนตัว — อัตรา {expensePolicy.kmRate} ฿/กม.</p>
        <div className="flex items-center gap-2">
          <label className="text-muted flex-1 text-[13px]">ระยะทางรวม (กม.)</label>
          <input type="number" value={km} onChange={(e) => setKm(+e.target.value || 0)}
            className="w-24 shrink-0 rounded-lg border border-ice px-2.5 py-1.5 text-right bg-white" />
          <span className="font-semibold text-navy w-20 text-right shrink-0">{fmt(kmAmount)} ฿</span>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-muted flex-1 text-[13px]">ค่าทางด่วน</label>
          <input type="number" value={toll} onChange={(e) => setToll(+e.target.value || 0)}
            className="w-24 shrink-0 rounded-lg border border-ice px-2.5 py-1.5 text-right bg-white" />
          <span className="font-semibold text-navy w-20 text-right shrink-0">{fmt(toll)} ฿</span>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-muted flex-1 text-[13px]">ค่าที่จอดรถ</label>
          <input type="number" value={parking} onChange={(e) => setParking(+e.target.value || 0)}
            className="w-24 shrink-0 rounded-lg border border-ice px-2.5 py-1.5 text-right bg-white" />
          <span className="font-semibold text-navy w-20 text-right shrink-0">{fmt(parking)} ฿</span>
        </div>
      </div>
    </div>
  );
}

function LodgingForm({ onTotal }: { onTotal: (n: number) => void }) {
  const [nights, setNights] = useState(1);
  const [rate, setRate] = useState(850);
  const [days, setDays] = useState(2);
  const total = nights * rate + days * expensePolicy.perDiem;
  onTotal(total);
  return (
    <div className="rounded-xl bg-ice/50 p-3.5 space-y-2.5">
      <NumField label="จำนวนคืนที่พัก" value={nights} onChange={setNights} suffix="คืน" />
      <NumField label={`ค่าที่พัก/คืน (เพดาน ${fmt(expensePolicy.lodgingCap)}฿)`} value={rate} onChange={setRate} suffix="฿" />
      <NumField label={`เบี้ยเลี้ยง (${expensePolicy.perDiem}฿/วัน) — จำนวนวัน`} value={days} onChange={setDays} suffix="วัน" />
      {rate > expensePolicy.lodgingCap && (
        <p className="text-[11.5px] text-amber font-semibold">⚠ เกินเพดานที่พัก — ต้องให้ผู้บริหารอนุมัติพิเศษ</p>
      )}
    </div>
  );
}

function EntertainForm({ onTotal }: { onTotal: (n: number) => void }) {
  const [amount, setAmount] = useState(0);
  const [people, setPeople] = useState(2);
  onTotal(amount);
  return (
    <div className="space-y-3">
      <div>
        <label className="block font-semibold text-navy mb-1 text-[13.5px]">ร้าน / สถานที่</label>
        <input placeholder="เช่น ร้านอาหาร..." className="w-full rounded-lg border border-ice px-3 py-2" />
      </div>
      <div className="rounded-xl bg-ice/50 p-3.5 space-y-2.5">
        <NumField label="จำนวนคน (รวมลูกค้า)" value={people} onChange={setPeople} suffix="คน" />
        <NumField label="ยอดตามใบเสร็จ" value={amount} onChange={setAmount} suffix="฿" />
      </div>
    </div>
  );
}

function SimpleAmountForm({ placeholder, onTotal }: { placeholder: string; onTotal: (n: number) => void }) {
  const [amount, setAmount] = useState(0);
  onTotal(amount);
  return (
    <div className="space-y-3">
      <div>
        <label className="block font-semibold text-navy mb-1 text-[13.5px]">รายละเอียด</label>
        <input placeholder={placeholder} className="w-full rounded-lg border border-ice px-3 py-2" />
      </div>
      <div className="rounded-xl bg-ice/50 p-3.5">
        <NumField label="ยอดตามใบเสร็จ" value={amount} onChange={setAmount} suffix="฿" />
      </div>
    </div>
  );
}

function ClaimForm() {
  const [cat, setCat] = useState<ExpenseCategoryKey>("travel");
  const totalRef = useRef(0);
  const [, force] = useState(0);
  const setTotal = (n: number) => {
    if (totalRef.current !== n) { totalRef.current = n; setTimeout(() => force((x) => x + 1), 0); }
  };
  const meta = catMeta(cat);

  return (
    <div className="card-white p-4 min-[600px]:p-5 min-w-0">
      <p className="font-bold text-navy text-[15px]">สร้างรายการเบิกใหม่</p>
      <p className="text-[11px] font-bold text-sky mt-0.5">เลขที่ EXP-2569-045 (รันอัตโนมัติ)</p>

      {/* เลือกประเภท */}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {expenseCategories.map((c) => (
          <button key={c.key} type="button" onClick={() => { setCat(c.key); totalRef.current = 0; }}
            className={`text-[12px] font-semibold rounded-lg px-2.5 py-1.5 border transition ${
              cat === c.key ? "bg-brand text-white border-brand" : "bg-white text-muted border-ice hover:border-brand hover:text-brand"
            }`}>
            {c.icon} {c.label}
          </button>
        ))}
      </div>
      <p className="mt-2 text-[11.5px] text-muted bg-ice/40 rounded-lg px-3 py-2">{meta.icon} {meta.hint}</p>

      <div className="mt-4 space-y-3 text-[13.5px]">
        <div>
          <label className="block font-semibold text-navy mb-1">วัตถุประสงค์ / งานที่ไป</label>
          <input defaultValue="Site Survey ลูกค้าใหม่" className="w-full rounded-lg border border-ice px-3 py-2" />
        </div>
        <div>
          <label className="block font-semibold text-navy mb-1">อ้างอิงดีล/โปรเจกต์</label>
          <select className="w-full max-w-full rounded-lg border border-ice px-3 py-2 bg-white">
            {deals.map((d) => <option key={d.id}>{d.id} — {d.customer}</option>)}
            {projects.map((p) => <option key={p.code}>{p.code} — {p.name}</option>)}
          </select>
        </div>

        {cat === "travel" && <TravelForm onTotal={setTotal} />}
        {cat === "lodging" && <LodgingForm onTotal={setTotal} />}
        {cat === "entertain" && <EntertainForm onTotal={setTotal} />}
        {cat === "supplies" && <SimpleAmountForm placeholder="รายการวัสดุ/อุปกรณ์ที่ซื้อ + ร้านค้า" onTotal={setTotal} />}
        {cat === "training" && <SimpleAmountForm placeholder="ชื่อหลักสูตร/งานสัมมนา + ผู้จัด" onTotal={setTotal} />}
        {cat === "shipping" && <SimpleAmountForm placeholder="ส่งอะไร ถึงใคร ผู้ให้บริการ" onTotal={setTotal} />}
        {cat === "other" && <SimpleAmountForm placeholder="ระบุรายละเอียดค่าใช้จ่าย" onTotal={setTotal} />}

        <ReceiptUpload required={meta.receipt} />

        <div className="flex items-center justify-between border-t border-ice pt-3">
          <span className="text-muted">ยอดเบิกรวม</span>
          <span className="text-[20px] font-bold text-navy">{fmt(totalRef.current)} ฿</span>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-primary text-[13.5px] py-2 flex-1">ส่งขออนุมัติ</button>
          <button className="btn btn-outline text-[13.5px] py-2">บันทึกร่าง</button>
        </div>
        <p className="text-[11px] text-muted/70 italic">{expensePolicy.note} (เบี้ยเลี้ยง/เพดานที่พักเป็นตัวเลขสมมุติ รอบริษัทกำหนดจริง — รองรับเพิ่มรถบริษัท+ระบบจองรถในอนาคต)</p>
      </div>
    </div>
  );
}

export default function ExpensesPage() {
  const pending = expenseClaims.filter((c) => c.status === "รออนุมัติ");
  const monthTotal = expenseClaims.reduce((a, c) => a + c.items.reduce((x, i) => x + i.amount, 0), 0);

  return (
    <StaffShell title="เบิกค่าใช้จ่าย">
      <div className="grid gap-4 grid-cols-2 min-[900px]:grid-cols-3 mb-5">
        <div className="card-white p-4 min-w-0"><p className="text-[12px] text-muted">ยอดเบิกเดือนนี้ (ทีม)</p><p className="text-[22px] font-bold text-navy">{fmt(monthTotal)} ฿</p></div>
        <div className="card-white p-4 min-w-0"><p className="text-[12px] text-muted">รออนุมัติ</p><p className="text-[22px] font-bold text-amber">{pending.length} รายการ</p></div>
        <div className="card-white p-4 min-w-0 col-span-2 min-[900px]:col-span-1"><p className="text-[12px] text-muted">อัตรารถส่วนตัว</p><p className="text-[22px] font-bold text-navy">{expensePolicy.kmRate} ฿/กม.</p></div>
      </div>

      <div className="grid gap-5 min-[1040px]:grid-cols-[400px_1fr] items-start">
        <ClaimForm />

        <div className="card-white overflow-hidden min-w-0">
          <p className="px-4 min-[600px]:px-5 pt-4 pb-2 font-bold text-navy">รายการเบิกล่าสุด</p>
          <div className="divide-y divide-ice">
            {expenseClaims.map((c) => {
              const total = c.items.reduce((a, i) => a + i.amount, 0);
              const m = catMeta(c.category);
              return (
                <div key={c.no} className="px-4 min-[600px]:px-5 py-3.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[13.5px] font-bold text-navy">
                        <span className="text-sky">{c.no}</span> · {c.employee} <span className="text-muted font-normal">({c.dept})</span>
                      </p>
                      <p className="text-[12px] mt-0.5">
                        <span className="inline-block text-[10.5px] font-bold bg-ice text-navy rounded px-1.5 py-0.5 mr-1.5">{m.icon} {m.label}</span>
                        <span className="text-muted">{c.purpose}</span>
                      </p>
                      <p className="text-[11.5px] text-muted/80 mt-0.5">
                        อ้างอิง {c.ref} · {c.date}{c.route ? ` · ${c.route}` : ""}
                        {c.receipts ? ` · 📷 ใบเสร็จ ${c.receipts} รูป` : ""}
                      </p>
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
          <p className="px-4 min-[600px]:px-5 py-3 text-[11.5px] text-muted/70 italic border-t border-ice">
            ระบบจริง: ค้นหาสถานที่/ระยะทางจาก Google Maps API จริง, AI อ่านยอดจากรูปใบเสร็จอัตโนมัติ, รายการที่อนุมัติแล้วส่งเข้าโมดูลการเงิน/PEAK
          </p>
        </div>
      </div>
    </StaffShell>
  );
}
