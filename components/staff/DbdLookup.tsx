"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase";

// ผลลัพธ์จาก edge function dbd-lookup (ปกติจาก DBD/กรมพัฒนาธุรกิจการค้า)
export type DbdResult = {
  tax_id: string; name_th: string; name_en: string; type: string; status: string;
  register_date: string; capital: string; address: string; subdistrict: string; district: string; province: string; postcode: string;
};

// ตรวจเลขประจำตัวผู้เสียภาษี/ทะเบียนนิติบุคคล 13 หลัก (mod-11 เช็คดิจิต) — ทำงานออฟไลน์ 100%
export function validThaiId(raw: string): boolean {
  const d = (raw || "").replace(/[^0-9]/g, "");
  if (d.length !== 13) return false;
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += parseInt(d[i]) * (13 - i);
  return (11 - (sum % 11)) % 10 === parseInt(d[12]);
}

export default function DbdLookup({ onPick }: { onPick: (r: DbdResult) => void }) {
  const [kw, setKw] = useState("");
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<DbdResult[] | null>(null);
  const [note, setNote] = useState("");

  const search = async () => {
    const keyword = kw.trim();
    if (!keyword || busy) return;
    const digits = keyword.replace(/[^0-9]/g, "");
    if (digits.length >= 6 && digits.length !== 13) { setNote("เลขทะเบียน/เลขผู้เสียภาษีต้องมี 13 หลัก"); setResults(null); return; }
    if (digits.length === 13 && !validThaiId(digits)) { setNote("⚠ เลข 13 หลักนี้ไม่ผ่านการตรวจสอบ (checksum) — พิมพ์ผิดหรือเปล่า?"); }
    else setNote("");
    setBusy(true); setResults(null);
    try {
      const { data, error } = await supabase!.functions.invoke("dbd-lookup", { body: { keyword } });
      if (error) throw new Error(error.message);
      if (data?.ok && Array.isArray(data.results) && data.results.length) {
        setResults(data.results as DbdResult[]);
        setNote(`พบ ${data.results.length} รายการ · แหล่งข้อมูล: ${data.source}`);
      } else {
        setResults([]);
        setNote(data?.note || "ไม่พบข้อมูล");
      }
    } catch (e) {
      setResults([]); setNote("เชื่อมต่อบริการค้นหาไม่ได้: " + String((e as Error).message ?? e));
    } finally { setBusy(false); }
  };

  return (
    <div className="rounded-xl border border-brand/30 bg-ice/40 p-3 mb-4">
      <p className="text-[12.5px] font-bold text-navy">🔎 ค้นหาข้อมูลบริษัทจากกรมพัฒนาธุรกิจการค้า (DBD)</p>
      <p className="text-[11px] text-muted mt-0.5">พิมพ์ชื่อบริษัท หรือเลขทะเบียน/เลขผู้เสียภาษี 13 หลัก แล้วกดค้นหา เพื่อดึงชื่อ (ไทย/อังกฤษ) ที่อยู่ และเลขภาษีมากรอกให้อัตโนมัติ</p>
      <div className="mt-2 flex flex-wrap gap-2">
        <input value={kw} onChange={(e) => setKw(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); search(); } }}
          placeholder="เช่น 0105536041711 หรือ บริษัท ..." className="flex-1 min-w-[200px] rounded-lg border border-ice px-3 py-2 text-[13px]" />
        <button type="button" onClick={search} disabled={busy || !kw.trim()} className="btn btn-primary text-[12.5px] py-2 px-4 disabled:opacity-50">{busy ? "กำลังค้นหา..." : "ค้นหา"}</button>
      </div>
      {note && <p className={`mt-1.5 text-[11.5px] ${results && results.length ? "text-brand" : "text-amber"}`}>{note}</p>}
      {results && results.length > 0 && (
        <div className="mt-2 space-y-1.5 max-h-[240px] overflow-auto">
          {results.map((r, i) => (
            <button type="button" key={i} onClick={() => onPick(r)}
              className="w-full text-left rounded-lg border border-ice bg-white hover:border-brand px-3 py-2 text-[12.5px] transition">
              <span className="font-bold text-navy">{r.name_th || r.name_en || "(ไม่มีชื่อ)"}</span>
              {r.name_en && r.name_th && <span className="text-muted"> · {r.name_en}</span>}
              <div className="text-[11px] text-muted mt-0.5">
                {r.tax_id && <>เลขนิติบุคคล {r.tax_id} · </>}
                {r.status && <>{r.status} · </>}
                {[r.subdistrict, r.district, r.province].filter(Boolean).join(" ")}
              </div>
              <span className="text-[11px] font-semibold text-brand">→ กดเพื่อกรอกอัตโนมัติ</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
