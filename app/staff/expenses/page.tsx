"use client";

// โมดูลเบิกค่าใช้จ่าย — แยกประเภท 7 หมวด
// ค่าเดินทาง: ต้นทาง-ปลายทางค้นหาแบบ Google Maps (จำลอง) คำนวณระยะทาง × 6.5 ฿/กม. + ทางด่วน
// ทุกหมวดแนบรูปใบเสร็จได้ (หมวดที่มีใบเสร็จบังคับแนบ)

import { useEffect, useRef, useState } from "react";
import StaffShell from "@/components/staff/StaffShell";
import {
  expenseClaims, expensePolicy, expenseCategories, mapPlaces, roadKm,
  expenseRatesByPosition, type PositionKey,
  projects, type ExpenseCategoryKey,
} from "@/lib/staffData";
import "leaflet/dist/leaflet.css";
import { callCopilot } from "@/lib/copilot";
import { supabase } from "@/lib/supabase";

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

// แนบรูปใบเสร็จ — อัปโหลดแล้ว AI อ่านยอด/ร้านค้า/วันที่ให้จริง
type ReceiptInfo = { vendor?: string; date?: string; total?: number; vat?: number };
function ReceiptUpload({ required }: { required: boolean }) {
  const [previews, setPreviews] = useState<string[]>([]);
  const [ocr, setOcr] = useState<ReceiptInfo | null>(null);
  const [ocrState, setOcrState] = useState<"idle" | "loading" | "error">("idle");
  const inputRef = useRef<HTMLInputElement>(null);

  const readReceipt = (file: File) => {
    const r = new FileReader();
    r.onload = async () => {
      setOcrState("loading");
      try {
        const dataUrl = String(r.result);
        const m = dataUrl.match(/^data:(image\/\w+);base64,/);
        const j = await callCopilot({
          action: "ocr_receipt",
          image: m ? dataUrl.slice(m[0].length) : dataUrl,
          mime: m ? m[1] : "image/jpeg",
        });
        let raw = String(j.text ?? "").trim();
        if (raw.startsWith("```")) raw = raw.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
        const jm = raw.match(/\{[\s\S]*\}/);
        setOcr(jm ? JSON.parse(jm[0]) : null);
        setOcrState("idle");
      } catch {
        setOcrState("error");
      }
    };
    r.readAsDataURL(file);
  };
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
          if (files[0]) readReceipt(files[0]); // AI อ่านใบแรกที่แนบ
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
      {ocrState === "loading" && <p className="mt-2 text-[12px] text-sky font-semibold">✨ AI กำลังอ่านใบเสร็จ...</p>}
      {ocr && ocrState === "idle" && (
        <p className="mt-2 text-[12.5px] bg-brand/10 text-navy rounded-lg px-3 py-2">
          ✨ <strong>AI อ่านได้:</strong> {ocr.vendor || "-"}{ocr.date ? ` · ${ocr.date}` : ""}
          {ocr.total ? <> · ยอดรวม <strong className="text-brand">{Number(ocr.total).toLocaleString("th-TH")} ฿</strong></> : ""}
          {ocr.vat ? ` (VAT ${Number(ocr.vat).toLocaleString("th-TH")}฿)` : ""}
          <span className="text-muted/70 text-[11px]"> — ใช้ตรวจทานกับยอดที่กรอก</span>
        </p>
      )}
      {ocrState === "error" && <p className="mt-2 text-[12px] text-[#D94141]">⚠ AI อ่านใบเสร็จไม่สำเร็จ — กรอกยอดเองได้ตามปกติ</p>}
      <p className="mt-1 text-[11px] text-muted/70"><span className="text-[10px] font-bold bg-brand/10 text-brand rounded px-1 py-0.5 mr-1">AI จริง</span>แนบรูปแล้ว AI อ่านยอด/ร้านค้า/วันที่ให้อัตโนมัติ</p>
    </div>
  );
}

// ค่าเดินทาง — ค้นหาต้นทาง/ปลายทาง + คำนวณระยะทาง (จำลอง Google Maps)
type GeoPoint = { name: string; lat: number | null; lng: number | null };
type LatLngLine = [number, number][];

// หาสถานที่ที่รู้จักใกล้จุดที่คลิก (ภายใน ~4 กม.) เพื่อตั้งชื่อให้อัตโนมัติ
function nearestPlace(lat: number, lng: number) {
  let best: { name: string; d: number } | null = null;
  for (const pl of mapPlaces) {
    const d = roadKm({ lat, lng }, { lat: pl.lat, lng: pl.lng });
    if (!best || d < best.d) best = { name: pl.name, d };
  }
  return best && best.d <= 4 ? best.name : null;
}

