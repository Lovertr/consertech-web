"use client";

// โมดูลเบิกค่าใช้จ่าย — แยกประเภท 7 หมวด
// ค่าเดินทาง: ต้นทาง-ปลายทางค้นหาแบบ Google Maps (จำลอง) คำนวณระยะทาง × 6.5 ฿/กม. + ทางด่วน
// ทุกหมวดแนบรูปใบเสร็จได้ (หมวดที่มีใบเสร็จบังคับแนบ)

import { useEffect, useRef, useState } from "react";
import StaffShell from "@/components/staff/StaffShell";
import {
  expenseClaims, expensePolicy, expenseCategories, mapPlaces, roadKm,
  expenseRatesByPosition, type PositionKey,
  deals, projects, type ExpenseCategoryKey,
} from "@/lib/staffData";
import "leaflet/dist/leaflet.css";

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
type GeoPoint = { name: string; lat: number | null; lng: number | null };

// หาสถานที่ที่รู้จักใกล้จุดที่คลิก (ภายใน ~3 กม.) เพื่อตั้งชื่อให้อัตโนมัติ
function nearestPlace(lat: number, lng: number) {
  let best: { name: string; d: number } | null = null;
  for (const pl of mapPlaces) {
    const d = roadKm({ lat, lng }, { lat: pl.lat, lng: pl.lng });
    if (!best || d < best.d) best = { name: pl.name, d };
  }
  return best && best.d <= 4 ? best.name : null;
}

// แผนที่เลือกจุด (Leaflet + OpenStreetMap — เดโมฟรีไม่ใช้ API key; ระบบจริงใช้ Google Maps)
function MapPicker({ from, to, target, onPick }: {
  from: GeoPoint; to: GeoPoint;
  target: "from" | "to";
  onPick: (which: "from" | "to", lat: number, lng: number) => void;
}) {
  const divRef = useRef<HTMLDivElement>(null);
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const mapRef = useRef<any>(null);
  const LRef = useRef<any>(null);
  const layerRef = useRef<any>(null);
  const pickRef = useRef(onPick);
  pickRef.current = onPick;
  const targetRef = useRef(target);
  targetRef.current = target;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const mod: any = await import("leaflet");
      const L = mod.default ?? mod;
      if (cancelled || !divRef.current || mapRef.current) return;
      LRef.current = L;
      const map = L.map(divRef.current, { attributionControl: false }).setView([13.75, 100.7], 8);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 18 }).addTo(map);
      L.control.attribution({ prefix: false }).addAttribution("© OpenStreetMap").addTo(map);
      // หมุดสถานที่ที่รู้จัก (จุดฟ้าเล็ก) — ชี้เพื่อดูชื่อ คลิกเพื่อเลือก
      mapPlaces.forEach((pl) => {
        L.circleMarker([pl.lat, pl.lng], { radius: 5, color: "#5B9BD5", fillColor: "#5B9BD5", fillOpacity: 0.85, weight: 1 })
          .addTo(map).bindTooltip(pl.name);
      });
      map.on("click", (e: any) => pickRef.current(targetRef.current, e.latlng.lat, e.latlng.lng));
      layerRef.current = L.layerGroup().addTo(map);
      mapRef.current = map;
    })();
    return () => { cancelled = true; if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; } };
  }, []);

  // อัปเดตหมุดเริ่ม/สิ้นสุด + เส้นเชื่อม
  useEffect(() => {
    const L = LRef.current, map = mapRef.current, layer = layerRef.current;
    if (!L || !map || !layer) return;
    layer.clearLayers();
    const pts: [number, number][] = [];
    const mark = (pnt: GeoPoint, color: string, label: string) => {
      if (pnt.lat == null || pnt.lng == null) return;
      const icon = L.divIcon({
        className: "",
        html: `<div style="background:${color};color:#fff;font-size:10.5px;font-weight:700;border-radius:10px;padding:1.5px 7px;white-space:nowrap;box-shadow:0 1px 4px rgba(0,0,0,.45);transform:translate(-50%,-100%)">📍 ${label}</div>`,
        iconSize: [0, 0],
      });
      L.marker([pnt.lat, pnt.lng], { icon }).addTo(layer);
      pts.push([pnt.lat, pnt.lng]);
    };
    mark(from, "#15659E", "เริ่มต้น");
    mark(to, "#F0A030", "สิ้นสุด");
    if (pts.length === 2) {
      L.polyline(pts, { color: "#15659E", weight: 2.5, dashArray: "7 7", opacity: 0.8 }).addTo(layer);
      map.fitBounds(pts, { padding: [36, 36] });
    } else if (pts.length === 1) {
      map.setView(pts[0], Math.max(map.getZoom(), 10));
    }
  }, [from, to]);
  /* eslint-enable @typescript-eslint/no-explicit-any */

  return <div ref={divRef} className="relative z-0 h-56 w-full rounded-xl border border-ice overflow-hidden" />;
}

