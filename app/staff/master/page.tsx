"use client";

// โมดูลข้อมูล Master — สินค้าจริงจากฐานข้อมูล (มีรูป + จัดการได้) + คลังสินค้า + รุ่นรถ AGV + Template + ฐานความรู้
// ราคากลางแสดงเฉพาะแผนกที่มีสิทธิ์ (ตาม Permission Matrix)

import React, { useCallback, useEffect, useRef, useState } from "react";
import StaffShell, { useDept } from "@/components/staff/StaffShell";
import { agvModels, docTemplates, knowledgeBase } from "@/lib/staffData";
import { supabase } from "@/lib/supabase";

const fmt = (n: number) => n.toLocaleString("th-TH");
const tabs = ["สินค้า/อุปกรณ์", "คลังสินค้า", "รุ่นรถ AGV", "Template เอกสาร", "ฐานความรู้"] as const;

export type DbProduct = {
  id: number; code: string; name: string; description: string | null;
  category: string; unit: string; price: number; image_url: string | null;
  stock: number; min_stock: number; status: string;
  brand: string | null; series: string | null; model: string | null; specs: string | null;
  created_at: string;
};

// URL ไฟล์แคตตาล็อกในระบบ (เก็บใน Supabase Storage — ดาวน์โหลดส่งลูกค้าได้)
const CATALOG_FILES = [
  { label: "📥 แคตตาล็อก Loongain (PDF)", path: "catalogs/Loongain_Catalog_TH.pdf" },
  { label: "📥 แคตตาล็อก Loongain (Excel)", path: "catalogs/Loongain_Catalog_TH.xlsx" },
];
type DbMovement = { id: number; product_id: number; emp_id: string | null; type: string; qty: number; note: string | null; created_at: string };

const CATEGORIES = ["เซนเซอร์", "ขับเคลื่อน", "เครือข่าย", "พลังงาน", "ควบคุม", "ความปลอดภัย", "บริการ", "อื่นๆ"];

