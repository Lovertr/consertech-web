"use client";

// โมดูลเอกสารขาย — ใบเสนอราคา (สร้างจากข้อมูล Master) + Proposal (AI ร่าง จำลอง) + ทะเบียนเอกสาร

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import StaffShell, { useDept } from "@/components/staff/StaffShell";
import { callCopilot } from "@/lib/copilot";
import { products, proposals } from "@/lib/staffData";
import { supabase } from "@/lib/supabase";

const fmt = (n: number) => n.toLocaleString("th-TH");

// ดีลจริงจากฐานข้อมูล (โมดูล CRM)
type DbDealLite = { id: number; customer_name: string; industry: string | null; solution: string | null; stage: string };
const dealCode = (id: number) => `D-${String(id).padStart(3, "0")}`;
function useDbDeals() {
  const [list, setList] = useState<DbDealLite[]>([]);
  useEffect(() => {
    supabase?.from("deals").select("id,customer_name,industry,solution,stage")
      .order("created_at", { ascending: false })
      .then(({ data }) => setList((data as DbDealLite[]) ?? []));
  }, []);
  return list;
}

// ── ใบเสนอราคาจริง — บันทึกลง DB + เลขที่รันอัตโนมัติ + PDF/Excel ──
type QuoteItem = { code?: string; name: string; unit: string; qty: number; price: number };
type DbQuotation = {
  id: number; doc_no: string; deal_id: number | null; customer_name: string;
  items: QuoteItem[]; subtotal: number; discount: number; vat: number; total: number;
  note: string | null; status: string; created_by: string | null; approved_by: string | null; created_at: string;
};

const CO = {
  nameEn: "CONSERTECH CO., LTD.",
  nameTh: "บริษัท คอนเซอร์เทค จำกัด",
  addr: "72, 49 หมู่ที่ 3 ถ.เลี่ยงเมืองปากเกร็ด ต.บางตลาด อ.ปากเกร็ด จ.นนทบุรี 11120",
  tel: "062-363-5395",
  email: "sale01@cs-th.com",
};

const dateTh = (iso?: string) => (iso ? new Date(iso) : new Date()).toLocaleDateString("th-TH", { day: "numeric", month: "long", year: "numeric" });

const statusBadge = (s: string) =>
  s === "อนุมัติแล้ว" ? "bg-[#2E9E5B]/15 text-[#2E9E5B]"
  : s === "รออนุมัติ" ? "bg-amber/15 text-amber"
  : s === "ส่งลูกค้าแล้ว" ? "bg-ice text-brand"
  : s === "ยกเลิก" ? "bg-[#D94141]/10 text-[#D94141]"
  : "bg-ice text-muted";

