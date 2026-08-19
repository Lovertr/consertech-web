"use client";

// โมดูลเบิกค่าใช้จ่าย — แยกประเภท 7 หมวด
// ค่าเดินทาง: ต้นทาง-ปลายทางค้นหาแบบ Google Maps (จำลอง) คำนวณระยะทาง × 6.5 ฿/กม. + ทางด่วน
// ทุกหมวดแนบรูปใบเสร็จได้ (หมวดที่มีใบเสร็จบังคับแนบ)

import { useEffect, useRef, useState } from "react";
import StaffShell, { useDept } from "@/components/staff/StaffShell";
import Combo from "@/components/staff/Combo";
import {
  expensePolicy, expenseCategories, mapPlaces, roadKm,
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
function ReceiptUpload({ required, onUrls }: { required: boolean; onUrls?: (urls: string[]) => void }) {
  const [previews, setPreviews] = useState<string[]>([]);
  const urlsRef = useRef<string[]>([]);
  const uploadFile = async (f: File) => {
    if (!supabase) return;
    const ext = f.name.split(".").pop() ?? "jpg";
    const path = `receipts/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await supabase.storage.from("attachments").upload(path, f, { contentType: f.type });
    if (!error) {
      const { data } = supabase.storage.from("attachments").getPublicUrl(path);
      urlsRef.current = [...urlsRef.current, data.publicUrl];
      onUrls?.(urlsRef.current);
    }
  };
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
          files.forEach(uploadFile); // อัปโหลดเก็บจริงเป็นหลักฐาน
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
type TripRow = {
  id: number; emp_id: string;
  start_lat: number | null; start_lng: number | null; start_place: string | null; start_at: string | null;
  end_lat: number | null; end_lng: number | null; end_place: string | null; end_at: string | null;
  status: string;
};

const getPosition = () =>
  new Promise<GeolocationPosition>((res, rej) =>
    navigator.geolocation
      ? navigator.geolocation.getCurrentPosition(res, rej, { enableHighAccuracy: true, timeout: 12000 })
      : rej(new Error("เบราว์เซอร์ไม่รองรับ GPS")));

async function placeNameFor(lat: number, lng: number): Promise<string> {
  const known = nearestPlace(lat, lng);
  if (known) return known;
  try {
    const r = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=th`,
      { signal: AbortSignal.timeout(6000) });
    if (r.ok) {
      const j = await r.json();
      const name = String(j.display_name ?? "").split(",").slice(0, 3).join(",").trim();
      if (name) return name;
    }
  } catch { /* ใช้พิกัดแทน */ }
  return `ตำแหน่ง ${lat.toFixed(4)}, ${lng.toFixed(4)}`;
}