function Thumb({ url, size = 44 }: { url: string | null; size?: number }) {
  if (!url) {
    return <div style={{ width: size, height: size }} className="rounded-lg bg-ice/70 flex items-center justify-center text-[18px] shrink-0">📦</div>;
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt="" style={{ width: size, height: size }} className="rounded-lg object-contain bg-white border border-ice shrink-0" />;
}

// ── ฟอร์มเพิ่ม/แก้ไขสินค้า (อัปโหลดรูปได้จริง) ──
function ProductForm({ product, onDone, onCancel }: { product: DbProduct | null; onDone: () => void; onCancel: () => void }) {
  const [code, setCode] = useState(product?.code ?? "");
  const [name, setName] = useState(product?.name ?? "");
  const [desc, setDesc] = useState(product?.description ?? "");
  const [category, setCategory] = useState(product?.category ?? "เซนเซอร์");
  const [unit, setUnit] = useState(product?.unit ?? "ตัว");
  const [price, setPrice] = useState(product?.price ?? 0);
  const [minStock, setMinStock] = useState(product?.min_stock ?? 0);
  const [status, setStatus] = useState(product?.status ?? "ใช้งาน");
  const [imageUrl, setImageUrl] = useState(product?.image_url ?? null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const upload = async (file: File) => {
    if (!supabase) return;
    setUploading(true); setErr("");
    try {
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `products/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage.from("attachments").upload(path, file, { contentType: file.type });
      if (error) throw error;
      const { data } = supabase.storage.from("attachments").getPublicUrl(path);
      setImageUrl(data.publicUrl);
    } catch (e) {
      setErr("อัปโหลดรูปไม่สำเร็จ: " + String((e as Error).message ?? e));
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    if (!supabase || !code.trim() || !name.trim()) { setErr("กรุณากรอกรหัสและชื่อสินค้า"); return; }
    setSaving(true); setErr("");
    try {
      const row = {
        code: code.trim(), name: name.trim(), description: desc.trim() || null,
        category, unit: unit.trim() || "ตัว", price, min_stock: minStock, status, image_url: imageUrl,
      };
      if (product) {
        const { error } = await supabase.from("products").update(row).eq("id", product.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("products").insert(row);
        if (error) throw error;
      }
      onDone();
    } catch (e) {
      const msg = String((e as Error).message ?? e);
      setErr(msg.includes("duplicate") ? `รหัส "${code}" มีอยู่แล้ว — ใช้รหัสอื่น` : msg);
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!supabase || !product) return;
    if (!confirm(`ลบสินค้า ${product.code} — ${product.name}?\n(ประวัติคลังของสินค้านี้จะถูกลบด้วย)`)) return;
    await supabase.from("products").delete().eq("id", product.id);
    onDone();
  };

  return (
    <div className="card-white p-5 mb-4">
      <p className="font-bold text-navy text-[15px]">{product ? `แก้ไขสินค้า — ${product.code}` : "เพิ่มสินค้าใหม่"}</p>
      <div className="mt-3 flex flex-wrap gap-4 items-start">
        {/* รูปสินค้า */}
        <div className="text-center">
          <Thumb url={imageUrl} size={96} />
          <input ref={fileRef} type="file" accept="image/*" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ""; }} />
          <button onClick={() => fileRef.current?.click()} disabled={uploading}
            className="mt-2 block w-full text-[11.5px] font-semibold text-sky hover:text-brand disabled:opacity-50">
            {uploading ? "⏳ กำลังอัปโหลด..." : imageUrl ? "เปลี่ยนรูป" : "📷 อัปโหลดรูป"}
          </button>
          {imageUrl && <button onClick={() => setImageUrl(null)} className="text-[11px] text-muted/70 hover:text-[#D94141]">ลบรูป</button>}
        </div>
        {/* ฟิลด์ */}
        <div className="flex-1 min-w-[260px] grid gap-2.5 sm:grid-cols-2">
          <div>
            <label className="text-[11.5px] font-bold text-muted">รหัสสินค้า *</label>
            <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="เช่น SEN-005 หรือ 1069933"
              className="mt-1 w-full rounded-lg border border-ice px-3 py-2 text-[13px]" />
          </div>
          <div>
            <label className="text-[11.5px] font-bold text-muted">หมวดหมู่</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="mt-1 w-full rounded-lg border border-ice px-3 py-2 text-[13px] bg-white">
              {[...new Set([...CATEGORIES, category])].filter(Boolean).map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="text-[11.5px] font-bold text-muted">ชื่อสินค้า *</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="เช่น LiDAR Sensor TIM320"
              className="mt-1 w-full rounded-lg border border-ice px-3 py-2 text-[13px]" />
          </div>
          <div className="sm:col-span-2">
            <label className="text-[11.5px] font-bold text-muted">คำอธิบาย/สเปก (แสดงใต้ชื่อในใบเสนอราคา)</label>
            <textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={2}
              placeholder="เช่น TIM320 NON-SAFETY LASER SCANNER, 4M DETECTION, NPN, WITH 2M CABLE TYPE"
              className="mt-1 w-full rounded-lg border border-ice px-3 py-2 text-[13px]" />
          </div>
          <div>
            <label className="text-[11.5px] font-bold text-muted">ราคากลาง (฿)</label>
            <input type="number" min={0} value={price} onChange={(e) => setPrice(+e.target.value || 0)}
              className="mt-1 w-full rounded-lg border border-ice px-3 py-2 text-[13px] text-right" />
          </div>
          <div className="flex gap-2.5">
            <div className="flex-1">
              <label className="text-[11.5px] font-bold text-muted">หน่วย</label>
              <input value={unit} onChange={(e) => setUnit(e.target.value)}
                className="mt-1 w-full rounded-lg border border-ice px-3 py-2 text-[13px]" />
            </div>
            <div className="flex-1">
              <label className="text-[11.5px] font-bold text-muted">สต็อกขั้นต่ำ</label>
              <input type="number" min={0} value={minStock} onChange={(e) => setMinStock(+e.target.value || 0)}
                className="mt-1 w-full rounded-lg border border-ice px-3 py-2 text-[13px] text-right" />
            </div>
            <div className="flex-1">
              <label className="text-[11.5px] font-bold text-muted">สถานะ</label>
              <select value={status} onChange={(e) => setStatus(e.target.value)} className="mt-1 w-full rounded-lg border border-ice px-3 py-2 text-[13px] bg-white">
                <option value="ใช้งาน">ใช้งาน</option><option value="เลิกใช้">เลิกใช้</option>
              </select>
            </div>
          </div>
        </div>
      </div>
      {err && <p className="mt-2 text-[12.5px] text-[#D94141] bg-[#D94141]/10 rounded-lg px-3 py-2">⚠ {err}</p>}
      <div className="mt-3 flex flex-wrap gap-2">
        <button onClick={save} disabled={saving || uploading} className="btn btn-primary text-[13px] py-2 px-4 disabled:opacity-50">
          {saving ? "กำลังบันทึก..." : "บันทึกสินค้า"}
        </button>
        <button onClick={onCancel} className="btn btn-outline text-[13px] py-2 px-4">ยกเลิก</button>
        {product && (
          <button onClick={remove} className="ml-auto text-[12.5px] font-semibold text-[#D94141]/80 hover:text-[#D94141]">🗑 ลบสินค้านี้</button>
        )}
      </div>
    </div>
  );
}

// ── แท็บสินค้า ──
function ProductsTab({ products, canSeePrice, readOnly, reload }: {
  products: DbProduct[]; canSeePrice: boolean; readOnly: boolean; reload: () => void;
}) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [ser, setSer] = useState("");
  const [expanded, setExpanded] = useState<number | null>(null);
  const [editing, setEditing] = useState<DbProduct | null>(null);
  const [adding, setAdding] = useState(false);

  // หมวด/ซีรีส์แบบไดนามิก — รวมของเดิม + จากแคตตาล็อกที่นำเข้า
  const allCats = [...new Set([...CATEGORIES, ...products.map((p) => p.category)])].filter(Boolean);
  const allSeries = [...new Set(products.map((p) => p.series).filter(Boolean))] as string[];

  // ค้นหาได้ทุกอย่าง: Part No / ชื่อ / รุ่น / ซีรีส์ / ยี่ห้อ / หมวด / สเปกเต็ม
  const list = products.filter((p) =>
    (!cat || p.category === cat) &&
    (!ser || p.series === ser) &&
    (!q.trim() || [p.code, p.name, p.model, p.series, p.brand, p.category, p.description, p.specs]
      .filter(Boolean).join(" ").toLowerCase().includes(q.trim().toLowerCase()))
  );

  // ดาวน์โหลดรายการที่กรองเป็น Excel (เผื่อส่งให้ลูกค้า — ไม่มีข้อมูลสต็อกภายใน)
  const exportList = async () => {
    const XLSX = await import("xlsx");
    const rows = list.map((p) => ({
      "Part No.": p.code, "รุ่น": p.model ?? "", "ชื่อสินค้า": p.name, "ยี่ห้อ": p.brand ?? "",
      "ซีรีส์": p.series ?? "", "หมวด": p.category, "สเปกย่อ": p.description ?? "",
      ...(canSeePrice ? { "ราคากลาง (฿)": p.price } : {}),
      "หน่วย": p.unit, "สเปกเต็ม": p.specs ?? "",
    }));
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, "สินค้า");
    XLSX.writeFile(wb, `สินค้า-${cat || ser || "ทั้งหมด"}-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const catalogUrl = (path: string) =>
    supabase ? supabase.storage.from("attachments").getPublicUrl(path).data.publicUrl : "#";

  return (
    <>
      {(adding || editing) && (
        <ProductForm product={editing} onDone={() => { setAdding(false); setEditing(null); reload(); }}
          onCancel={() => { setAdding(false); setEditing(null); }} />
      )}
      <div className="card-white overflow-hidden">
        <div className="flex flex-wrap justify-between items-center gap-2 px-5 pt-4 pb-2">
          <p className="font-bold text-navy">สินค้าและอุปกรณ์ <span className="text-sky text-[13px]">({list.length}/{products.length})</span></p>
          <div className="flex flex-wrap gap-2">
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="🔍 Part No. / ชื่อ / รุ่น / สเปก เช่น PNP, IP67..."
              className="rounded-lg border border-ice px-3 py-1.5 text-[12.5px] w-56" />
            <select value={cat} onChange={(e) => setCat(e.target.value)} className="rounded-lg border border-ice px-2.5 py-1.5 text-[12.5px] bg-white max-w-[190px]">
              <option value="">ทุกหมวด</option>
              {allCats.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            {allSeries.length > 0 && (
              <select value={ser} onChange={(e) => setSer(e.target.value)} className="rounded-lg border border-ice px-2.5 py-1.5 text-[12.5px] bg-white max-w-[150px]">
                <option value="">ทุกซีรีส์</option>
                {allSeries.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            )}
            {!readOnly && !adding && !editing && (
              <button onClick={() => setAdding(true)} className="btn btn-primary text-[12.5px] py-1.5 px-3">＋ เพิ่มสินค้า</button>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 px-5 pb-2">
          <button onClick={exportList} className="text-[11.5px] font-semibold text-sky hover:text-brand border border-ice rounded-lg px-2.5 py-1"
            title="ดาวน์โหลดรายการที่กรองอยู่เป็น Excel — ส่งให้ลูกค้าได้ (ไม่มีข้อมูลสต็อก)">
            ⬇ Excel รายการที่กรอง ({list.length})
          </button>
          {CATALOG_FILES.map((f) => (
            <a key={f.path} href={catalogUrl(f.path)} target="_blank" rel="noreferrer"
              className="text-[11.5px] font-semibold text-sky hover:text-brand border border-ice rounded-lg px-2.5 py-1">
              {f.label}
            </a>
          ))}
          <span className="text-[11px] text-muted/60">กดที่ชื่อสินค้าเพื่อดูสเปกเต็ม</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-[13px]">
            <thead>
              <tr className="bg-ice/70 text-navy">
                <th className="text-left px-4 py-2.5 font-bold w-14">รูป</th>
                <th className="text-left px-3 py-2.5 font-bold">รหัส</th>
                <th className="text-left px-3 py-2.5 font-bold">ชื่อสินค้า</th>
                <th className="text-left px-3 py-2.5 font-bold">หมวด</th>
                <th className="text-right px-3 py-2.5 font-bold">ราคากลาง</th>
                <th className="text-right px-3 py-2.5 font-bold">สต็อก</th>
                <th className="text-center px-3 py-2.5 font-bold">สถานะ</th>
                {!readOnly && <th className="px-3 py-2.5 w-16"></th>}
              </tr>
            </thead>
            <tbody>
              {list.map((p, i) => (
                <React.Fragment key={p.id}>
                <tr className={i % 2 ? "bg-ice/30" : ""}>
                  <td className="px-4 py-2"><Thumb url={p.image_url} /></td>
                  <td className="px-3 py-2 font-semibold text-sky whitespace-nowrap">{p.code}</td>
                  <td className="px-3 py-2 text-navy">
                    <button onClick={() => setExpanded(expanded === p.id ? null : p.id)} className="text-left w-full" title={p.specs ? "กดดูสเปกเต็ม" : undefined}>
                      <p className="font-semibold leading-snug hover:text-brand">
                        {p.name}
                        {p.series && <span className="ml-1.5 text-[10px] font-bold bg-ice text-sky rounded px-1.5 py-0.5 align-middle">{p.series}</span>}
                        {p.specs && <span className="ml-1 text-[10px] text-muted/60">{expanded === p.id ? "▲" : "▼"}</span>}
                      </p>
                      {p.description && <p className="text-[11.5px] text-muted/80 leading-snug mt-0.5 line-clamp-1">{p.description}</p>}
                    </button>
                  </td>
                  <td className="px-3 py-2 text-muted whitespace-nowrap max-w-[150px] truncate" title={p.category}>{p.category}</td>
                  <td className="px-3 py-2 text-right font-semibold text-navy whitespace-nowrap">
                    {canSeePrice ? `${fmt(p.price)} ฿/${p.unit}` : <span className="text-muted/50">•••••</span>}
                  </td>
                  <td className={`px-3 py-2 text-right whitespace-nowrap ${p.stock < p.min_stock ? "text-[#D94141] font-bold" : "text-muted"}`}>
                    {p.category === "บริการ" ? "-" : <>{fmt(p.stock)}{p.stock < p.min_stock && " ⚠"}</>}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <span className={`text-[10.5px] font-bold rounded px-1.5 py-0.5 ${p.status === "ใช้งาน" ? "bg-[#2E9E5B]/15 text-[#2E9E5B]" : "bg-ice text-muted"}`}>{p.status}</span>
                  </td>
                  {!readOnly && (
                    <td className="px-3 py-2 text-right">
                      <button onClick={() => { setEditing(p); setAdding(false); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                        className="text-[12px] font-semibold text-brand hover:text-navy">แก้ไข</button>
                    </td>
                  )}
                </tr>
                {expanded === p.id && p.specs && (
                  <tr className="bg-ice/40">
                    <td colSpan={readOnly ? 7 : 8} className="px-5 py-3">
                      <div className="rounded-xl bg-white border border-ice p-3.5">
                        <p className="text-[12px] font-bold text-navy mb-1.5">
                          📋 สเปกเต็ม — {p.brand ? `${p.brand} ` : ""}{p.series ?? ""} {p.model ?? ""}
                        </p>
                        <pre className="text-[11.5px] text-ink whitespace-pre-wrap font-sans leading-relaxed max-h-[300px] overflow-y-auto">{p.specs}</pre>
                      </div>
                    </td>
                  </tr>
                )}
                </React.Fragment>
              ))}
              {list.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-muted/70 text-[12.5px]">ไม่พบสินค้า</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

// ── แท็บคลังสินค้า ──
function InventoryTab({ products, empId, empNames, readOnly, reload }: {
  products: DbProduct[]; empId: string; empNames: Record<string, string>; readOnly: boolean; reload: () => void;
}) {
  const [movements, setMovements] = useState<DbMovement[]>([]);
  const [action, setAction] = useState<{ productId: number; type: string } | null>(null);
  const [qty, setQty] = useState(1);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const stockItems = products.filter((p) => p.category !== "บริการ");
  const lowStock = stockItems.filter((p) => p.stock < p.min_stock);
  const prodMap = Object.fromEntries(products.map((p) => [p.id, p]));

  const loadMovements = useCallback(async () => {
    if (!supabase) return;
    const { data } = await supabase.from("stock_movements").select("*").order("created_at", { ascending: false }).limit(40);
    setMovements((data as DbMovement[]) ?? []);
  }, []);
  useEffect(() => { loadMovements(); }, [loadMovements]);

  const submit = async () => {
    if (!supabase || !action || qty <= 0) return;
    setBusy(true);
    const p = prodMap[action.productId];
    let delta = qty;
    let noteText = note.trim();
    if (action.type === "ปรับยอด") {
      delta = qty - p.stock; // qty คือยอดใหม่ที่นับได้จริง
      noteText = `ปรับยอดเป็น ${qty}` + (noteText ? ` — ${noteText}` : "");
      if (delta === 0) { setBusy(false); setAction(null); return; }
    }
    await supabase.from("stock_movements").insert({
      product_id: action.productId, emp_id: empId || null, type: action.type,
      qty: action.type === "ปรับยอด" ? delta : qty, note: noteText || null,
    });
    setAction(null); setQty(1); setNote(""); setBusy(false);
    reload(); loadMovements();
  };

  const fmtDT = (iso: string) => new Date(iso).toLocaleString("th-TH", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

  return (
    <div className="grid gap-5 min-[1100px]:grid-cols-[1fr_360px] items-start">
      <div className="space-y-4 min-w-0">
        {lowStock.length > 0 && (
          <div className="rounded-xl border border-[#D94141]/30 bg-[#D94141]/5 px-4 py-3 text-[13px]">
            <strong className="text-[#D94141]">⚠ สินค้าต่ำกว่าสต็อกขั้นต่ำ {lowStock.length} รายการ:</strong>{" "}
            <span className="text-ink">{lowStock.map((p) => `${p.code} (เหลือ ${fmt(p.stock)})`).join(" · ")}</span>
          </div>
        )}
        <div className="card-white overflow-hidden">
          <p className="font-bold text-navy px-5 pt-4 pb-2">คลังสินค้า <span className="text-sky text-[13px]">({stockItems.length} รายการ)</span></p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-[13px]">
              <thead>
                <tr className="bg-ice/70 text-navy">
                  <th className="text-left px-4 py-2.5 font-bold w-14">รูป</th>
                  <th className="text-left px-3 py-2.5 font-bold">สินค้า</th>
                  <th className="text-right px-3 py-2.5 font-bold">คงเหลือ</th>
                  <th className="text-right px-3 py-2.5 font-bold">ขั้นต่ำ</th>
                  {!readOnly && <th className="text-right px-4 py-2.5 font-bold">จัดการ</th>}
                </tr>
              </thead>
              <tbody>
                {stockItems.map((p, i) => (
                  <tr key={p.id} className={`${i % 2 ? "bg-ice/30" : ""} ${p.stock < p.min_stock ? "bg-[#D94141]/5" : ""}`}>
                    <td className="px-4 py-2"><Thumb url={p.image_url} size={38} /></td>
                    <td className="px-3 py-2">
                      <p className="font-semibold text-navy leading-snug"><span className="text-sky text-[11.5px] font-bold mr-1.5">{p.code}</span>{p.name}</p>
                    </td>
                    <td className={`px-3 py-2 text-right font-bold ${p.stock < p.min_stock ? "text-[#D94141]" : "text-navy"}`}>{fmt(p.stock)} {p.unit}</td>
                    <td className="px-3 py-2 text-right text-muted">{fmt(p.min_stock)}</td>
                    {!readOnly && (
                      <td className="px-4 py-2 text-right whitespace-nowrap">
                        <button onClick={() => { setAction({ productId: p.id, type: "รับเข้า" }); setQty(1); setNote(""); }}
                          className="text-[11.5px] font-bold bg-[#2E9E5B]/15 text-[#2E9E5B] rounded px-2 py-1 hover:bg-[#2E9E5B]/25 mr-1">＋ รับเข้า</button>
                        <button onClick={() => { setAction({ productId: p.id, type: "เบิกออก" }); setQty(1); setNote(""); }}
                          className="text-[11.5px] font-bold bg-amber/15 text-amber rounded px-2 py-1 hover:bg-amber/25 mr-1">− เบิกออก</button>
                        <button onClick={() => { setAction({ productId: p.id, type: "ปรับยอด" }); setQty(p.stock); setNote(""); }}
                          className="text-[11.5px] font-bold bg-ice text-sky rounded px-2 py-1 hover:bg-sky/20">✎ ปรับยอด</button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ฟอร์มบันทึกการเคลื่อนไหว */}
        {action && (
          <div className="card-white p-4 border-2 border-brand/30">
            <p className="font-bold text-navy text-[14px]">
              {action.type === "รับเข้า" ? "＋ รับสินค้าเข้าคลัง" : action.type === "เบิกออก" ? "− เบิกสินค้าออก" : "✎ ปรับยอดตามที่นับได้จริง"}
              {" — "}<span className="text-sky">{prodMap[action.productId]?.code}</span> {prodMap[action.productId]?.name}
            </p>
            <div className="mt-2.5 flex flex-wrap gap-2 items-end">
              <div>
                <label className="text-[11.5px] font-bold text-muted">{action.type === "ปรับยอด" ? "ยอดใหม่ (นับได้จริง)" : "จำนวน"}</label>
                <input type="number" min={action.type === "ปรับยอด" ? 0 : 1} value={qty} onChange={(e) => setQty(+e.target.value || 0)}
                  className="mt-1 block w-28 text-right rounded-lg border border-ice px-2.5 py-2 text-[13px]" autoFocus />
              </div>
              <div className="flex-1 min-w-[180px]">
                <label className="text-[11.5px] font-bold text-muted">หมายเหตุ</label>
                <input value={note} onChange={(e) => setNote(e.target.value)}
                  placeholder={action.type === "เบิกออก" ? "เช่น ใช้ในโปรเจกต์ PJ-2569-01" : "เช่น PO-1234 / ตรวจนับประจำเดือน"}
                  className="mt-1 block w-full rounded-lg border border-ice px-3 py-2 text-[13px]" />
              </div>
              <button onClick={submit} disabled={busy} className="btn btn-primary text-[13px] py-2 px-4 disabled:opacity-50">บันทึก</button>
              <button onClick={() => setAction(null)} className="btn btn-outline text-[13px] py-2 px-3">ยกเลิก</button>
            </div>
            {action.type === "เบิกออก" && qty > (prodMap[action.productId]?.stock ?? 0) && (
              <p className="mt-2 text-[12px] text-[#D94141]">⚠ เบิกเกินยอดคงเหลือ ({fmt(prodMap[action.productId]?.stock ?? 0)}) — ระบบจะตัดเหลือ 0</p>
            )}
          </div>
        )}
      </div>

      {/* ประวัติการเคลื่อนไหว */}
      <div className="card-white p-4 min-w-0">
        <p className="font-bold text-navy text-[14px]">ประวัติเคลื่อนไหวล่าสุด</p>
        <div className="mt-2 space-y-2 max-h-[520px] overflow-y-auto pr-1">
          {movements.map((m) => {
            const p = prodMap[m.product_id];
            return (
              <div key={m.id} className="rounded-lg border border-ice p-2.5 text-[12px]">
                <div className="flex justify-between gap-2">
                  <span className="font-semibold text-navy">{p ? `${p.code}` : `#${m.product_id}`}</span>
                  <span className={`font-bold ${m.type === "รับเข้า" ? "text-[#2E9E5B]" : m.type === "เบิกออก" ? "text-amber" : "text-sky"}`}>
                    {m.type} {m.type === "เบิกออก" ? "−" : m.qty >= 0 ? "+" : ""}{fmt(Math.abs(Number(m.qty)))}
                  </span>
                </div>
                {m.note && <p className="text-muted mt-0.5 leading-snug">{m.note}</p>}
                <p className="text-muted/60 text-[11px] mt-0.5">{fmtDT(m.created_at)}{m.emp_id && ` · ${empNames[m.emp_id] ?? m.emp_id}`}</p>
              </div>
            );
          })}
          {movements.length === 0 && <p className="text-[12.5px] text-muted/70">ยังไม่มีการเคลื่อนไหว</p>}
        </div>
      </div>
    </div>
  );
}

function MasterBody() {
  const [tab, setTab] = useState<(typeof tabs)[number]>("สินค้า/อุปกรณ์");
  const { dept, empId, access } = useDept();
  const readOnly = access("master") === "read";
  const canSeePrice = dept === "sales" || dept === "admin" || dept === "management";
  const [products, setProducts] = useState<DbProduct[]>([]);
  const [empNames, setEmpNames] = useState<Record<string, string>>({});

  const reload = useCallback(async () => {
    if (!supabase) return;
    const [p, e] = await Promise.all([
      supabase.from("products").select("*").order("code"),
      supabase.from("employees").select("id,name"),
    ]);
    setProducts((p.data as DbProduct[]) ?? []);
    setEmpNames(Object.fromEntries(((e.data as { id: string; name: string }[]) ?? []).map((x) => [x.id, x.name])));
  }, []);
  useEffect(() => { reload(); }, [reload]);

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
        <ProductsTab products={products} canSeePrice={canSeePrice} readOnly={readOnly} reload={reload} />
      )}

      {tab === "คลังสินค้า" && (
        <InventoryTab products={products} empId={empId} empNames={empNames} readOnly={readOnly} reload={reload} />
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