// เปิดหน้าต่างพิมพ์ (บันทึกเป็น PDF ได้จากหน้าต่างพิมพ์ของเบราว์เซอร์)
function printQuotation(q: { doc_no: string; customer_name: string; items: QuoteItem[]; subtotal: number; discount: number; vat: number; total: number; note?: string | null; created_at?: string; status?: string }) {
  const fmtN = (n: number) => n.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const rows = q.items.map((it, i) => `<tr>
    <td style="text-align:center">${i + 1}</td>
    <td>${it.code ? `<span style="color:#5B9BD5;font-size:11px;font-weight:bold">${it.code}</span> ` : ""}${it.name}</td>
    <td style="text-align:center">${it.unit}</td>
    <td style="text-align:right">${it.qty.toLocaleString("th-TH")}</td>
    <td style="text-align:right">${fmtN(it.price)}</td>
    <td style="text-align:right">${fmtN(it.qty * it.price)}</td>
  </tr>`).join("");
  const html = `<!doctype html><html lang="th"><head><meta charset="utf-8"><title>${q.doc_no}</title>
  <style>
    * { box-sizing: border-box; font-family: 'Segoe UI', Tahoma, sans-serif; }
    body { margin: 0; padding: 28px 36px; color: #12212E; font-size: 13px; }
    table.items { width: 100%; border-collapse: collapse; margin-top: 14px; }
    table.items th { background: #0E3A5C; color: #fff; padding: 7px 8px; font-size: 12.5px; }
    table.items td { border: 1px solid #D7E4F0; padding: 6px 8px; }
    .totals td { padding: 3px 8px; }
    @media print { body { padding: 10mm 12mm; } }
  </style></head><body>
  <table style="width:100%"><tr>
    <td>
      <div style="font-size:20px;font-weight:800;color:#15659E">${CO.nameEn}</div>
      <div style="font-weight:600">${CO.nameTh}</div>
      <div style="color:#4A5E6E;font-size:12px;max-width:340px">${CO.addr}<br>โทร ${CO.tel} · ${CO.email}</div>
    </td>
    <td style="text-align:right;vertical-align:top">
      <div style="font-size:22px;font-weight:800;color:#0E3A5C">ใบเสนอราคา / QUOTATION</div>
      <div style="margin-top:6px">เลขที่: <strong>${q.doc_no}</strong></div>
      <div>วันที่: ${dateTh(q.created_at)}</div>
    </td>
  </tr></table>
  <div style="margin-top:14px;border:1px solid #D7E4F0;border-radius:8px;padding:10px 14px">
    <strong>เรียน:</strong> ${q.customer_name}<br>
    <span style="color:#4A5E6E;font-size:12px">บริษัทฯ มีความยินดีเสนอราคาสินค้า/บริการ ดังรายการต่อไปนี้</span>
  </div>
  <table class="items"><thead><tr>
    <th style="width:36px">ลำดับ</th><th>รายการ</th><th style="width:60px">หน่วย</th><th style="width:64px">จำนวน</th><th style="width:100px">ราคา/หน่วย (฿)</th><th style="width:110px">จำนวนเงิน (฿)</th>
  </tr></thead><tbody>${rows}</tbody></table>
  <table style="width:100%;margin-top:10px"><tr><td style="vertical-align:top;font-size:12px;color:#4A5E6E">
    <strong style="color:#12212E">เงื่อนไข</strong><br>
    · ยืนราคา 30 วันนับจากวันที่เสนอราคา<br>
    · ราคานี้รวมค่าติดตั้งและทดสอบระบบตามขอบเขตงานที่ระบุ<br>
    · กำหนดส่งมอบและเงื่อนไขชำระเงินตามที่ตกลงในใบสั่งซื้อ
    ${q.note ? `<br>· ${q.note}` : ""}
  </td><td style="width:280px">
    <table class="totals" style="width:100%">
      <tr><td>รวมเป็นเงิน</td><td style="text-align:right">${fmtN(q.subtotal)}</td></tr>
      ${q.discount > 0 ? `<tr><td>ส่วนลด</td><td style="text-align:right">-${fmtN(q.discount)}</td></tr>
      <tr><td>ยอดหลังหักส่วนลด</td><td style="text-align:right">${fmtN(q.subtotal - q.discount)}</td></tr>` : ""}
      <tr><td>ภาษีมูลค่าเพิ่ม 7%</td><td style="text-align:right">${fmtN(q.vat)}</td></tr>
      <tr style="font-weight:800;font-size:15px;color:#0E3A5C"><td style="border-top:2px solid #0E3A5C">จำนวนเงินรวมทั้งสิ้น</td><td style="border-top:2px solid #0E3A5C;text-align:right">${fmtN(q.total)}</td></tr>
    </table>
  </td></tr></table>
  <table style="width:100%;margin-top:44px;text-align:center;font-size:12.5px"><tr>
    <td style="width:50%">________________________<br>ผู้เสนอราคา<br><span style="color:#4A5E6E">${CO.nameTh}</span></td>
    <td style="width:50%">________________________<br>ผู้อนุมัติสั่งซื้อ<br><span style="color:#4A5E6E">${q.customer_name}</span></td>
  </tr></table>
  <script>window.onload = () => setTimeout(() => window.print(), 250);</script>
  </body></html>`;
  const w = window.open("", "_blank");
  if (!w) { alert("เบราว์เซอร์บล็อกป๊อปอัป — อนุญาตป๊อปอัปเพื่อพิมพ์ PDF"); return; }
  w.document.write(html);
  w.document.close();
}