function TravelForm({ onTotal, empId }: { onTotal: (n: number) => void; empId: string }) {
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
  // เช็คอินทริป (บันทึกลง DB — ปิดหน้าแล้วกลับมาต่อได้)
  const [openTrip, setOpenTrip] = useState<TripRow | null>(null);
  const [tripBusy, setTripBusy] = useState(false);
  const [tripMsg, setTripMsg] = useState("");

  useEffect(() => {
    if (!supabase || !empId) return;
    supabase.from("travel_checkins").select("*").eq("emp_id", empId).eq("status", "open")
      .order("created_at", { ascending: false }).limit(1)
      .then(({ data }) => setOpenTrip((data as TripRow[])?.[0] ?? null));
  }, [empId]);

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

  const calcWith = async (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
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

  const calc = async () => {
    if (from.lat == null || from.lng == null || to.lat == null || to.lng == null) {
      setCalcMsg("ยังไม่ได้ระบุตำแหน่งครบ 2 จุด — พิมพ์เลือกจากรายการ หรือแตะบนแผนที่เพื่อปักหมุด");
      return;
    }
    await calcWith({ lat: from.lat, lng: from.lng }, { lat: to.lat, lng: to.lng });
  };

  // ── เช็คอินทริป ──
  const checkinStart = async () => {
    if (!supabase || !empId) { setTripMsg("⚠ ยังไม่ได้เข้าสู่ระบบ"); return; }
    setTripBusy(true); setTripMsg("");
    try {
      const pos = await getPosition();
      const { latitude: lat, longitude: lng } = pos.coords;
      const place = await placeNameFor(lat, lng);
      const { data, error } = await supabase.from("travel_checkins").insert({
        emp_id: empId, start_lat: lat, start_lng: lng, start_place: place, start_at: new Date().toISOString(),
      }).select("*").single();
      if (error) throw error;
      setOpenTrip(data as TripRow);
      setPoint("from", { name: place, lat, lng });
      setTripMsg("✅ เช็คอินจุดเริ่มต้นแล้ว — ปิดหน้านี้ได้เลย ถึงปลายทางค่อยกลับมากดเช็คอินจุดสิ้นสุด");
    } catch (e) {
      setTripMsg("⚠ อ่านตำแหน่งไม่สำเร็จ: " + String((e as Error).message ?? e));
    } finally {
      setTripBusy(false);
    }
  };

  const checkinEnd = async () => {
    if (!supabase || !openTrip) return;
    setTripBusy(true); setTripMsg("");
    try {
      const pos = await getPosition();
      const { latitude: lat, longitude: lng } = pos.coords;
      const place = await placeNameFor(lat, lng);
      await supabase.from("travel_checkins").update({
        end_lat: lat, end_lng: lng, end_place: place, end_at: new Date().toISOString(), status: "done",
      }).eq("id", openTrip.id);
      // เติมจุดเริ่ม/สิ้นสุดจากทริปที่เช็คอินไว้ แล้วคำนวณระยะทางให้เลย
      const a = { lat: openTrip.start_lat!, lng: openTrip.start_lng! };
      setFrom({ name: openTrip.start_place ?? "จุดเริ่มต้น", lat: a.lat, lng: a.lng });
      setTo({ name: place, lat, lng });
      setOpenTrip(null);
      setTripMsg(`✅ ถึงปลายทางแล้ว (${place}) — คำนวณระยะทางจากเส้นทางขับจริงให้ด้านล่าง`);
      await calcWith(a, { lat, lng });
    } catch (e) {
      setTripMsg("⚠ อ่านตำแหน่งไม่สำเร็จ: " + String((e as Error).message ?? e));
    } finally {
      setTripBusy(false);
    }
  };

  const cancelTrip = async () => {
    if (!supabase || !openTrip) return;
    if (!confirm("ยกเลิกทริปที่เช็คอินไว้?")) return;
    await supabase.from("travel_checkins").update({ status: "cancelled" }).eq("id", openTrip.id);
    setOpenTrip(null); setTripMsg("");
  };

  const tripTime = (iso: string | null) =>
    iso ? new Date(iso).toLocaleString("th-TH", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "";

  const coordLabel = (pnt: GeoPoint) =>
    pnt.lat != null && pnt.lng != null ? `📍 ${pnt.lat.toFixed(4)}, ${pnt.lng.toFixed(4)}` : "— ยังไม่ระบุตำแหน่ง (พิมพ์เลือก หรือแตะบนแผนที่)";

  return (
    <div className="space-y-3">
      {/* เช็คอินทริปด้วย GPS — บันทึกลงฐานข้อมูล ปิดหน้าแล้วกลับมาต่อได้ */}
      <div className={`rounded-xl border p-3.5 text-[12.5px] ${openTrip ? "border-amber/60 bg-amber/5" : "border-brand/30 bg-ice/30"}`}>
        {openTrip ? (
          <>
            <p className="font-bold text-navy">🚗 ทริปกำลังเดินทาง (เช็คอินไว้แล้ว)</p>
            <p className="text-muted mt-1">
              📍 เริ่มต้น: <strong className="text-ink">{openTrip.start_place}</strong> · {tripTime(openTrip.start_at)}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <button type="button" onClick={checkinEnd} disabled={tripBusy}
                className="btn btn-primary text-[13px] py-2 px-3.5 disabled:opacity-60">
                {tripBusy ? "⏳ กำลังอ่านตำแหน่ง..." : "📍 ถึงแล้ว — เช็คอินจุดสิ้นสุด"}
              </button>
              <button type="button" onClick={cancelTrip} disabled={tripBusy}
                className="text-[12px] font-semibold text-muted hover:text-[#D94141] px-2">ยกเลิกทริป</button>
            </div>
          </>
        ) : (
          <div className="flex flex-wrap items-center gap-2.5">
            <button type="button" onClick={checkinStart} disabled={tripBusy}
              className="btn btn-outline text-[13px] py-2 px-3.5 disabled:opacity-60">
              {tripBusy ? "⏳ กำลังอ่านตำแหน่ง..." : "📍 เช็คอินจุดเริ่มต้น (ตำแหน่งปัจจุบัน)"}
            </button>
            <p className="text-[11.5px] text-muted flex-1 min-w-[200px]">
              กดตอนออกเดินทาง ระบบบันทึกไว้ในฐานข้อมูล — <strong>ปิดหน้า/ปิดมือถือได้</strong> ถึงปลายทางค่อยเปิดมากดเช็คอินอีกครั้ง ระบบจะคำนวณระยะทางให้เอง · หรือพิมพ์/ปักหมุดเองด้านล่างก็ได้
            </p>
          </div>
        )}
        {tripMsg && <p className={`mt-2 text-[12px] font-semibold ${tripMsg.startsWith("✅") ? "text-[#2E9E5B]" : "text-[#D94141]"}`}>{tripMsg}</p>}
      </div>
      <div>
        <label className="block font-semibold text-navy mb-1 text-[13.5px]">
          จุดเริ่มต้น
          {target === "from" && <span className="ml-1.5 text-[10.5px] font-bold bg-brand text-white rounded px-1.5 py-0.5 align-middle">กำลังปักหมุด</span>}
        </label>
        <Combo value={from.name} onChange={typeName("from")} onFocus={() => setTarget("from")} options={mapPlaces.map((pl) => pl.name)}
          placeholder="พิมพ์ค้นหาสถานที่..." className={`w-full rounded-lg border px-3 py-2 ${target === "from" ? "border-brand" : "border-ice"}`} />
        <p className={`mt-0.5 text-[11px] ${from.lat != null ? "text-sky" : "text-amber"}`}>{coordLabel(from)}</p>
      </div>
      <div>
        <label className="block font-semibold text-navy mb-1 text-[13.5px]">
          จุดสิ้นสุด
          {target === "to" && <span className="ml-1.5 text-[10.5px] font-bold bg-amber text-white rounded px-1.5 py-0.5 align-middle">กำลังปักหมุด</span>}
        </label>
        <Combo value={to.name} onChange={typeName("to")} onFocus={() => setTarget("to")} options={mapPlaces.map((pl) => pl.name)}
          placeholder="พิมพ์ค้นหาสถานที่..." className={`w-full rounded-lg border px-3 py-2 ${target === "to" ? "border-amber" : "border-ice"}`} />
        <p className={`mt-0.5 text-[11px] ${to.lat != null ? "text-sky" : "text-amber"}`}>{coordLabel(to)}</p>
      </div>

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

type DbRate = { key: string; label: string; lodging_cap: number; per_diem: number; sort: number };

function LodgingForm({ onTotal, empId }: { onTotal: (n: number) => void; empId: string }) {
  const [dbRates, setDbRates] = useState<DbRate[]>([]);
  const [me, setMe] = useState<{ position: string; lodging_cap: number | null; per_diem: number | null; name: string } | null>(null);
  const [nights, setNights] = useState(1);
  const [rate, setRate] = useState(0);
  const [days, setDays] = useState(1);

  useEffect(() => {
    if (!supabase) return;
    supabase.from("expense_rates").select("*").order("sort").then(({ data }) => setDbRates((data as DbRate[]) ?? []));
    if (empId) {
      supabase.from("employees").select("name,position,lodging_cap,per_diem").eq("id", empId).single()
        .then(({ data }) => setMe(data as typeof me));
    }
  }, [empId]);

  const posRate = dbRates.find((r) => r.key === me?.position);
  // อัตราที่ใช้จริง: เฉพาะบุคคล (ถ้าตั้งไว้) > ตามตำแหน่ง
  const lodgingCap = me?.lodging_cap ?? posRate?.lodging_cap ?? expenseRatesByPosition[0].lodgingCap;
  const perDiem = me?.per_diem ?? posRate?.per_diem ?? expenseRatesByPosition[0].perDiem;
  const hasPersonal = me?.lodging_cap != null || me?.per_diem != null;

  const total = nights * rate + days * perDiem;
  onTotal(total);

  return (
    <div className="space-y-3">
      <div className="rounded-xl bg-ice/50 p-3.5 space-y-2.5">
        <p className="text-[12px] font-bold text-navy">
          🏨 อัตราของคุณ ({posRate?.label ?? me?.position ?? "..."}) — เพดานที่พัก {fmt(lodgingCap)}฿/คืน · เบี้ยเลี้ยง {fmt(perDiem)}฿/วัน
          {hasPersonal && <span className="ml-1.5 text-[10px] font-bold bg-amber/15 text-amber rounded px-1.5 py-0.5">อัตราเฉพาะบุคคล</span>}
        </p>
        <p className="text-[11px] text-muted/70">ดึงจากโปรไฟล์พนักงานอัตโนมัติ — แอดมินตั้งค่าได้ที่หน้าจัดการผู้ใช้</p>
        <NumField label="จำนวนคืนที่พัก" value={nights} onChange={setNights} suffix="คืน" />
        <NumField label="ค่าที่พักจริง/คืน (ตามใบเสร็จ)" value={rate} onChange={setRate} suffix="฿" />
        <NumField label={`เบี้ยเลี้ยง ${fmt(perDiem)}฿/วัน — จำนวนวัน`} value={days} onChange={setDays} suffix="วัน" />
        {rate > lodgingCap && (
          <p className="text-[11.5px] text-amber font-semibold">⚠ เกินเพดานที่พักของคุณ ({fmt(lodgingCap)}฿/คืน) — ต้องให้ผู้บริหารอนุมัติพิเศษ</p>
        )}
      </div>
      {/* ตารางอัตราทุกตำแหน่ง (จากที่แอดมินตั้งค่า) */}
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
              {dbRates.map((x, i) => (
                <tr key={x.key} className={i % 2 ? "bg-ice/30" : ""}>
                  <td className="px-2.5 py-1.5">{x.label}</td>
                  <td className="px-2.5 py-1.5 text-right">{fmt(x.lodging_cap)} ฿</td>
                  <td className="px-2.5 py-1.5 text-right">{fmt(x.per_diem)} ฿</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-1 text-[11px] text-muted/70 italic">แอดมินแก้อัตราได้ที่หน้าจัดการผู้ใช้ · อัตราเฉพาะบุคคลตั้งได้รายคน</p>
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
function RefPicker({ onChange }: { onChange?: (v: string) => void }) {
  const [ref, setRefState] = useState("");
  const [other, setOtherState] = useState("");
  const setRef = (v: string) => { setRefState(v); onChange?.(v === "__other__" ? other : v); };
  const setOther = (v: string) => { setOtherState(v); onChange?.(v); };
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

function ClaimForm({ empId, onSaved }: { empId: string; onSaved: () => void }) {
  const [cat, setCat] = useState<ExpenseCategoryKey>("travel");
  const [purpose, setPurpose] = useState("");
  const [refDoc, setRefDoc] = useState("");
  const [receiptUrls, setReceiptUrls] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const totalRef = useRef(0);
  const [, force] = useState(0);
  const setTotal = (n: number) => {
    if (totalRef.current !== n) { totalRef.current = n; setTimeout(() => force((x) => x + 1), 0); }
  };
  const meta = catMeta(cat);

  const submit = async () => {
    if (!supabase || !empId) { setMsg({ ok: false, text: "ยังไม่ได้เข้าสู่ระบบ" }); return; }
    if (totalRef.current <= 0) { setMsg({ ok: false, text: "ยอดเบิกยังเป็น 0 — กรอกข้อมูลค่าใช้จ่ายก่อน" }); return; }
    if (meta.receipt && receiptUrls.length === 0) { setMsg({ ok: false, text: "หมวดนี้บังคับแนบรูปใบเสร็จ" }); return; }
    setSaving(true); setMsg(null);
    const { error } = await supabase.from("expense_claims").insert({
      emp_id: empId, category: cat, detail: purpose.trim() || null, ref_doc: refDoc || null,
      amount: totalRef.current, receipt_url: receiptUrls[0] ?? null, receipt_urls: receiptUrls, status: "รออนุมัติ",
    });
    setSaving(false);
    if (error) { setMsg({ ok: false, text: String(error.message) }); return; }
    setMsg({ ok: true, text: "✅ ส่งเบิกแล้ว — รอหัวหน้าอนุมัติ" });
    setPurpose(""); setReceiptUrls([]); totalRef.current = 0; force((x) => x + 1);
    onSaved();
  };

  return (
    <div className="card-white p-4 min-[600px]:p-5 min-w-0">
      <p className="font-bold text-navy text-[15px]">สร้างรายการเบิกใหม่</p>

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
          <input value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="เช่น Site Survey ลูกค้าใหม่"
            className="w-full rounded-lg border border-ice px-3 py-2" />
        </div>
        <RefPicker onChange={setRefDoc} />

        {cat === "travel" && <TravelForm onTotal={setTotal} empId={empId} />}
        {cat === "lodging" && <LodgingForm onTotal={setTotal} empId={empId} />}
        {cat === "entertain" && <EntertainForm onTotal={setTotal} />}
        {cat === "supplies" && <SimpleAmountForm placeholder="รายการวัสดุ/อุปกรณ์ที่ซื้อ + ร้านค้า" onTotal={setTotal} />}
        {cat === "training" && <SimpleAmountForm placeholder="ชื่อหลักสูตร/งานสัมมนา + ผู้จัด" onTotal={setTotal} />}
        {cat === "shipping" && <SimpleAmountForm placeholder="ส่งอะไร ถึงใคร ผู้ให้บริการ" onTotal={setTotal} />}
        {cat === "other" && <SimpleAmountForm placeholder="ระบุรายละเอียดค่าใช้จ่าย" onTotal={setTotal} />}

        <ReceiptUpload key={cat} required={meta.receipt} onUrls={setReceiptUrls} />

        <div className="flex items-center justify-between border-t border-ice pt-3">
          <span className="text-muted">ยอดเบิกรวม</span>
          <span className="text-[20px] font-bold text-navy">{fmt(totalRef.current)} ฿</span>
        </div>
        {msg && (
          <p className={`text-[12.5px] rounded-lg px-3 py-2 ${msg.ok ? "bg-[#2E9E5B]/10 text-[#2E9E5B]" : "bg-[#D94141]/10 text-[#D94141]"}`}>{msg.text}</p>
        )}
        <button onClick={submit} disabled={saving} className="btn btn-primary text-[13.5px] py-2 w-full disabled:opacity-60">
          {saving ? "กำลังส่ง..." : "ส่งขออนุมัติ"}
        </button>
        <p className="text-[11px] text-muted/70 italic">{expensePolicy.note}</p>
      </div>
    </div>
  );
}

type DbClaim = {
  id: number; emp_id: string; category: string; detail: string | null; ref_doc: string | null;
  amount: number; receipt_url: string | null; receipt_urls: string[]; status: string; approver_note: string | null;
  approved_by: string | null; created_at: string;
};

const claimReceipts = (c: DbClaim): string[] =>
  Array.isArray(c.receipt_urls) && c.receipt_urls.length > 0 ? c.receipt_urls : (c.receipt_url ? [c.receipt_url] : []);

// เปิดหน้าพิมพ์หลักฐานการเบิก (ข้อมูลรายการ + รูปใบเสร็จทุกใบ) — ฝ่ายการเงินสั่งพิมพ์/บันทึก PDF ได้
function printClaimEvidence(c: DbClaim, empName: string, catLabel: string, approverName: string) {
  const receipts = claimReceipts(c);
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const dt = new Date(c.created_at).toLocaleString("th-TH", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });
  const html = `<!doctype html><html lang="th"><head><meta charset="utf-8"><title>EXP-${String(c.id).padStart(3, "0")}</title>
  <style>
    * { font-family: 'Segoe UI', Tahoma, sans-serif; box-sizing: border-box; }
    body { margin: 0; padding: 24px 32px; color: #12212E; font-size: 13.5px; }
    table.info td { padding: 4px 10px 4px 0; vertical-align: top; }
    .lbl { color: #4A5E6E; width: 130px; }
    img.receipt { max-width: 100%; max-height: 850px; border: 1px solid #D7E4F0; border-radius: 6px; margin-top: 8px; }
    .page { page-break-before: always; padding-top: 12px; }
    @media print { body { padding: 8mm 10mm; } }
  </style></head><body>
  <h2 style="margin:0 0 2px">หลักฐานการเบิกค่าใช้จ่าย — EXP-${String(c.id).padStart(3, "0")}</h2>
  <p style="margin:0 0 12px;color:#4A5E6E;font-size:12px">CONSERTECH CO., LTD. · พิมพ์เมื่อ ${new Date().toLocaleString("th-TH")}</p>
  <table class="info">
    <tr><td class="lbl">พนักงาน</td><td><strong>${esc(empName)}</strong></td><td class="lbl">วันที่ยื่น</td><td>${dt}</td></tr>
    <tr><td class="lbl">หมวด</td><td>${esc(catLabel)}</td><td class="lbl">สถานะ</td><td><strong>${esc(c.status)}</strong>${approverName ? ` (โดย ${esc(approverName)})` : ""}</td></tr>
    <tr><td class="lbl">วัตถุประสงค์</td><td>${esc(c.detail ?? "-")}</td><td class="lbl">อ้างอิง</td><td>${esc(c.ref_doc ?? "-")}</td></tr>
    <tr><td class="lbl">ยอดเบิก</td><td colspan="3" style="font-size:17px;font-weight:800">${Number(c.amount).toLocaleString("th-TH")} บาท</td></tr>
  </table>
  ${receipts.length === 0 ? '<p style="color:#8A9BA8;margin-top:16px">— รายการนี้ไม่มีรูปใบเสร็จแนบ —</p>' : receipts.map((u, i) => `
    <div class="${i > 0 ? "page" : ""}" style="margin-top:14px">
      <p style="font-weight:700;margin:0">📎 หลักฐานที่ ${i + 1} / ${receipts.length}</p>
      <img class="receipt" src="${u}">
    </div>`).join("")}
  <script>window.onload = () => setTimeout(() => window.print(), 600);</script>
  </body></html>`;
  const w = window.open("", "_blank");
  if (!w) { alert("เบราว์เซอร์บล็อกป๊อปอัป — อนุญาตป๊อปอัปเพื่อพิมพ์"); return; }
  w.document.write(html);
  w.document.close();
}

function ExpensesBody() {
  const { dept, empId } = useDept();
  const canApprove = dept === "admin" || dept === "management";
  const [claims, setClaims] = useState<DbClaim[]>([]);
  const [empNames, setEmpNames] = useState<Record<string, string>>({});

  const load = async () => {
    if (!supabase) return;
    const [c, e] = await Promise.all([
      supabase.from("expense_claims").select("*").order("created_at", { ascending: false }).limit(50),
      supabase.from("employees").select("id,name"),
    ]);
    setClaims((c.data as DbClaim[]) ?? []);
    setEmpNames(Object.fromEntries(((e.data as { id: string; name: string }[]) ?? []).map((x) => [x.id, x.name])));
  };
  useEffect(() => { load(); }, []);

  const decide = async (c: DbClaim, status: string) => {
    if (!supabase) return;
    await supabase.from("expense_claims").update({ status, approved_by: empId || null }).eq("id", c.id);
    load();
  };

  const pending = claims.filter((c) => c.status === "รออนุมัติ");
  const now = new Date();
  const monthTotal = claims
    .filter((c) => { const d = new Date(c.created_at); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear() && c.status !== "ตีกลับ"; })
    .reduce((a, c) => a + Number(c.amount), 0);
  const fmtDT = (iso: string) => new Date(iso).toLocaleDateString("th-TH", { day: "numeric", month: "short" });

  return (
    <>
      <div className="grid gap-4 grid-cols-2 min-[900px]:grid-cols-3 mb-5">
        <div className="card-white p-4 min-w-0"><p className="text-[12px] text-muted">ยอดเบิกเดือนนี้ (ทีม)</p><p className="text-[22px] font-bold text-navy">{fmt(monthTotal)} ฿</p></div>
        <div className="card-white p-4 min-w-0"><p className="text-[12px] text-muted">รออนุมัติ</p><p className="text-[22px] font-bold text-amber">{pending.length} รายการ</p></div>
        <div className="card-white p-4 min-w-0 col-span-2 min-[900px]:col-span-1"><p className="text-[12px] text-muted">อัตรารถส่วนตัว</p><p className="text-[22px] font-bold text-navy">{expensePolicy.kmRate} ฿/กม.</p></div>
      </div>

      <div className="grid gap-5 min-[1040px]:grid-cols-[400px_1fr] items-start">
        <ClaimForm empId={empId} onSaved={load} />

        <div className="card-white overflow-hidden min-w-0">
          <p className="px-4 min-[600px]:px-5 pt-4 pb-2 font-bold text-navy">รายการเบิกล่าสุด <span className="text-sky text-[12.5px]">({claims.length})</span></p>
          <div className="divide-y divide-ice">
            {claims.map((c) => {
              const m = catMeta(c.category as ExpenseCategoryKey) ?? expenseCategories.at(-1)!;
              return (
                <div key={c.id} className="px-4 min-[600px]:px-5 py-3.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[13.5px] font-bold text-navy">
                        <span className="text-sky">EXP-{String(c.id).padStart(3, "0")}</span> · {empNames[c.emp_id] ?? c.emp_id}
                      </p>
                      <p className="text-[12px] mt-0.5">
                        <span className="inline-block text-[10.5px] font-bold bg-ice text-navy rounded px-1.5 py-0.5 mr-1.5">{m.icon} {m.label}</span>
                        <span className="text-muted">{c.detail ?? "-"}</span>
                      </p>
                      <p className="text-[11.5px] text-muted/80 mt-0.5">
                        {c.ref_doc ? `อ้างอิง ${c.ref_doc} · ` : ""}{fmtDT(c.created_at)}
                        {c.approved_by && c.status !== "รออนุมัติ" && ` · โดย ${empNames[c.approved_by] ?? c.approved_by}`}
                      </p>
                      {claimReceipts(c).length > 0 && (
                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                          {claimReceipts(c).map((u, i) => (
                            <a key={i} href={u} target="_blank" rel="noreferrer" title={`เปิดใบเสร็จที่ ${i + 1} (คลิกขวา > Save เพื่อดาวน์โหลด)`}>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={u} alt={`ใบเสร็จ ${i + 1}`} className="w-12 h-12 object-cover rounded-lg border border-ice hover:border-brand transition" />
                            </a>
                          ))}
                          <button onClick={() => printClaimEvidence(c, empNames[c.emp_id] ?? c.emp_id, `${m.icon} ${m.label}`, c.approved_by ? (empNames[c.approved_by] ?? "") : "")}
                            className="text-[10.5px] font-bold bg-ice text-navy rounded px-2 py-1 hover:bg-sky/20" title="พิมพ์หลักฐานการเบิกพร้อมรูปใบเสร็จทุกใบ">
                            🖨 พิมพ์หลักฐาน
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-navy">{fmt(Number(c.amount))} ฿</p>
                      <span className={`inline-block mt-1 text-[10.5px] font-bold rounded px-2 py-0.5 ${
                        c.status === "รออนุมัติ" ? "bg-amber/15 text-amber" : c.status === "ตีกลับ" ? "bg-[#D94141]/10 text-[#D94141]" : "bg-[#2E9E5B]/15 text-[#2E9E5B]"
                      }`}>{c.status}</span>
                      {canApprove && c.status === "รออนุมัติ" && (
                        <div className="flex gap-1.5 mt-1.5 justify-end">
                          <button onClick={() => decide(c, "อนุมัติแล้ว")} className="text-[11px] font-bold text-white bg-brand rounded px-2 py-1 hover:bg-navy">อนุมัติ</button>
                          <button onClick={() => decide(c, "ตีกลับ")} className="text-[11px] font-bold text-muted bg-ice rounded px-2 py-1 hover:bg-[#D94141]/10 hover:text-[#D94141]">ตีกลับ</button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            {claims.length === 0 && <p className="px-5 py-8 text-center text-[12.5px] text-muted/70">ยังไม่มีรายการเบิก</p>}
          </div>
        </div>
      </div>
    </>
  );
}

export default function ExpensesPage() {
  return (
    <StaffShell title="เบิกค่าใช้จ่าย">
      <ExpensesBody />
    </StaffShell>
  );
}