function TravelForm({ onTotal }: { onTotal: (n: number) => void }) {
  const office = mapPlaces[0];
  const [from, setFrom] = useState<GeoPoint>({ name: office.name, lat: office.lat, lng: office.lng });
  const [to, setTo] = useState<GeoPoint>({ name: "", lat: null, lng: null });
  const [target, setTarget] = useState<"from" | "to">("to");
  const [roundTrip, setRoundTrip] = useState(true);
  const [km, setKm] = useState(0);
  const [calcMsg, setCalcMsg] = useState<string | null>(null);
  const [toll, setToll] = useState(0);
  const [parking, setParking] = useState(0);

  const kmAmount = Math.round(km * expensePolicy.kmRate);
  const total = kmAmount + toll + parking;
  onTotal(total);

  const setPoint = (which: "from" | "to", p: GeoPoint) => (which === "from" ? setFrom(p) : setTo(p));

  const typeName = (which: "from" | "to") => (v: string) => {
    const pl = mapPlaces.find((x) => x.name === v.trim());
    setPoint(which, { name: v, lat: pl?.lat ?? null, lng: pl?.lng ?? null });
  };

  const pickOnMap = (which: "from" | "to", lat: number, lng: number) => {
    const known = nearestPlace(lat, lng);
    const name = known ?? `จุดบนแผนที่ (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
    setPoint(which, { name, lat, lng });
    if (which === "to") setTarget("to"); // เลือกปลายทางซ้ำได้เรื่อยๆ
  };

  const calc = () => {
    if (from.lat != null && from.lng != null && to.lat != null && to.lng != null) {
      const oneWay = roadKm({ lat: from.lat, lng: from.lng }, { lat: to.lat, lng: to.lng });
      setKm(roundTrip ? oneWay * 2 : oneWay);
      setCalcMsg(`ระยะทางโดยประมาณตามถนน: ${oneWay} กม./เที่ยว${roundTrip ? " × ไป-กลับ" : ""} (คำนวณจากพิกัดหมุด — ระบบจริงใช้เส้นทางขับจริงจาก Google Maps)`);
    } else {
      setCalcMsg("ยังไม่ได้ระบุตำแหน่งครบ 2 จุด — พิมพ์เลือกจากรายการ หรือแตะบนแผนที่เพื่อปักหมุด");
    }
  };

  const coordLabel = (p: GeoPoint) =>
    p.lat != null && p.lng != null ? `📍 ${p.lat.toFixed(4)}, ${p.lng.toFixed(4)}` : "— ยังไม่ระบุตำแหน่ง (พิมพ์เลือก หรือแตะบนแผนที่)";

  return (
    <div className="space-y-3">
      <div>
        <label className="block font-semibold text-navy mb-1 text-[13.5px]">
          จุดเริ่มต้น
          {target === "from" && <span className="ml-1.5 text-[10.5px] font-bold bg-brand text-white rounded px-1.5 py-0.5 align-middle">กำลังปักหมุด</span>}
        </label>
        <input list="map-places" value={from.name} onChange={(e) => typeName("from")(e.target.value)} onFocus={() => setTarget("from")}
          placeholder="พิมพ์ค้นหาสถานที่..." className={`w-full rounded-lg border px-3 py-2 ${target === "from" ? "border-brand" : "border-ice"}`} />
        <p className={`mt-0.5 text-[11px] ${from.lat != null ? "text-sky" : "text-amber"}`}>{coordLabel(from)}</p>
      </div>
      <div>
        <label className="block font-semibold text-navy mb-1 text-[13.5px]">
          จุดสิ้นสุด
          {target === "to" && <span className="ml-1.5 text-[10.5px] font-bold bg-amber text-white rounded px-1.5 py-0.5 align-middle">กำลังปักหมุด</span>}
        </label>
        <input list="map-places" value={to.name} onChange={(e) => typeName("to")(e.target.value)} onFocus={() => setTarget("to")}
          placeholder="พิมพ์ค้นหาสถานที่..." className={`w-full rounded-lg border px-3 py-2 ${target === "to" ? "border-amber" : "border-ice"}`} />
        <p className={`mt-0.5 text-[11px] ${to.lat != null ? "text-sky" : "text-amber"}`}>{coordLabel(to)}</p>
      </div>
      <datalist id="map-places">
        {mapPlaces.map((p) => <option key={p.name} value={p.name} />)}
      </datalist>

      {/* แผนที่: แตะเพื่อปักหมุดช่องที่เลือกอยู่ — กันสถานที่ชื่อซ้ำ/ผิดที่ */}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-1.5 mb-1.5">
          <p className="text-[11.5px] text-muted">แตะแผนที่เพื่อปักหมุด: <strong className={target === "from" ? "text-brand" : "text-amber"}>{target === "from" ? "จุดเริ่มต้น" : "จุดสิ้นสุด"}</strong> · จุดฟ้า = สถานที่ที่บันทึกไว้</p>
          <button type="button" onClick={() => setTarget(target === "from" ? "to" : "from")}
            className="text-[11px] font-bold text-sky hover:text-brand">⇄ สลับหมุดที่จะปัก</button>
        </div>
        <MapPicker from={from} to={to} target={target} onPick={pickOnMap} />
      </div>

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
  const [pos, setPos] = useState<PositionKey>("staff");
  const [nights, setNights] = useState(1);
  const [rate, setRate] = useState(850);
  const [days, setDays] = useState(2);
  const r = expenseRatesByPosition.find((x) => x.key === pos)!;
  const total = nights * rate + days * r.perDiem;
  onTotal(total);
  return (
    <div className="space-y-3">
      {/* ตำแหน่ง — ในระบบจริงดึงจากโปรไฟล์พนักงานอัตโนมัติ เลือกได้ที่นี่เพื่อเดโม */}
      <div>
        <label className="block font-semibold text-navy mb-1 text-[13.5px]">ตำแหน่งพนักงาน <span className="text-[10.5px] font-normal text-muted">(เดโม — ระบบจริงดึงจากโปรไฟล์อัตโนมัติ)</span></label>
        <select value={pos} onChange={(e) => setPos(e.target.value as PositionKey)}
          className="w-full max-w-full rounded-lg border border-ice px-3 py-2 bg-white">
          {expenseRatesByPosition.map((x) => (
            <option key={x.key} value={x.key}>{x.label} — ที่พัก {fmt(x.lodgingCap)}฿/คืน · เบี้ยเลี้ยง {x.perDiem}฿/วัน</option>
          ))}
        </select>
      </div>
      <div className="rounded-xl bg-ice/50 p-3.5 space-y-2.5">
        <p className="text-[12px] font-bold text-navy">🏨 อัตราตามตำแหน่ง &ldquo;{r.label}&rdquo; — เพดานที่พัก {fmt(r.lodgingCap)}฿/คืน · เบี้ยเลี้ยง {r.perDiem}฿/วัน</p>
        <NumField label="จำนวนคืนที่พัก" value={nights} onChange={setNights} suffix="คืน" />
        <NumField label="ค่าที่พักจริง/คืน (ตามใบเสร็จ)" value={rate} onChange={setRate} suffix="฿" />
        <NumField label={`เบี้ยเลี้ยง ${r.perDiem}฿/วัน — จำนวนวัน`} value={days} onChange={setDays} suffix="วัน" />
        {rate > r.lodgingCap && (
          <p className="text-[11.5px] text-amber font-semibold">⚠ เกินเพดานที่พักของตำแหน่งนี้ ({fmt(r.lodgingCap)}฿/คืน) — ต้องให้ผู้บริหารอนุมัติพิเศษ</p>
        )}
      </div>
      {/* ตารางอัตราทุกตำแหน่ง */}
      <details className="text-[12px] text-muted">
        <summary className="cursor-pointer font-semibold text-sky">ดูตารางอัตราทุกตำแหน่ง</summary>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full min-w-[300px] text-[12px]">
            <thead><tr className="bg-ice/70 text-navy">
              <th className="text-left px-2.5 py-1.5 font-bold">ตำแหน่ง</th>
              <th className="text-right px-2.5 py-1.5 font-bold">ที่พัก/คืน</th>
              <th className="text-right px-2.5 py-1.5 font-bold">เบี้ยเลี้ยง/วัน</th>
            </tr></thead>
            <tbody>
              {expenseRatesByPosition.map((x, i) => (
                <tr key={x.key} className={i % 2 ? "bg-ice/30" : ""}>
                  <td className="px-2.5 py-1.5">{x.label}</td>
                  <td className="px-2.5 py-1.5 text-right">{fmt(x.lodgingCap)} ฿</td>
                  <td className="px-2.5 py-1.5 text-right">{x.perDiem} ฿</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-1 text-[11px] text-muted/70 italic">อัตราเป็นตัวเลขสมมุติ — บริษัทกำหนดจริงในข้อมูล Master ได้</p>
        </div>
      </details>
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