async function exportQuotationExcel(q: { doc_no: string; customer_name: string; items: QuoteItem[]; subtotal: number; discount: number; vat: number; total: number; note?: string | null; created_at?: string }) {
  const XLSX = await import("xlsx");
  const aoa: (string | number)[][] = [
    [CO.nameTh + " — ใบเสนอราคา (QUOTATION)"],
    [CO.addr],
    [`โทร ${CO.tel} · ${CO.email}`],
    [],
    ["เลขที่เอกสาร", q.doc_no, "", "วันที่", dateTh(q.created_at)],
    ["ลูกค้า", q.customer_name],
    [],
    ["ลำดับ", "รายการ", "หน่วย", "จำนวน", "ราคา/หน่วย (฿)", "จำนวนเงิน (฿)"],
    ...q.items.map((it, i) => [i + 1, (it.code ? `[${it.code}] ` : "") + it.name, it.unit, it.qty, it.price, it.qty * it.price]),
    [],
    ["", "", "", "", "รวมเป็นเงิน", q.subtotal],
    ...(q.discount > 0 ? [["", "", "", "", "ส่วนลด", -q.discount], ["", "", "", "", "ยอดหลังหักส่วนลด", q.subtotal - q.discount]] : []),
    ["", "", "", "", "VAT 7%", q.vat],
    ["", "", "", "", "จำนวนเงินรวมทั้งสิ้น", q.total],
  ];
  if (q.note) aoa.push([], ["หมายเหตุ", q.note]);
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws["!cols"] = [{ wch: 6 }, { wch: 52 }, { wch: 8 }, { wch: 8 }, { wch: 16 }, { wch: 16 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, q.doc_no);
  XLSX.writeFile(wb, `${q.doc_no}.xlsx`);
}

function QuotationBuilder({ readOnly }: { readOnly: boolean }) {
  const { dept, empId } = useDept();
  const canApprove = dept === "management";
  const dbDeals = useDbDeals();
  const [quotes, setQuotes] = useState<DbQuotation[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [docNo, setDocNo] = useState<string | null>(null);
  const [status, setStatus] = useState("ร่าง");
  const [dealId, setDealId] = useState<number | null>(null);
  const [customer, setCustomer] = useState("");
  const [items, setItems] = useState<QuoteItem[]>([]);
  const [discount, setDiscount] = useState(0);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const load = async () => {
    if (!supabase) return;
    const { data } = await supabase.from("quotations").select("*").order("doc_no", { ascending: false });
    setQuotes((data as DbQuotation[]) ?? []);
  };
  useEffect(() => { load(); }, []);

  const subtotal = items.reduce((a, it) => a + it.qty * it.price, 0);
  const afterDisc = Math.max(0, subtotal - discount);
  const vat = Math.round(afterDisc * 0.07 * 100) / 100;
  const total = afterDisc + vat;

  const resetForm = () => {
    setEditingId(null); setDocNo(null); setStatus("ร่าง");
    setDealId(null); setCustomer(""); setItems([]); setDiscount(0); setNote(""); setErr("");
  };

  const pickDeal = (id: number) => {
    setDealId(id);
    const d = dbDeals.find((x) => x.id === id);
    if (d) setCustomer(d.customer_name);
  };

  const loadQuote = (q: DbQuotation) => {
    setEditingId(q.id); setDocNo(q.doc_no); setStatus(q.status);
    setDealId(q.deal_id); setCustomer(q.customer_name);
    setItems(Array.isArray(q.items) ? q.items : []);
    setDiscount(Number(q.discount) || 0); setNote(q.note ?? ""); setErr("");
  };

  const save = async (newStatus?: string) => {
    if (!supabase || !customer.trim() || items.length === 0) {
      setErr(!customer.trim() ? "กรุณาระบุลูกค้า" : "กรุณาเพิ่มรายการอย่างน้อย 1 รายการ");
      return;
    }
    setSaving(true); setErr("");
    try {
      if (editingId === null) {
        const { data, error } = await supabase.rpc("create_quotation", {
          p_deal_id: dealId, p_customer: customer.trim(), p_items: items,
          p_subtotal: subtotal, p_discount: discount, p_vat: vat, p_total: total,
          p_note: note.trim() || null, p_created_by: empId || null,
        });
        if (error) throw error;
        const r = data as { id: number; doc_no: string };
        setEditingId(r.id); setDocNo(r.doc_no);
        if (newStatus) {
          await supabase.from("quotations").update({ status: newStatus }).eq("id", r.id);
          setStatus(newStatus);
        }
        if (dealId !== null) {
          await supabase.from("deal_activities").insert({ deal_id: dealId, emp_id: empId || null, type: "เอกสาร", note: `สร้างใบเสนอราคา ${r.doc_no}` });
        }
      } else {
        const patch: Record<string, unknown> = {
          deal_id: dealId, customer_name: customer.trim(), items,
          subtotal, discount, vat, total, note: note.trim() || null,
        };
        if (newStatus) patch.status = newStatus;
        const { error } = await supabase.from("quotations").update(patch).eq("id", editingId);
        if (error) throw error;
        if (newStatus) setStatus(newStatus);
      }
      await load();
    } catch (e) {
      setErr(String((e as Error).message ?? e));
    } finally {
      setSaving(false);
    }
  };

  const setQuoteStatus = async (q: DbQuotation, s: string) => {
    if (!supabase) return;
    const patch: Record<string, unknown> = { status: s };
    if (s === "อนุมัติแล้ว") patch.approved_by = empId || null;
    await supabase.from("quotations").update(patch).eq("id", q.id);
    if (q.id === editingId) setStatus(s);
    load();
  };

  const current = { doc_no: docNo ?? "(ยังไม่บันทึก)", customer_name: customer, items, subtotal, discount, vat, total, note };

  return (
    <div className="grid gap-5 min-[1040px]:grid-cols-[1fr_360px] items-start">
      <div className="card-white p-5 min-w-0">
        <div className="flex flex-wrap justify-between gap-2">
          <div>
            <p className="text-[11px] font-bold text-sky">เลขที่เอกสาร (รันอัตโนมัติเมื่อบันทึก)</p>
            <p className="font-bold text-navy text-[18px]">
              {docNo ?? "QT-XXXX-XXX"}{" "}
              <span className={`text-[10.5px] font-bold rounded px-1.5 py-0.5 align-middle ${statusBadge(status)}`}>{status}</span>
            </p>
          </div>
          {!readOnly && editingId !== null && (
            <button onClick={resetForm} className="btn btn-outline text-[12.5px] py-1.5 px-3 h-fit">＋ เริ่มใบใหม่</button>
          )}
        </div>

        <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
          <div>
            <label className="text-[11.5px] font-bold text-muted">อ้างอิงดีล (ไม่บังคับ)</label>
            <select value={dealId ?? ""} onChange={(e) => e.target.value ? pickDeal(Number(e.target.value)) : setDealId(null)} disabled={readOnly}
              className="mt-1 w-full text-[13px] rounded-lg border border-ice px-3 py-2 bg-white">
              <option value="">— ไม่อ้างอิงดีล —</option>
              {dbDeals.map((d) => <option key={d.id} value={d.id}>{dealCode(d.id)} — {d.customer_name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[11.5px] font-bold text-muted">ลูกค้า</label>
            <input value={customer} onChange={(e) => setCustomer(e.target.value)} disabled={readOnly} placeholder="ชื่อบริษัทลูกค้า"
              className="mt-1 w-full text-[13px] rounded-lg border border-ice px-3 py-2" />
          </div>
        </div>

        <div className="overflow-x-auto mt-4 -mx-1 px-1">
        <table className="w-full min-w-[470px] text-[13px]">
          <thead>
            <tr className="bg-ice/70 text-navy">
              <th className="text-left px-3 py-2 font-bold">รายการ</th>
              <th className="text-right px-2 py-2 font-bold w-16">จำนวน</th>
              <th className="text-right px-2 py-2 font-bold w-24">ราคา/หน่วย</th>
              <th className="text-right px-3 py-2 font-bold w-28">รวม</th>
              {!readOnly && <th className="w-8"></th>}
            </tr>
          </thead>
          <tbody>
            {items.map((it, i) => (
              <tr key={i} className={i % 2 ? "bg-ice/30" : ""}>
                <td className="px-3 py-2">
                  {it.code && <span className="text-[10.5px] text-sky font-bold mr-1.5">{it.code}</span>}
                  {readOnly || it.code ? it.name : (
                    <input value={it.name} onChange={(e) => setItems(items.map((x, j) => j === i ? { ...x, name: e.target.value } : x))}
                      className="w-full rounded border border-ice px-1.5 py-0.5" />
                  )}
                </td>
                <td className="text-right px-2 py-2">
                  <input type="number" min={1} value={it.qty} disabled={readOnly}
                    onChange={(e) => setItems(items.map((x, j) => j === i ? { ...x, qty: +e.target.value || 1 } : x))}
                    className="w-14 text-right rounded border border-ice px-1.5 py-0.5" />
                </td>
                <td className="text-right px-2 py-2">
                  <input type="number" min={0} value={it.price} disabled={readOnly}
                    onChange={(e) => setItems(items.map((x, j) => j === i ? { ...x, price: +e.target.value || 0 } : x))}
                    className="w-24 text-right rounded border border-ice px-1.5 py-0.5" />
                </td>
                <td className="text-right px-3 py-2 font-semibold text-navy">{fmt(it.qty * it.price)}</td>
                {!readOnly && (
                  <td className="text-center">
                    <button onClick={() => setItems(items.filter((_, j) => j !== i))} className="text-muted/60 hover:text-[#D94141]">✕</button>
                  </td>
                )}
              </tr>
            ))}
            {items.length === 0 && (
              <tr><td colSpan={readOnly ? 4 : 5} className="px-3 py-6 text-center text-muted/70 text-[12.5px]">ยังไม่มีรายการ — เพิ่มจากข้อมูล Master หรือพิมพ์รายการเองด้านล่าง</td></tr>
            )}
          </tbody>
        </table>
        </div>

        {!readOnly && (
          <div className="mt-3 flex flex-wrap gap-2">
            <select
              className="max-w-full text-[13px] rounded-lg border border-dashed border-sky px-3 py-2 bg-white text-sky"
              value=""
              onChange={(e) => {
                const p = products.find((x) => x.code === e.target.value);
                if (p) setItems([...items, { code: p.code, name: p.name, unit: p.unit, qty: 1, price: p.price }]);
              }}
            >
              <option value="">＋ เพิ่มรายการจากข้อมูล Master...</option>
              {products.filter((p) => !items.some((it) => it.code === p.code)).map((p) => (
                <option key={p.code} value={p.code}>{p.code} — {p.name} ({fmt(p.price)}฿)</option>
              ))}
            </select>
            <button onClick={() => setItems([...items, { name: "", unit: "งาน", qty: 1, price: 0 }])}
              className="text-[13px] rounded-lg border border-dashed border-ice px-3 py-2 text-muted hover:text-brand hover:border-brand">
              ＋ รายการกำหนดเอง
            </button>
          </div>
        )}

        <div className="mt-4 border-t border-ice pt-3 flex flex-wrap items-end justify-between gap-3">
          <div className="flex flex-wrap gap-3">
            <div>
              <label className="text-[11.5px] font-bold text-muted">ส่วนลด (฿)</label>
              <input type="number" min={0} value={discount} disabled={readOnly} onChange={(e) => setDiscount(+e.target.value || 0)}
                className="mt-1 block w-28 text-right rounded-lg border border-ice px-2.5 py-1.5 text-[13px]" />
            </div>
            <div className="flex-1 min-w-[180px]">
              <label className="text-[11.5px] font-bold text-muted">หมายเหตุในเอกสาร</label>
              <input value={note} disabled={readOnly} onChange={(e) => setNote(e.target.value)} placeholder="เช่น เงื่อนไขชำระเงิน 50/50"
                className="mt-1 block w-full rounded-lg border border-ice px-2.5 py-1.5 text-[13px]" />
            </div>
          </div>
          <div className="text-[13.5px] space-y-1 text-right">
            <p className="text-muted">รวม {fmt(subtotal)} ฿{discount > 0 && ` · ส่วนลด ${fmt(discount)} ฿`} · VAT 7% {fmt(Math.round(vat))} ฿</p>
            <p className="text-[18px] font-bold text-navy">ยอดสุทธิ {fmt(Math.round(total))} ฿</p>
          </div>
        </div>

        {err && <p className="mt-2 text-[12.5px] text-[#D94141] bg-[#D94141]/10 rounded-lg px-3 py-2">⚠ {err}</p>}

        <div className="mt-4 flex flex-wrap gap-2">
          {!readOnly && (
            <>
              <button onClick={() => save()} disabled={saving} className="btn btn-primary text-[13.5px] py-2 disabled:opacity-60">
                {saving ? "กำลังบันทึก..." : editingId === null ? "บันทึก (ออกเลขที่)" : "บันทึกการแก้ไข"}
              </button>
              {status === "ร่าง" && (
                <button onClick={() => save("รออนุมัติ")} disabled={saving} className="btn btn-amber text-[13.5px] py-2 disabled:opacity-60">ส่งขออนุมัติ (ผู้บริหาร)</button>
              )}
              {canApprove && status === "รออนุมัติ" && editingId !== null && (
                <button onClick={() => setQuoteStatus(quotes.find((q) => q.id === editingId)!, "อนุมัติแล้ว")} className="btn btn-primary text-[13.5px] py-2">✓ อนุมัติ</button>
              )}
              {status === "อนุมัติแล้ว" && editingId !== null && (
                <button onClick={() => setQuoteStatus(quotes.find((q) => q.id === editingId)!, "ส่งลูกค้าแล้ว")} className="btn btn-outline text-[13.5px] py-2">ทำเครื่องหมายส่งลูกค้าแล้ว</button>
              )}
            </>
          )}
          <button onClick={() => printQuotation({ ...current, created_at: undefined })} disabled={items.length === 0} className="btn btn-outline text-[13.5px] py-2 disabled:opacity-50">🖨 PDF</button>
          <button onClick={() => exportQuotationExcel({ ...current, created_at: undefined })} disabled={items.length === 0} className="btn btn-outline text-[13.5px] py-2 disabled:opacity-50">⬇ Excel</button>
        </div>
        <p className="mt-3 text-[11px] text-muted/70 italic">* PDF เปิดหน้าต่างพิมพ์ — เลือก &ldquo;Save as PDF&rdquo; ได้เลย · เลขที่เอกสารรันต่อเนื่องอัตโนมัติจากฐานข้อมูล</p>
      </div>

      {/* ทะเบียนใบเสนอราคาจริงจาก DB */}
      <div className="card-white p-5 min-w-0">
        <h3 className="font-bold text-navy text-[15px]">ทะเบียนใบเสนอราคา <span className="text-sky text-[12px]">({quotes.length})</span></h3>
        <div className="mt-3 space-y-2.5 max-h-[560px] overflow-y-auto pr-1">
          {quotes.map((q) => (
            <div key={q.id} className={`rounded-lg border p-3 text-[12.5px] cursor-pointer transition ${editingId === q.id ? "border-brand shadow-sm" : "border-ice hover:border-brand"}`}
              onClick={() => loadQuote(q)}>
              <div className="flex justify-between font-bold text-navy">
                <span>{q.doc_no}</span><span>{fmt(Math.round(Number(q.total)))}฿</span>
              </div>
              <p className="text-muted mt-0.5">{q.customer_name}</p>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                <span className={`text-[10.5px] font-bold rounded px-1.5 py-0.5 ${statusBadge(q.status)}`}>{q.status}</span>
                <span className="text-muted/70 text-[11px]">{dateTh(q.created_at)}</span>
                {canApprove && q.status === "รออนุมัติ" && (
                  <button onClick={(e) => { e.stopPropagation(); setQuoteStatus(q, "อนุมัติแล้ว"); }}
                    className="ml-auto text-[10.5px] font-bold bg-[#2E9E5B]/15 text-[#2E9E5B] rounded px-1.5 py-0.5 hover:bg-[#2E9E5B]/25">✓ อนุมัติ</button>
                )}
                <button onClick={(e) => { e.stopPropagation(); printQuotation(q); }} className="text-[10.5px] font-bold bg-ice text-navy rounded px-1.5 py-0.5 hover:bg-sky/20">🖨</button>
                <button onClick={(e) => { e.stopPropagation(); exportQuotationExcel(q); }} className="text-[10.5px] font-bold bg-ice text-navy rounded px-1.5 py-0.5 hover:bg-sky/20">⬇ xlsx</button>
              </div>
            </div>
          ))}
          {quotes.length === 0 && <p className="text-[12.5px] text-muted/70">ยังไม่มีใบเสนอราคา</p>}
        </div>
      </div>
    </div>
  );
}

function ProposalTab({ readOnly }: { readOnly: boolean }) {
  const sections = ["แนะนำบริษัท", "ปัญหาและโจทย์ของลูกค้า (จาก Site Survey)", "โซลูชันที่เสนอ + สเปกอุปกรณ์", "Scope of Work", "แผนงานและ Timeline", "เงื่อนไขชำระเงิน + รับประกัน"];
  const [checked, setChecked] = useState<boolean[]>(sections.map(() => true));
  const dbDeals = useDbDeals();
  const openDeals = dbDeals.filter((d) => d.stage !== "won" && d.stage !== "lost");
  const [dealId, setDealId] = useState<number | null>(null);
  const effectiveDealId = dealId ?? openDeals[0]?.id ?? null;
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [text, setText] = useState("");

  const run = async () => {
    setState("loading");
    try {
      const deal = dbDeals.find((d) => d.id === effectiveDealId);
      let actLines: string[] = [];
      if (deal && supabase) {
        const { data } = await supabase.from("deal_activities").select("type,note,created_at")
          .eq("deal_id", deal.id).order("created_at", { ascending: true });
        actLines = ((data as { type: string; note: string; created_at: string }[]) ?? []).map(
          (a) => `- ${new Date(a.created_at).toLocaleDateString("th-TH", { day: "numeric", month: "short" })} ${a.type}: ${a.note}`
        );
      }
      const j = await callCopilot({
        action: "ask",
        payload: [
          "ร่าง Proposal (เอกสารนำเสนอโครงการ) ภาษาไทยแบบพร้อมใช้เป็นร่างแรกจริง สำหรับ CONSERTECH CO., LTD. — ที่ปรึกษาและวิศวกรระบบ Intra-Logistic Automation (LiDAR-Guided AGV) ทีมวิศวกรไทย ติดตั้งจริง ดูแลหลังการขายเอง",
          `ลูกค้า: ${deal?.customer_name} (${deal?.industry ?? "-"}) | โซลูชันที่สนใจ: ${deal?.solution ?? "-"}`,
          "บันทึกกิจกรรม/Survey:",
          ...actLines,
          `หัวข้อที่ต้องมี: ${sections.filter((_, i) => checked[i]).join(", ")}`,
        ].join("\n"),
      });
      setText(String(j.text ?? ""));
      setState("done");
    } catch (e) {
      setText(String(e));
      setState("error");
    }
  };

  return (
    <div className="grid gap-5 min-[1040px]:grid-cols-[380px_1fr] items-start">
      <div className="card-white p-5 min-w-0">
        <p className="text-[11px] font-bold text-sky">เลขที่เอกสาร</p>
        <p className="font-bold text-navy text-[18px]">PR-2569-008 <span className="text-[11px] font-semibold text-muted">(ร่าง)</span></p>
        <label className="block text-[12.5px] font-semibold text-navy mt-3 mb-1">ดีลอ้างอิง</label>
        <select value={effectiveDealId ?? ""} onChange={(e) => setDealId(Number(e.target.value))}
          className="w-full text-[13.5px] rounded-lg border border-ice px-3 py-2 bg-white" disabled={readOnly}>
          {openDeals.map((d) => <option key={d.id} value={d.id}>{dealCode(d.id)} — {d.customer_name}</option>)}
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
          <button onClick={run} disabled={state === "loading"} className="btn btn-amber w-full mt-4 text-[14px] disabled:opacity-60">
            {state === "loading" ? "✨ AI กำลังร่างเอกสาร..." : "✨ ให้ AI ร่าง Proposal"}
          </button>
        )}
        <p className="mt-2 text-[11px] text-muted/70 italic">
          <span className="text-[10px] font-bold bg-brand/10 text-brand rounded px-1.5 py-0.5 not-italic mr-1">AI จริง</span>
          AI ใช้ข้อมูล: บันทึกกิจกรรม/Survey ในดีล + หัวข้อที่เลือก — ร่างแรกเพื่อให้พนักงานตรวจแก้
        </p>
      </div>

      <div className="card-white p-6 min-h-[380px] min-w-0">
        {state === "idle" || state === "loading" ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-muted py-16">
            <p className="text-4xl">{state === "loading" ? "⏳" : "📄"}</p>
            <p className="mt-3 text-[14px]">
              {state === "loading" ? "AI กำลังร่างเอกสารจากข้อมูลดีลจริง..." : <>เลือกดีลและหัวข้อ แล้วกด &ldquo;ให้ AI ร่าง Proposal&rdquo;<br />ร่างเอกสารจะแสดงตรงนี้</>}
            </p>
          </div>
        ) : state === "error" ? (
          <p className="text-[13px] text-[#D94141] bg-[#D94141]/10 rounded-lg px-3 py-2">⚠ {text}</p>
        ) : (
          <div className="text-[13.5px] leading-relaxed">
            <p className="text-[11px] font-bold text-amber mb-2">✨ ร่างโดย AI — รอพนักงานตรวจแก้ก่อนส่งจริง</p>
            <div className="whitespace-pre-wrap">{text}</div>
            <div className="flex gap-2 pt-3">
              <button className="btn btn-primary text-[13px] py-2">บันทึกร่าง</button>
              <button className="btn btn-outline text-[13px] py-2">Export PDF (เฟสถัดไป)</button>
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