// เรียกบริการเส้นทางขับจริง (OSRM สาธารณะ ฟรี — เดโม; ระบบจริงใช้ Google Maps Directions API)
async function fetchRoute(a: { lat: number; lng: number }, b: { lat: number; lng: number }):
  Promise<{ km: number; line: LatLngLine } | null> {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${a.lng},${a.lat};${b.lng},${b.lat}?overview=full&geometries=geojson`;
    const r = await fetch(url, { signal: AbortSignal.timeout(7000) });
    if (!r.ok) return null;
    const j = await r.json();
    const rt = j?.routes?.[0];
    if (!rt) return null;
    return {
      km: Math.round((rt.distance / 1000) * 10) / 10,
      line: (rt.geometry.coordinates as [number, number][]).map(([lng, lat]) => [lat, lng]),
    };
  } catch {
    return null;
  }
}

// แผนที่เลือกจุด + แสดงเส้นทางขับจริง (Leaflet + OpenStreetMap)
function MapPicker({ from, to, target, onPick, routeGo, routeBack }: {
  from: GeoPoint; to: GeoPoint;
  target: "from" | "to";
  onPick: (which: "from" | "to", lat: number, lng: number) => void;
  routeGo: LatLngLine | null;
  routeBack: LatLngLine | null;
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
      // หมุดสถานที่ที่รู้จัก (จุดฟ้าเล็ก) — ชี้เพื่อดูชื่อ
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

  // อัปเดตหมุด + เส้นทาง
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
    let bounds: [number, number][] = pts;
    if (routeGo && routeGo.length > 1) {
      L.polyline(routeGo, { color: "#15659E", weight: 3.5, opacity: 0.85 }).addTo(layer).bindTooltip("ขาไป");
      bounds = bounds.concat(routeGo);
    }
    if (routeBack && routeBack.length > 1) {
      L.polyline(routeBack, { color: "#F0A030", weight: 3, opacity: 0.85, dashArray: "8 6" }).addTo(layer).bindTooltip("ขากลับ");
      bounds = bounds.concat(routeBack);
    }
    if (!routeGo && pts.length === 2) {
      L.polyline(pts, { color: "#5B9BD5", weight: 2, dashArray: "6 6", opacity: 0.6 }).addTo(layer);
    }
    if (bounds.length >= 2) map.fitBounds(bounds, { padding: [30, 30] });
    else if (pts.length === 1) map.setView(pts[0], Math.max(map.getZoom(), 10));
  }, [from, to, routeGo, routeBack]);
  /* eslint-enable @typescript-eslint/no-explicit-any */

  return <div ref={divRef} className="relative z-0 h-56 w-full rounded-xl border border-ice overflow-hidden" />;
}

// ค่าเดินทาง: ต้นทาง → ปลายทาง เลือกขาไปอย่างเดียว/ไป-กลับ
// ขาไป-ขากลับคำนวณแยกจาก "เส้นทางที่รถวิ่งจริง" (คนละเส้นทางได้ ระยะไม่เท่ากันได้) — ถ้ามีแวะหลายที่ ให้ตั้งเบิกแยกรายการ
function TravelForm({ onTotal }: { onTotal: (n: number) => void }) {
  const office = mapPlaces[0];
  const [from, setFrom] = useState<GeoPoint>({ name: office.name, lat: office.lat, lng: office.lng });
  const [to, setTo] = useState<GeoPoint>({ name: "", lat: null, lng: null });
  const [target, setTarget] = useState<"from" | "to">("to");
  const [trip, setTrip] = useState<"oneway" | "round">("round");
  const [kmGo, setKmGo] = useState(0);
  const [kmBack, setKmBack] = useState(0);
  const [routeGo, setRouteGo] = useState<LatLngLine | null>(null);
  const [routeBack, setRouteBack] = useState<LatLngLine | null>(null);
  const [calcing, setCalcing] = useState(false);
  const [calcMsg, setCalcMsg] = useState<string | null>(null);
  const [toll, setToll] = useState(0);
  const [parking, setParking] = useState(0);

  const totalKm = kmGo + (trip === "round" ? kmBack : 0);
  const kmAmount = Math.round(totalKm * expensePolicy.kmRate);
  const total = kmAmount + toll + parking;
  onTotal(total);

  const setPoint = (which: "from" | "to", pnt: GeoPoint) => {
    (which === "from" ? setFrom : setTo)(pnt);
    setRouteGo(null); setRouteBack(null); // จุดเปลี่ยน → เส้นทางเดิมใช้ไม่ได้
  };

  const typeName = (which: "from" | "to") => (v: string) => {
    const pl = mapPlaces.find((x) => x.name === v.trim());
    setPoint(which, { name: v, lat: pl?.lat ?? null, lng: pl?.lng ?? null });
  };

  const pickOnMap = (which: "from" | "to", lat: number, lng: number) => {
    const known = nearestPlace(lat, lng);
    setPoint(which, { name: known ?? `จุดบนแผนที่ (${lat.toFixed(4)}, ${lng.toFixed(4)})`, lat, lng });
  };

  const calc = async () => {
    if (from.lat == null || from.lng == null || to.lat == null || to.lng == null) {
      setCalcMsg("ยังไม่ได้ระบุตำแหน่งครบ 2 จุด — พิมพ์เลือกจากรายการ หรือแตะบนแผนที่เพื่อปักหมุด");
      return;
    }
    const a = { lat: from.lat, lng: from.lng }, b = { lat: to.lat, lng: to.lng };
    setCalcing(true);
    setCalcMsg("⏳ กำลังคำนวณจากเส้นทางขับจริง...");
    const go = await fetchRoute(a, b);
    const back = trip === "round" && go ? await fetchRoute(b, a) : null;
    setCalcing(false);
    if (go) {
      setKmGo(go.km); setRouteGo(go.line);
      if (trip === "round" && back) { setKmBack(back.km); setRouteBack(back.line); }
      else if (trip === "round") { setKmBack(go.km); setRouteBack(null); }
      setCalcMsg(
        trip === "round"
          ? `เส้นทางขับจริง: ขาไป ${go.km} กม.${back ? ` / ขากลับ ${back.km} กม.` : ` (ขากลับใช้ค่าเดียวกัน — เรียกเส้นทางไม่สำเร็จ)`} — สองขาอาจไม่เท่ากันตามเส้นทางที่วิ่งจริง แก้ตัวเลขได้ (เดโมใช้ OSRM; ระบบจริงใช้ Google Maps)`
          : `เส้นทางขับจริง: ขาไป ${go.km} กม. (เดโมใช้ OSRM; ระบบจริงใช้ Google Maps)`
      );
    } else {
      // fallback: เชื่อมต่อบริการเส้นทางไม่ได้ → ประมาณจากพิกัด
      const approx = roadKm(a, b);
      setKmGo(approx); if (trip === "round") setKmBack(approx);
      setRouteGo(null); setRouteBack(null);
      setCalcMsg(`เชื่อมต่อบริการเส้นทางไม่ได้ — ใช้ค่าประมาณจากพิกัด ${approx} กม./ขา (แก้ตัวเลขตามจริงได้เลย)`);
    }
  };

  const coordLabel = (pnt: GeoPoint) =>
    pnt.lat != null && pnt.lng != null ? `📍 ${pnt.lat.toFixed(4)}, ${pnt.lng.toFixed(4)}` : "— ยังไม่ระบุตำแหน่ง (พิมพ์เลือก หรือแตะบนแผนที่)";

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
        {mapPlaces.map((pl) => <option key={pl.name} value={pl.name} />)}
      </datalist>

      {/* แผนที่: แตะเพื่อปักหมุด + แสดงเส้นทางขับจริง (น้ำเงิน=ขาไป, ส้มประ=ขากลับ) */}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-1.5 mb-1.5">
          <p className="text-[11.5px] text-muted">แตะแผนที่เพื่อปักหมุด: <strong className={target === "from" ? "text-brand" : "text-amber"}>{target === "from" ? "จุดเริ่มต้น" : "จุดสิ้นสุด"}</strong> · จุดฟ้า = สถานที่ที่บันทึกไว้</p>
          <button type="button" onClick={() => setTarget(target === "from" ? "to" : "from")}
            className="text-[11px] font-bold text-sky hover:text-brand">⇄ สลับหมุดที่จะปัก</button>
        </div>
        <MapPicker from={from} to={to} target={target} onPick={pickOnMap} routeGo={routeGo} routeBack={routeBack} />
        {(routeGo || routeBack) && (
          <p className="mt-1 text-[11px] text-muted/80">
            <span className="inline-block w-4 h-[3px] bg-brand align-middle mr-1" />ขาไป
            {routeBack && <><span className="inline-block w-4 h-[3px] bg-amber align-middle ml-3 mr-1" />ขากลับ (เส้นประ)</>}
            {" "}— เส้นทางที่รถวิ่งจริง
          </p>
        )}
      </div>

      {/* ประเภทเที่ยว + คำนวณ */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <label className="flex items-center gap-1.5 text-[13px] text-ink">
          <input type="radio" name="trip" checked={trip === "oneway"} onChange={() => { setTrip("oneway"); setRouteBack(null); }} /> ขาไปอย่างเดียว
        </label>
        <label className="flex items-center gap-1.5 text-[13px] text-ink">
          <input type="radio" name="trip" checked={trip === "round"} onChange={() => setTrip("round")} /> ไป-กลับ
        </label>
        <button type="button" onClick={calc} disabled={calcing}
          className="btn btn-outline text-[12.5px] py-1.5 px-3 disabled:opacity-60">
          {calcing ? "⏳ กำลังคำนวณ..." : "📍 คำนวณระยะทางจากเส้นทางขับจริง"}
        </button>
      </div>
      {calcMsg && <p className="text-[11.5px] text-sky bg-ice/50 rounded-lg px-3 py-2">{calcMsg}</p>}

      {/* ระยะทางขาไป/ขากลับ — แยกกัน ไม่ใช้ ×2 เพราะเส้นทางจริงสองขาไม่จำเป็นต้องเท่ากัน */}
      <div className="rounded-xl bg-ice/50 p-3.5 space-y-2.5">
        <p className="text-[12px] font-bold text-navy">🚗 รถส่วนตัว — อัตรา {expensePolicy.kmRate} ฿/กม.</p>
        <div className="flex items-center gap-2">
          <label className="text-muted flex-1 text-[13px]">ระยะขาไป (กม.)</label>
          <input type="number" step="0.1" value={kmGo} onChange={(e) => setKmGo(+e.target.value || 0)}
            className="w-24 shrink-0 rounded-lg border border-ice px-2.5 py-1.5 text-right bg-white" />
          <span className="font-semibold text-navy w-20 text-right shrink-0">{fmt(Math.round(kmGo * expensePolicy.kmRate))} ฿</span>
        </div>
        {trip === "round" && (
          <div className="flex items-center gap-2">
            <label className="text-muted flex-1 text-[13px]">ระยะขากลับ (กม.)</label>
            <input type="number" step="0.1" value={kmBack} onChange={(e) => setKmBack(+e.target.value || 0)}
              className="w-24 shrink-0 rounded-lg border border-ice px-2.5 py-1.5 text-right bg-white" />
            <span className="font-semibold text-navy w-20 text-right shrink-0">{fmt(Math.round(kmBack * expensePolicy.kmRate))} ฿</span>
          </div>
        )}
        <div className="flex items-center gap-2 border-t border-ice pt-2">
          <span className="text-navy font-semibold flex-1 text-[13px]">รวม {fmt(Math.round(totalKm * 10) / 10)} กม. × {expensePolicy.kmRate}฿</span>
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
        <p className="text-[11px] text-muted/70">* ถ้ามีแวะหลายที่ในทริปเดียว ให้ตั้งเบิกแยกเป็นรายการใหม่ต่อช่วง</p>
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

// อ้างอิงดีล/โปรเจกต์ — เลือก "อื่นๆ" ได้กรณีไม่มีดีล/โปรเจกต์ (เช่น เข้าพบลูกค้าใหม่)
function RefPicker() {
  const [ref, setRef] = useState("");
  const [other, setOther] = useState("");
  const [dbDeals, setDbDeals] = useState<{ id: number; customer_name: string }[]>([]);
  useEffect(() => {
    supabase?.from("deals").select("id,customer_name").order("created_at", { ascending: false })
      .then(({ data }) => setDbDeals((data as { id: number; customer_name: string }[]) ?? []));
  }, []);
  return (
    <div>
      <label className="block font-semibold text-navy mb-1">อ้างอิงดีล/โปรเจกต์</label>
      <select value={ref} onChange={(e) => setRef(e.target.value)}
        className="w-full max-w-full rounded-lg border border-ice px-3 py-2 bg-white">
        {dbDeals.map((d) => <option key={d.id} value={`D-${String(d.id).padStart(3, "0")}`}>D-{String(d.id).padStart(3, "0")} — {d.customer_name}</option>)}
        {projects.map((p) => <option key={p.code} value={p.code}>{p.code} — {p.name}</option>)}
        <option value="__other__">อื่นๆ (ไม่มีดีล/โปรเจกต์ — ระบุเอง)</option>
      </select>
      {ref === "__other__" && (
        <input autoFocus placeholder="เช่น เข้าพบลูกค้าใหม่ / งานแฟร์ / ธุระบริษัท..." value={other}
          onChange={(e) => setOther(e.target.value)}
          className="mt-2 w-full rounded-lg border border-amber/50 bg-amber/5 px-3 py-2 text-[13px]" />
      )}
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
        <RefPicker />

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
