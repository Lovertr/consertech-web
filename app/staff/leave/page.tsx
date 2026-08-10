"use client";

// โมดูลข้อมูลการทำงาน — ลงเวลาเข้า/เลิกงาน (Check In/Out + ตำแหน่ง GPS) + OT อัตโนมัติ + การลา

import { useState } from "react";
import StaffShell from "@/components/staff/StaffShell";
import {
  leaveBalance, leaveRequests, attendanceLog, workSchedule, mapPlaces, roadKm,
} from "@/lib/staffData";

const types = [
  { key: "annual", label: "ลาพักร้อน", ...leaveBalance.annual },
  { key: "sick", label: "ลาป่วย", ...leaveBalance.sick },
  { key: "personal", label: "ลากิจ", ...leaveBalance.personal },
];

type Stamp = { time: string; dateLabel: string; coords: string | null; place: string };

function nearPlace(lat: number, lng: number) {
  let best: { name: string; d: number } | null = null;
  for (const pl of mapPlaces) {
    const d = roadKm({ lat, lng }, { lat: pl.lat, lng: pl.lng });
    if (!best || d < best.d) best = { name: pl.name, d };
  }
  return best && best.d <= 4 ? best.name : "นอกพื้นที่ที่บันทึกไว้";
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

function TimeClock() {
  const [inStamp, setInStamp] = useState<Stamp | null>(null);
  const [outStamp, setOutStamp] = useState<Stamp | null>(null);
  const [ot, setOt] = useState<string | null>(null);
  const [locating, setLocating] = useState<"in" | "out" | null>(null);
  const otEnabled = true; // เดโม: พนักงานคนนี้เปิดสิทธิ์ OT (แอดมินตั้งค่าได้ที่หน้าจัดการผู้ใช้)

  const stamp = (which: "in" | "out") => {
    setLocating(which);
    const finish = (coords: string | null, place: string) => {
      const now = new Date();
      const s: Stamp = { time: fmtTime(now), dateLabel: fmtDate(now), coords, place };
      if (which === "in") setInStamp(s);
      else {
        setOutStamp(s);
        if (otEnabled) setOt(calcOt(now));
      }
      setLocating(null);
    };
    if (typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => finish(`${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}`, nearPlace(pos.coords.latitude, pos.coords.longitude)),
        () => finish(`${mapPlaces[0].lat}, ${mapPlaces[0].lng} (เดโม)`, "สำนักงาน ปากเกร็ด — ไม่ได้รับอนุญาตตำแหน่ง ใช้พิกัดจำลอง"),
        { timeout: 6000 }
      );
    } else {
      finish(`${mapPlaces[0].lat}, ${mapPlaces[0].lng} (เดโม)`, "สำนักงาน ปากเกร็ด (พิกัดจำลอง)");
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
        ระบบจริง: OT คิดอัตโนมัติเฉพาะพนักงานที่แอดมินเปิดสิทธิ์ OT — หัวหน้ากดอนุมัติก่อนส่งเข้าเงินเดือน, ตำแหน่ง GPS ใช้ยืนยันการทำงานที่ไซต์งาน
      </p>
    </div>
  );
}

function AttendanceHistory() {
  return (
    <div className="card-white overflow-hidden min-w-0">
      <p className="px-4 min-[600px]:px-5 pt-4 pb-2 font-bold text-navy">ประวัติการลงเวลา (สัปดาห์นี้)</p>
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
            {attendanceLog.map((a, i) => (
              <tr key={a.date} className={i % 2 ? "bg-ice/30" : ""}>
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
        สรุป OT เดือนนี้: 2 ชม. 45 น. (อนุมัติแล้ว) — ระบบจริงส่งยอดเข้าโมดูลการเงิน/เงินเดือนอัตโนมัติ
      </p>
    </div>
  );
}

export default function WorkInfoPage() {
  return (
    <StaffShell title="ข้อมูลการทำงาน">
      {/* ── ลงเวลา ── */}
      <div className="grid gap-5 min-[1040px]:grid-cols-[420px_1fr] items-start mb-6">
        <TimeClock />
        <AttendanceHistory />
      </div>

      {/* ── การลา ── */}
      <h2 className="text-[17px] font-bold text-navy mb-3">🌴 การลา</h2>
      <div className="grid gap-4 grid-cols-3 mb-5">
        {types.map((t) => (
          <div key={t.key} className="card-white p-4 min-w-0">
            <p className="text-[12.5px] text-muted">{t.label}</p>
            <p className="text-[20px] font-bold text-navy mt-0.5">{t.total - t.used} <span className="text-[12px] font-semibold text-muted">/ {t.total} วัน</span></p>
            <div className="mt-2 h-1.5 rounded-full bg-ice overflow-hidden">
              <div className="h-full bg-brand rounded-full" style={{ width: `${(t.used / t.total) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-5 min-[1040px]:grid-cols-[360px_1fr] items-start">
        <div className="card-white p-5 min-w-0">
          <p className="font-bold text-navy text-[15px]">ขอลา</p>
          <div className="mt-3 space-y-3 text-[13.5px]">
            <div>
              <label className="block font-semibold text-navy mb-1">ประเภท</label>
              <select className="w-full rounded-lg border border-ice px-3 py-2 bg-white">
                {types.map((t) => <option key={t.key}>{t.label}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block font-semibold text-navy mb-1">ตั้งแต่</label>
                <input type="date" className="w-full rounded-lg border border-ice px-3 py-2" />
              </div>
              <div>
                <label className="block font-semibold text-navy mb-1">ถึง</label>
                <input type="date" className="w-full rounded-lg border border-ice px-3 py-2" />
              </div>
            </div>
            <div>
              <label className="block font-semibold text-navy mb-1">เหตุผล</label>
              <textarea rows={2} className="w-full rounded-lg border border-ice px-3 py-2" />
            </div>
            <button className="btn btn-primary w-full text-[13.5px] py-2">ส่งขออนุมัติ</button>
            <p className="text-[11px] text-muted/70 italic">ระบบจริง: หัวหน้าอนุมัติในระบบ + ลงปฏิทินทีม (Google Calendar) อัตโนมัติ เพื่อไม่ให้ชนนัดติดตั้งหน้างาน — โควตาวันลาของแต่ละคนตั้งค่าโดยแอดมินที่หน้าจัดการผู้ใช้</p>
          </div>
        </div>

        <div className="card-white overflow-hidden min-w-0">
          <p className="px-5 pt-4 pb-2 font-bold text-navy">คำขอลาล่าสุดของทีม</p>
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
                {leaveRequests.map((l, i) => (
                  <tr key={l.no} className={i % 2 ? "bg-ice/30" : ""}>
                    <td className="px-4 py-2.5 font-semibold text-sky">{l.no}</td>
                    <td className="px-4 py-2.5 text-navy">{l.employee}</td>
                    <td className="px-4 py-2.5 text-muted">{l.type}</td>
                    <td className="px-4 py-2.5 text-muted">{l.range}</td>
                    <td className="px-4 py-2.5">
                      <span className={`text-[11px] font-bold rounded px-2 py-0.5 ${l.status === "รออนุมัติ" ? "bg-amber/15 text-amber" : "bg-ice text-brand"}`}>{l.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </StaffShell>
  );
}
