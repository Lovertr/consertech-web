"use client";

// โมดูลข้อมูลการทำงาน — ลงเวลาเข้า/เลิกงาน (Check In/Out + ตำแหน่ง GPS) + OT อัตโนมัติ + การลา

import { useCallback, useEffect, useRef, useState } from "react";
import StaffShell, { useDept } from "@/components/staff/StaffShell";
import { supabase } from "@/lib/supabase";
import "leaflet/dist/leaflet.css";
import {
  attendanceLog, workSchedule, mapPlaces, roadKm,
  type AttendanceRecord,
} from "@/lib/staffData";

const LEAVE_TYPES = ["ลาพักร้อน", "ลาป่วย", "ลากิจ"] as const;

type Stamp = { time: string; dateLabel: string; coords: string | null; place: string; lat?: number | null; lng?: number | null };

function nearPlace(lat: number, lng: number): string | null {
  let best: { name: string; d: number } | null = null;
  for (const pl of mapPlaces) {
    const d = roadKm({ lat, lng }, { lat: pl.lat, lng: pl.lng });
    if (!best || d < best.d) best = { name: pl.name, d };
  }
  return best && best.d <= 2 ? best.name : null;
}

// ชื่อสถานที่: สถานที่ที่บันทึกไว้ก่อน → ไม่เจอค่อยถามบริการแผนที่ (Nominatim/OSM — เดโมฟรี; ระบบจริงใช้ Google Maps)
async function placeName(lat: number, lng: number): Promise<string> {
  const known = nearPlace(lat, lng);
  if (known) return known;
  try {
    const r = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=th&zoom=16`,
      { signal: AbortSignal.timeout(6000) }
    );
    if (r.ok) {
      const j = await r.json();
      if (j?.name) return j.name;
      if (j?.display_name) return String(j.display_name).split(",").slice(0, 3).join(",").trim();
    }
  } catch {}
  return "ตำแหน่งปัจจุบัน (นอกพื้นที่ที่บันทึกไว้)";
}

// แผนที่เล็กแสดงจุด Check In / Check Out
function MiniMap({ pins }: { pins: { lat: number; lng: number; label: string; color: string }[] }) {
  const divRef = useRef<HTMLDivElement>(null);
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const mapRef = useRef<any>(null);
  const LRef = useRef<any>(null);
  const layerRef = useRef<any>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const mod: any = await import("leaflet");
      const L = mod.default ?? mod;
      if (cancelled || !divRef.current || mapRef.current) return;
      LRef.current = L;
      const map = L.map(divRef.current, { attributionControl: false, zoomControl: false }).setView([13.8933, 100.5161], 14);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 18 }).addTo(map);
      L.control.attribution({ prefix: false }).addAttribution("© OpenStreetMap").addTo(map);
      layerRef.current = L.layerGroup().addTo(map);
      mapRef.current = map;
    })();
    return () => { cancelled = true; if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; } };
  }, []);

  useEffect(() => {
    const L = LRef.current, map = mapRef.current, layer = layerRef.current;
    if (!L || !map || !layer) return;
    layer.clearLayers();
    const pts: [number, number][] = [];
    for (const pin of pins) {
      const icon = L.divIcon({
        className: "",
        html: `<div style="background:${pin.color};color:#fff;font-size:10.5px;font-weight:700;border-radius:10px;padding:1.5px 7px;white-space:nowrap;box-shadow:0 1px 4px rgba(0,0,0,.45);transform:translate(-50%,-100%)">📍 ${pin.label}</div>`,
        iconSize: [0, 0],
      });
      L.marker([pin.lat, pin.lng], { icon }).addTo(layer);
      pts.push([pin.lat, pin.lng]);
    }
    if (pts.length >= 2) map.fitBounds(pts, { padding: [40, 40], maxZoom: 16 });
    else if (pts.length === 1) map.setView(pts[0], 15);
  }, [pins]);
  /* eslint-enable @typescript-eslint/no-explicit-any */

  return <div ref={divRef} className="relative z-0 h-44 w-full rounded-xl border border-ice overflow-hidden" />;
}

function fmtTime(d: Date) {
  return d.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });
}
function fmtDate(d: Date) {
  return d.toLocaleDateString("th-TH", { weekday: "short", day: "numeric", month: "short", year: "2-digit" });
}

// คำนวณ OT: เวลาหลังเลิกงานปกติ → เวลา Check Out
function calcOt(checkOut: Date): string | null {
  const [eh, em] = workSchedule.end.split(":").map(Number);
  const end = new Date(checkOut);
  end.setHours(eh, em, 0, 0);
  const diffMin = Math.floor((checkOut.getTime() - end.getTime()) / 60000);
  if (diffMin < 30) return null; // ต่ำกว่า 30 นาทีไม่นับ (นโยบายสมมุติ)
  return `${Math.floor(diffMin / 60)} ชม. ${diffMin % 60} น.`;
}

function TimeClock({ onSaved }: { onSaved?: () => void }) {
  const { empId } = useDept();
  const [inStamp, setInStamp] = useState<Stamp | null>(null);
  const [outStamp, setOutStamp] = useState<Stamp | null>(null);
  const [ot, setOt] = useState<string | null>(null);
  const [locating, setLocating] = useState<"in" | "out" | null>(null);
  const [openId, setOpenId] = useState<number | null>(null); // แถว attendance ที่ยังไม่ Check Out
  const [otEnabled, setOtEnabled] = useState(true);

  // โหลดสถานะจากฐานข้อมูล: กะที่ค้างอยู่ (เผื่อรีเฟรช/เปลี่ยนเครื่อง) + สิทธิ์ OT ของพนักงาน
  useEffect(() => {
    setInStamp(null); setOutStamp(null); setOt(null); setOpenId(null);
    if (!supabase) return;
    (async () => {
      const { data: emp } = await supabase.from("employees").select("ot_enabled").eq("id", empId).single();
      if (emp) setOtEnabled(emp.ot_enabled);
      const { data } = await supabase
        .from("attendance").select("*").eq("emp_id", empId).is("check_out", null)
        .order("check_in", { ascending: false }).limit(1);
      const row = data?.[0];
      if (row) {
        const d = new Date(row.check_in);
        setInStamp({ time: fmtTime(d), dateLabel: fmtDate(d), coords: row.in_lat ? `${row.in_lat.toFixed(5)}, ${row.in_lng.toFixed(5)}` : null, place: row.in_place ?? "", lat: row.in_lat, lng: row.in_lng });
        setOpenId(row.id);
      }
    })();
  }, [empId]);

  const stamp = (which: "in" | "out") => {
    setLocating(which);
    const finish = async (coords: string | null, place: string, lat: number | null, lng: number | null) => {
      const now = new Date();
      const s: Stamp = { time: fmtTime(now), dateLabel: fmtDate(now), coords, place, lat, lng };
      if (which === "in") {
        setInStamp(s);
        if (supabase) {
          const { data } = await supabase.from("attendance")
            .insert({ emp_id: empId, in_lat: lat, in_lng: lng, in_place: place })
            .select("id").single();
          if (data) setOpenId(data.id);
        }
      } else {
        setOutStamp(s);
        const otText = otEnabled ? calcOt(now) : null;
        setOt(otText);
        if (supabase && openId != null) {
          const [eh, em] = workSchedule.end.split(":").map(Number);
          const end = new Date(now); end.setHours(eh, em, 0, 0);
          const otMin = otEnabled ? Math.max(Math.floor((now.getTime() - end.getTime()) / 60000), 0) : 0;
          await supabase.from("attendance").update({
            check_out: now.toISOString(), out_lat: lat, out_lng: lng, out_place: place,
            ot_minutes: otMin >= 30 ? otMin : 0,
          }).eq("id", openId);
          onSaved?.();
        }
      }
      setLocating(null);
    };
    if (typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => finish(
          `${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}`,
          await placeName(pos.coords.latitude, pos.coords.longitude),
          pos.coords.latitude, pos.coords.longitude
        ),
        () => finish(`${mapPlaces[0].lat}, ${mapPlaces[0].lng} (เดโม)`, "สำนักงาน CONSERTECH — ไม่ได้รับอนุญาตตำแหน่ง ใช้พิกัดสำนักงาน", mapPlaces[0].lat, mapPlaces[0].lng),
        { timeout: 6000 }
      );
    } else {
      finish(`${mapPlaces[0].lat}, ${mapPlaces[0].lng} (เดโม)`, "สำนักงาน CONSERTECH (พิกัดจำลอง)", mapPlaces[0].lat, mapPlaces[0].lng);
    }
  };

  const working = inStamp && !outStamp;

  return (
    <div className="card-white p-4 min-[600px]:p-5 min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-bold text-navy text-[15px]">ลงเวลาวันนี้</p>
        <span className={`text-[11px] font-bold rounded px-2 py-0.5 ${
          outStamp ? "bg-ice text-muted" : working ? "bg-brand/10 text-brand" : "bg-amber/15 text-amber"
        }`}>
          {outStamp ? "เลิกงานแล้ว" : working ? "● กำลังทำงาน" : "ยังไม่ได้ Check In"}
        </span>
      </div>
      <p className="text-[11.5px] text-muted mt-0.5">เวลางานปกติ {workSchedule.start} – {workSchedule.end} น. — ระบบบันทึกวันเวลา + ตำแหน่ง ณ จุดที่กดอัตโนมัติ</p>

      <div className="mt-4 grid grid-cols-2 gap-3">
        {/* Check In */}
        <div className="rounded-xl border border-ice p-3 min-w-0">
          <button
            onClick={() => stamp("in")}
            disabled={!!inStamp || locating === "in"}
            className={`w-full rounded-xl py-3 text-[14px] font-bold transition ${
              inStamp ? "bg-ice text-muted" : "bg-brand text-white hover:bg-navy"
            }`}
          >
            {locating === "in" ? "📍 กำลังระบุตำแหน่ง..." : inStamp ? "✓ Check In แล้ว" : "🟢 Check In เข้างาน"}
          </button>
          {inStamp && (
            <div className="mt-2 text-[11.5px] leading-relaxed">
              <p className="font-bold text-navy text-[15px]">{inStamp.time} น.</p>
              <p className="text-muted">{inStamp.dateLabel}</p>
              <p className="text-sky mt-0.5">📍 {inStamp.place}</p>
              {inStamp.coords && <p className="text-muted/70">({inStamp.coords})</p>}
            </div>
          )}
        </div>
        {/* Check Out */}
        <div className="rounded-xl border border-ice p-3 min-w-0">
          <button
            onClick={() => stamp("out")}
            disabled={!inStamp || !!outStamp || locating === "out"}
            className={`w-full rounded-xl py-3 text-[14px] font-bold transition ${
              !inStamp || outStamp ? "bg-ice text-muted" : "bg-amber text-white hover:opacity-90"
            }`}
          >
            {locating === "out" ? "📍 กำลังระบุตำแหน่ง..." : outStamp ? "✓ Check Out แล้ว" : "🔴 Check Out เลิกงาน"}
          </button>
          {outStamp && (
            <div className="mt-2 text-[11.5px] leading-relaxed">
              <p className="font-bold text-navy text-[15px]">{outStamp.time} น.</p>
              <p className="text-muted">{outStamp.dateLabel}</p>
              <p className="text-sky mt-0.5">📍 {outStamp.place}</p>
              {outStamp.coords && <p className="text-muted/70">({outStamp.coords})</p>}
            </div>
          )}
        </div>
      </div>

      {/* แผนที่จุดลงเวลา */}
      {(inStamp?.lat != null || outStamp?.lat != null) && (
        <div className="mt-3">
          <MiniMap pins={[
            ...(inStamp?.lat != null && inStamp?.lng != null ? [{ lat: inStamp.lat, lng: inStamp.lng, label: `เข้า ${inStamp.time}`, color: "#15659E" }] : []),
            ...(outStamp?.lat != null && outStamp?.lng != null ? [{ lat: outStamp.lat, lng: outStamp.lng, label: `ออก ${outStamp.time}`, color: "#F0A030" }] : []),
          ]} />
        </div>
      )}

      {/* OT อัตโนมัติ */}
      {outStamp && (
        <div className={`mt-3 rounded-xl px-3.5 py-2.5 text-[12.5px] ${ot ? "bg-amber/10 border border-amber/40" : "bg-ice/50"}`}>
          {ot ? (
            <p><strong className="text-navy">⏱ OT อัตโนมัติ:</strong> เลิกงานปกติ {workSchedule.end} → Check Out {outStamp.time} = <strong className="text-amber">{ot}</strong> <span className="text-[10.5px] font-bold bg-amber/15 text-amber rounded px-1.5 py-0.5 ml-1">ส่งขออนุมัติแล้ว</span></p>
          ) : (
            <p className="text-muted">ไม่มี OT วันนี้ (Check Out ก่อน/ภายใน 30 นาทีหลังเวลาเลิกงาน)</p>
          )}
        </div>
      )}
      <p className="mt-2 text-[11px] text-muted/70 italic">
        {supabase ? "🟢 บันทึกลงฐานข้อมูลจริง (Supabase) — รีเฟรช/เปลี่ยนเครื่องก็ยังจำกะที่ค้างอยู่" : "โหมดเดโม — ยังไม่เชื่อมฐานข้อมูล"} · OT คิดเฉพาะพนักงานที่เปิดสิทธิ์ (ตั้งที่หน้าจัดการผู้ใช้) · GPS ใช้ยืนยันการทำงานที่ไซต์งาน
      </p>
    </div>
  );
}

function AttendanceHistory({ refreshKey }: { refreshKey: number }) {
  const { empId } = useDept();
  const [rows, setRows] = useState<AttendanceRecord[]>(attendanceLog);
  const [fromDb, setFromDb] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    (async () => {
      const { data } = await supabase
        .from("attendance").select("*").eq("emp_id", empId)
        .order("check_in", { ascending: false }).limit(7);
      if (data) {
        setRows(data.map((r) => {
          const din = new Date(r.check_in);
          const dout = r.check_out ? new Date(r.check_out) : null;
          const mins = dout ? Math.floor((dout.getTime() - din.getTime()) / 60000) : null;
          return {
            date: din.toLocaleDateString("th-TH", { weekday: "short", day: "numeric", month: "short" }),
            checkIn: fmtTime(din),
            checkOut: dout ? fmtTime(dout) : null,
            inPlace: r.in_place ?? "-",
            outPlace: r.out_place ?? undefined,
            hours: mins != null ? `${Math.floor(mins / 60)} ชม. ${mins % 60} น.` : undefined,
            ot: r.ot_minutes ? `${Math.floor(r.ot_minutes / 60)} ชม. ${r.ot_minutes % 60} น.` : null,
          };
        }));
        setFromDb(true);
      }
    })();
  }, [empId, refreshKey]);

  return (
    <div className="card-white overflow-hidden min-w-0">
      <p className="px-4 min-[600px]:px-5 pt-4 pb-2 font-bold text-navy">ประวัติการลงเวลา {fromDb ? "(จากฐานข้อมูลจริง)" : "(ตัวอย่าง)"}</p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-[12.5px]">
          <thead>
            <tr className="bg-ice/70 text-navy">
              {["วันที่", "เข้า", "ออก", "สถานที่", "ชั่วโมงงาน", "OT"].map((h) => (
                <th key={h} className="text-left px-4 py-2.5 font-bold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((a, i) => (
              <tr key={i} className={i % 2 ? "bg-ice/30" : ""}>
                <td className="px-4 py-2.5 font-semibold text-navy whitespace-nowrap">{a.date}</td>
                <td className="px-4 py-2.5 text-brand font-semibold">{a.checkIn}</td>
                <td className="px-4 py-2.5 text-muted">{a.checkOut ?? "—"}</td>
                <td className="px-4 py-2.5 text-muted">{a.inPlace}{a.outPlace && a.outPlace !== a.inPlace ? ` → ${a.outPlace}` : ""}</td>
                <td className="px-4 py-2.5 text-muted whitespace-nowrap">{a.hours ?? "—"}</td>
                <td className="px-4 py-2.5 whitespace-nowrap">
                  {a.ot ? <span className="text-[11px] font-bold bg-amber/15 text-amber rounded px-2 py-0.5">{a.ot}</span> : <span className="text-muted/50">—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="px-4 min-[600px]:px-5 py-3 text-[11.5px] text-muted/70 italic border-t border-ice">
        {rows.length === 0 ? "ยังไม่มีประวัติ — กด Check In ครั้งแรกได้เลย · " : ""}ระบบจริงส่งยอด OT เข้าโมดูลการเงิน/เงินเดือนอัตโนมัติ
      </p>
    </div>
  );
}

// ── ยื่นลงเวลาย้อนหลัง (ลืมลงเวลา) — รอหัวหน้าอนุมัติ ──
type TimeReq = {
  id: number; emp_id: string; work_date: string; check_in_time: string;
  check_out_time: string | null; reason: string | null; status: string; created_at: string;
};

function BackfillSection({ onApproved }: { onApproved: () => void }) {
  const { empId, dept } = useDept();
  const isSupervisor = dept === "admin" || dept === "management";
  const [myReqs, setMyReqs] = useState<TimeReq[]>([]);
  const [pending, setPending] = useState<(TimeReq & { emp_name?: string })[]>([]);
  const [form, setForm] = useState({ date: "", tin: "", tout: "", reason: "" });
  const [msg, setMsg] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!supabase) return;
    const { data: mine } = await supabase.from("time_entry_requests").select("*")
      .eq("emp_id", empId).order("created_at", { ascending: false }).limit(5);
    setMyReqs((mine as TimeReq[]) ?? []);
    if (isSupervisor) {
      const { data: pend } = await supabase.from("time_entry_requests")
        .select("*, employees(name)").eq("status", "รออนุมัติ").order("created_at");
      setPending(((pend ?? []) as (TimeReq & { employees: { name: string } | null })[]).map(r => ({ ...r, emp_name: r.employees?.name })));
    }
  }, [empId, isSupervisor]);
  useEffect(() => { reload(); }, [reload]);

  const submit = async () => {
    if (!supabase || !form.date || !form.tin) { setMsg("⚠ กรอกวันที่และเวลาเข้างานเป็นอย่างน้อย"); return; }
    const { error } = await supabase.from("time_entry_requests").insert({
      emp_id: empId, work_date: form.date, check_in_time: form.tin,
      check_out_time: form.tout || null, reason: form.reason.trim() || null,
    });
    if (error) { setMsg("⚠ " + error.message); return; }
    setMsg("✓ ส่งคำขอแล้ว — รอหัวหน้างานอนุมัติ");
    setForm({ date: "", tin: "", tout: "", reason: "" });
    reload();
  };

  const review = async (r: TimeReq, approve: boolean) => {
    if (!supabase) return;
    await supabase.from("time_entry_requests")
      .update({ status: approve ? "อนุมัติแล้ว" : "ตีกลับ", reviewed_by: empId }).eq("id", r.id);
    if (approve) {
      // สร้างแถวลงเวลาจริงจากคำขอ + คำนวณ OT ถ้าพนักงานเปิดสิทธิ์
      const cin = new Date(`${r.work_date}T${r.check_in_time}`);
      const cout = r.check_out_time ? new Date(`${r.work_date}T${r.check_out_time}`) : null;
      let otMin = 0;
      if (cout) {
        const { data: emp } = await supabase.from("employees").select("ot_enabled").eq("id", r.emp_id).single();
        if (emp?.ot_enabled) {
          const [eh, em] = workSchedule.end.split(":").map(Number);
          const end = new Date(cout); end.setHours(eh, em, 0, 0);
          const m = Math.floor((cout.getTime() - end.getTime()) / 60000);
          otMin = m >= 30 ? m : 0;
        }
      }
      await supabase.from("attendance").insert({
        emp_id: r.emp_id, check_in: cin.toISOString(),
        in_place: "ยื่นย้อนหลัง (อนุมัติแล้ว)",
        check_out: cout ? cout.toISOString() : null,
        out_place: cout ? "ยื่นย้อนหลัง (อนุมัติแล้ว)" : null,
        ot_minutes: otMin || null,
      });
      onApproved();
    }
    reload();
  };

  const stColor = (st: string) =>
    st === "รออนุมัติ" ? "bg-amber/15 text-amber" : st === "อนุมัติแล้ว" ? "bg-brand/10 text-brand" : "bg-ice text-muted";

  return (
    <div className="grid gap-5 min-[1040px]:grid-cols-2 items-start mb-6">
      {/* ฟอร์มยื่น */}
      <div className="card-white p-4 min-[600px]:p-5 min-w-0">
        <p className="font-bold text-navy text-[15px]">📝 ยื่นลงเวลาย้อนหลัง (กรณีลืมลงเวลา)</p>
        <p className="text-[11.5px] text-muted mt-0.5">ระบุวัน-เวลาที่ทำงานจริง — มีผลเมื่อหัวหน้างานอนุมัติแล้วเท่านั้น</p>
        <div className="mt-3 grid grid-cols-2 gap-2.5 text-[13px]">
          <div className="col-span-2">
            <label className="block font-semibold text-navy mb-1">วันที่ทำงาน</label>
            <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })}
              className="w-full rounded-lg border border-ice px-3 py-2" />
          </div>
          <div>
            <label className="block font-semibold text-navy mb-1">เวลาเข้างาน</label>
            <input type="time" value={form.tin} onChange={(e) => setForm({ ...form, tin: e.target.value })}
              className="w-full rounded-lg border border-ice px-3 py-2" />
          </div>
          <div>
            <label className="block font-semibold text-navy mb-1">เวลาเลิกงาน (ถ้ามี)</label>
            <input type="time" value={form.tout} onChange={(e) => setForm({ ...form, tout: e.target.value })}
              className="w-full rounded-lg border border-ice px-3 py-2" />
          </div>
          <div className="col-span-2">
            <label className="block font-semibold text-navy mb-1">เหตุผล</label>
            <input placeholder="เช่น ลืมกด Check In / มือถือแบตหมด / ทำงานที่ไซต์ลูกค้า" value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
              className="w-full rounded-lg border border-ice px-3 py-2" />
          </div>
        </div>
        <button onClick={submit} className="btn btn-primary w-full text-[13.5px] py-2 mt-3">ส่งคำขอ (รอหัวหน้าอนุมัติ)</button>
        {msg && <p className={`mt-2 text-[12.5px] font-semibold rounded-lg px-3 py-2 ${msg.startsWith("✓") ? "bg-brand/10 text-brand" : "bg-[#D94141]/10 text-[#D94141]"}`}>{msg}</p>}
        {myReqs.length > 0 && (
          <div className="mt-3 border-t border-ice pt-2.5 space-y-1.5">
            <p className="text-[12px] font-bold text-navy">คำขอของฉันล่าสุด</p>
            {myReqs.map((r) => (
              <p key={r.id} className="text-[12px] text-muted flex flex-wrap items-center gap-x-2">
                <span>{new Date(r.work_date + "T00:00:00").toLocaleDateString("th-TH", { day: "numeric", month: "short" })}</span>
                <span>{r.check_in_time.slice(0, 5)}{r.check_out_time ? ` – ${r.check_out_time.slice(0, 5)}` : ""}</span>
                <span className={`text-[10.5px] font-bold rounded px-1.5 py-0.5 ${stColor(r.status)}`}>{r.status}</span>
              </p>
            ))}
          </div>
        )}
      </div>

      {/* คิวอนุมัติ (หัวหน้า/แอดมิน) */}
      {isSupervisor ? (
        <div className="card-white p-4 min-[600px]:p-5 min-w-0">
          <p className="font-bold text-navy text-[15px]">✅ คำขอลงเวลาที่รออนุมัติ ({pending.length})</p>
          <div className="mt-3 space-y-2.5">
            {pending.map((r) => (
              <div key={r.id} className="rounded-xl border border-ice p-3 text-[12.5px]">
                <p className="font-bold text-navy">{r.emp_name ?? r.emp_id}</p>
                <p className="text-muted mt-0.5">
                  {new Date(r.work_date + "T00:00:00").toLocaleDateString("th-TH", { weekday: "short", day: "numeric", month: "short" })} ·
                  เข้า {r.check_in_time.slice(0, 5)}{r.check_out_time ? ` · ออก ${r.check_out_time.slice(0, 5)}` : " (ไม่ระบุเวลาออก)"}
                </p>
                {r.reason && <p className="text-[12px] text-ink mt-1 bg-ice/40 rounded px-2 py-1">เหตุผล: {r.reason}</p>}
                <div className="mt-2 flex gap-2">
                  <button onClick={() => review(r, true)} className="btn btn-primary text-[12px] py-1.5 px-3">✓ อนุมัติ (ลงเวลาให้เลย)</button>
                  <button onClick={() => review(r, false)} className="btn btn-outline text-[12px] py-1.5 px-3">ตีกลับ</button>
                </div>
              </div>
            ))}
            {pending.length === 0 && <p className="text-[12.5px] text-muted/70">ไม่มีคำขอค้างอนุมัติ</p>}
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-ice p-4 text-[12.5px] text-muted/80 self-stretch flex items-center">
          คำขอจะถูกส่งให้หัวหน้างาน/แอดมินอนุมัติ — เมื่ออนุมัติแล้วเวลาจะเข้าประวัติการลงเวลาอัตโนมัติ (รวมคำนวณ OT ถ้ามีสิทธิ์)
        </div>
      )}
    </div>
  );
}

// ── การลา — โควตาจริงจากแอดมิน + ยื่นใบลาจริง + หัวหน้าอนุมัติ ──
type DbLeave = { id: number; emp_id: string; type: string; date_from: string; date_to: string; reason: string | null; status: string; created_at: string };

function LeaveSection() {
  const { dept, empId } = useDept();
  const canApprove = dept === "admin" || dept === "management";
  const [quota, setQuota] = useState<{ annual: number; sick: number; personal: number }>({ annual: 0, sick: 0, personal: 0 });
  const [requests, setRequests] = useState<DbLeave[]>([]);
  const [empNames, setEmpNames] = useState<Record<string, string>>({});
  const [type, setType] = useState<string>("ลาพักร้อน");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(async () => {
    if (!supabase) return;
    const [lr, em, me] = await Promise.all([
      supabase.from("leave_requests").select("*").order("created_at", { ascending: false }).limit(40),
      supabase.from("employees").select("id,name"),
      empId ? supabase.from("employees").select("leave_annual,leave_sick,leave_personal").eq("id", empId).single() : Promise.resolve({ data: null }),
    ]);
    setRequests((lr.data as DbLeave[]) ?? []);
    setEmpNames(Object.fromEntries(((em.data as { id: string; name: string }[]) ?? []).map((x) => [x.id, x.name])));
    const q = me.data as { leave_annual: number; leave_sick: number; leave_personal: number } | null;
    if (q) setQuota({ annual: q.leave_annual ?? 0, sick: q.leave_sick ?? 0, personal: q.leave_personal ?? 0 });
  }, [empId]);
  useEffect(() => { load(); }, [load]);

  const days = (a: string, b: string) => Math.max(1, Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000) + 1);
  const usedDays = (t: string) =>
    requests.filter((r) => r.emp_id === empId && r.type === t && r.status === "อนุมัติแล้ว")
      .reduce((s, r) => s + days(r.date_from, r.date_to), 0);

  const quotaOf = (t: string) => t === "ลาพักร้อน" ? quota.annual : t === "ลาป่วย" ? quota.sick : quota.personal;

  const submit = async () => {
    if (!supabase || !empId) { setMsg({ ok: false, text: "ยังไม่ได้เข้าสู่ระบบ" }); return; }
    if (!from || !to) { setMsg({ ok: false, text: "เลือกวันที่ให้ครบ" }); return; }
    if (to < from) { setMsg({ ok: false, text: "วันสิ้นสุดต้องไม่ก่อนวันเริ่ม" }); return; }
    setSaving(true); setMsg(null);
    const { error } = await supabase.from("leave_requests").insert({
      emp_id: empId, type, date_from: from, date_to: to, reason: reason.trim() || null, status: "รออนุมัติ",
    });
    setSaving(false);
    if (error) { setMsg({ ok: false, text: String(error.message) }); return; }
    setMsg({ ok: true, text: `✅ ส่งใบลาแล้ว (${days(from, to)} วัน) — รอหัวหน้าอนุมัติ` });
    setFrom(""); setTo(""); setReason("");
    load();
  };

  const decide = async (r: DbLeave, status: string) => {
    if (!supabase) return;
    await supabase.from("leave_requests").update({ status }).eq("id", r.id);
    load();
  };

  const fmtRange = (r: DbLeave) => {
    const f = new Date(r.date_from + "T00:00:00").toLocaleDateString("th-TH", { day: "numeric", month: "short" });
    const t = new Date(r.date_to + "T00:00:00").toLocaleDateString("th-TH", { day: "numeric", month: "short" });
    return r.date_from === r.date_to ? `${f} (1 วัน)` : `${f} – ${t} (${days(r.date_from, r.date_to)} วัน)`;
  };

  return (
    <>
      <h2 className="text-[17px] font-bold text-navy mb-3">🌴 การลา</h2>
      <div className="grid gap-4 grid-cols-3 mb-5">
        {LEAVE_TYPES.map((t) => {
          const total = quotaOf(t); const used = usedDays(t);
          return (
            <div key={t} className="card-white p-4 min-w-0">
              <p className="text-[12.5px] text-muted">{t}</p>
              <p className="text-[20px] font-bold text-navy mt-0.5">{Math.max(0, total - used)} <span className="text-[12px] font-semibold text-muted">/ {total} วัน</span></p>
              <div className="mt-2 h-1.5 rounded-full bg-ice overflow-hidden">
                <div className="h-full bg-brand rounded-full" style={{ width: total > 0 ? `${Math.min(100, (used / total) * 100)}%` : "0%" }} />
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid gap-5 min-[1040px]:grid-cols-[360px_1fr] items-start">
        <div className="card-white p-5 min-w-0">
          <p className="font-bold text-navy text-[15px]">ขอลา</p>
          <div className="mt-3 space-y-3 text-[13.5px]">
            <div>
              <label className="block font-semibold text-navy mb-1">ประเภท</label>
              <select value={type} onChange={(e) => setType(e.target.value)} className="w-full rounded-lg border border-ice px-3 py-2 bg-white">
                {LEAVE_TYPES.map((t) => <option key={t} value={t}>{t} (เหลือ {Math.max(0, quotaOf(t) - usedDays(t))} วัน)</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block font-semibold text-navy mb-1">ตั้งแต่</label>
                <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-full rounded-lg border border-ice px-3 py-2" />
              </div>
              <div>
                <label className="block font-semibold text-navy mb-1">ถึง</label>
                <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-full rounded-lg border border-ice px-3 py-2" />
              </div>
            </div>
            {from && to && to >= from && (
              <p className="text-[12px] text-sky bg-ice/50 rounded-lg px-3 py-1.5">รวม {days(from, to)} วัน</p>
            )}
            <div>
              <label className="block font-semibold text-navy mb-1">เหตุผล</label>
              <textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} className="w-full rounded-lg border border-ice px-3 py-2" />
            </div>
            {msg && (
              <p className={`text-[12.5px] rounded-lg px-3 py-2 ${msg.ok ? "bg-[#2E9E5B]/10 text-[#2E9E5B]" : "bg-[#D94141]/10 text-[#D94141]"}`}>{msg.text}</p>
            )}
            <button onClick={submit} disabled={saving} className="btn btn-primary w-full text-[13.5px] py-2 disabled:opacity-60">
              {saving ? "กำลังส่ง..." : "ส่งขออนุมัติ"}
            </button>
            <p className="text-[11px] text-muted/70 italic">โควตาวันลาของแต่ละคนตั้งค่าโดยแอดมินที่หน้าจัดการผู้ใช้</p>
          </div>
        </div>

        <div className="card-white overflow-hidden min-w-0">
          <p className="px-5 pt-4 pb-2 font-bold text-navy">คำขอลาล่าสุดของทีม <span className="text-sky text-[12.5px]">({requests.length})</span></p>
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
                {requests.map((l, i) => (
                  <tr key={l.id} className={i % 2 ? "bg-ice/30" : ""}>
                    <td className="px-4 py-2.5 font-semibold text-sky">LV-{String(l.id).padStart(3, "0")}</td>
                    <td className="px-4 py-2.5 text-navy">{empNames[l.emp_id] ?? l.emp_id}</td>
                    <td className="px-4 py-2.5 text-muted">{l.type}</td>
                    <td className="px-4 py-2.5 text-muted">{fmtRange(l)}</td>
                    <td className="px-4 py-2.5">
                      {canApprove && l.status === "รออนุมัติ" ? (
                        <span className="flex gap-1.5">
                          <button onClick={() => decide(l, "อนุมัติแล้ว")} className="text-[11px] font-bold text-white bg-brand rounded px-2 py-1 hover:bg-navy">อนุมัติ</button>
                          <button onClick={() => decide(l, "ตีกลับ")} className="text-[11px] font-bold text-muted bg-ice rounded px-2 py-1 hover:bg-[#D94141]/10 hover:text-[#D94141]">ตีกลับ</button>
                        </span>
                      ) : (
                        <span className={`text-[11px] font-bold rounded px-2 py-0.5 ${
                          l.status === "รออนุมัติ" ? "bg-amber/15 text-amber" : l.status === "ตีกลับ" ? "bg-[#D94141]/10 text-[#D94141]" : "bg-[#2E9E5B]/15 text-[#2E9E5B]"
                        }`}>{l.status}</span>
                      )}
                    </td>
                  </tr>
                ))}
                {requests.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-6 text-center text-[12.5px] text-muted/70">ยังไม่มีคำขอลา</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}

function WorkInfoBody() {
  const [refreshKey, setRefreshKey] = useState(0);
  const bump = useCallback(() => setRefreshKey((k) => k + 1), []);
  return (
    <>
      {/* ── ลงเวลา ── */}
      <div className="grid gap-5 min-[1040px]:grid-cols-[420px_1fr] items-start mb-6">
        <TimeClock onSaved={bump} />
        <AttendanceHistory refreshKey={refreshKey} />
      </div>

      {/* ── ยื่นลงเวลาย้อนหลัง + อนุมัติ ── */}
      <BackfillSection onApproved={bump} />

      {/* ── การลา (จริง) ── */}
      <LeaveSection />
    </>
  );
}

export default function WorkInfoPage() {
  return (
    <StaffShell title="ข้อมูลการทำงาน">
      <WorkInfoBody />
    </StaffShell>
  );
}
