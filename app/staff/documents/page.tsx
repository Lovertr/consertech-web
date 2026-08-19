"use client";

// โมดูลเอกสารขาย — ใบเสนอราคา (สร้างจากข้อมูล Master) + Proposal (AI ร่าง จำลอง) + ทะเบียนเอกสาร

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import StaffShell, { useDept } from "@/components/staff/StaffShell";
import { callCopilot } from "@/lib/copilot";
import { proposals } from "@/lib/staffData";
import SignaturePad from "@/components/staff/SignaturePad";
import { supabase } from "@/lib/supabase";
import Combo from "@/components/staff/Combo";

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

// ── ใบเสนอราคาจริง — บันทึกลง DB + เลขที่รันอัตโนมัติ + รูปสินค้า + ลายเซ็น + PDF/Excel ──
type QuoteItem = { code?: string; name: string; desc?: string | null; unit: string; qty: number; price: number; image_url?: string | null };
type DbQuotation = {
  id: number; doc_no: string; deal_id: number | null; customer_name: string;
  contact_name: string | null; customer_address: string | null; customer_tax_id: string | null;
  items: QuoteItem[]; subtotal: number; discount: number; vat: number; total: number;
  note: string | null; status: string; created_by: string | null; approved_by: string | null;
  prepared_sig_url: string | null; prepared_by_name: string | null; created_at: string;
};
type DbProductLite = {
  id: number; code: string; name: string; description: string | null;
  category: string; unit: string; price: number; image_url: string | null; status: string;
};

const CO = {
  nameEn: "CONSERTECH CO., LTD.",
  nameTh: "บริษัท คันเซอร์เทคซ์ จำกัด",
  // ที่อยู่จดทะเบียนสำหรับออกเอกสาร (ตามใบเสนอราคาจริง — คนละที่กับออฟฟิศ)
  addr: "41/69 หมู่ 6 บางตลาด ปากเกร็ด นนทบุรี 11120",
  tel: "024949191, 0636424914",
  email: "sale01@cs-th.com",
  taxId: "0125568008051",
};

type QCust = {
  id: number; name: string; name_en: string | null; contact_name: string | null; tax_id: string | null;
  address: string | null; subdistrict: string | null; district: string | null; province: string | null; postcode: string | null;
};
type QContact = { id: number; customer_id: number; name: string; name_en: string | null };
function useDbCustomers() {
  const [list, setList] = useState<QCust[]>([]);
  const [contacts, setContacts] = useState<QContact[]>([]);
  useEffect(() => {
    supabase?.from("customers").select("id,name,name_en,contact_name,tax_id,address,subdistrict,district,province,postcode").order("name")
      .then(({ data }) => setList((data as QCust[]) ?? []));
    supabase?.from("customer_contacts").select("id,customer_id,name,name_en")
      .then(({ data }) => setContacts((data as QContact[]) ?? []));
  }, []);
  return { list, contacts };
}

function useDbProducts() {
  const [list, setList] = useState<DbProductLite[]>([]);
  useEffect(() => {
    supabase?.from("products").select("id,code,name,description,category,unit,price,image_url,status")
      .eq("status", "ใช้งาน").order("code")
      .then(({ data }) => setList((data as DbProductLite[]) ?? []));
  }, []);
  return list;
}

const fmtDMY = (d: Date) =>
  `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
const dateTh = (iso?: string) => (iso ? new Date(iso) : new Date()).toLocaleDateString("th-TH", { day: "numeric", month: "long", year: "numeric" });

// จำนวนเงินเป็นตัวอักษรภาษาอังกฤษ (ตามฟอร์แมตใบเสนอราคาจริงของบริษัท)
function numEnWords(n: number): string {
  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  const below100 = (x: number): string => x < 20 ? ones[x] : tens[Math.floor(x / 10)] + (x % 10 ? " " + ones[x % 10] : "");
  const below1000 = (x: number): string => {
    if (x < 100) return below100(x);
    return ones[Math.floor(x / 100)] + " Hundred" + (x % 100 ? " And " + below100(x % 100) : "");
  };
  if (n === 0) return "Zero";
  const groups = [[1e9, "Billion"], [1e6, "Million"], [1e3, "Thousand"], [1, ""]] as const;
  let out = "";
  for (const [v, label] of groups) {
    const g = Math.floor(n / v) % 1000;
    if (g) out += (out ? " " : "") + below1000(g) + (label ? " " + label : "");
  }
  return out;
}
function bahtWords(total: number): string {
  const baht = Math.floor(total);
  const satang = Math.round((total - baht) * 100);
  let s = numEnWords(baht) + " Baht";
  if (satang > 0) s += " And " + numEnWords(satang) + " Satang";
  return `(${s} Only)`;
}

const statusBadge = (s: string) =>
  s === "อนุมัติแล้ว" ? "bg-[#2E9E5B]/15 text-[#2E9E5B]"
  : s === "รออนุมัติ" ? "bg-amber/15 text-amber"
  : s === "ส่งลูกค้าแล้ว" ? "bg-ice text-brand"
  : s === "ยกเลิก" ? "bg-[#D94141]/10 text-[#D94141]"
  : "bg-ice text-muted";

type PrintData = {
  doc_no: string; customer_name: string; contact_name?: string | null; customer_address?: string | null; customer_tax_id?: string | null;
  items: QuoteItem[]; subtotal: number; discount: number; vat: number; total: number;
  note?: string | null; created_at?: string;
  sales_name?: string | null; sales_email?: string | null; sig_url?: string | null;
};

// เปิดหน้าต่างพิมพ์ (บันทึกเป็น PDF ได้) — ฟอร์แมตตามใบเสนอราคาจริงของบริษัท (มีรูปสินค้า + ลายเซ็น)
function printQuotation(q: PrintData) {
  const fmtN = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const created = q.created_at ? new Date(q.created_at) : new Date();
  const valid = new Date(created.getTime() + 30 * 24 * 3600 * 1000);
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const rows = q.items.map((it, i) => `<tr>
    <td style="text-align:center;vertical-align:top;padding-top:12px">${i + 1}</td>
    <td style="width:74px;text-align:center">${it.image_url ? `<img src="${it.image_url}" style="width:60px;height:60px;object-fit:contain">` : ""}</td>
    <td style="vertical-align:top;padding-top:12px">
      <div style="font-weight:700">${esc(it.name)}</div>
      ${it.desc ? `<div style="font-size:10.5px;color:#4A5E6E;margin-top:2px">${esc(it.desc)}</div>` : ""}
    </td>
    <td style="text-align:center;vertical-align:top;padding-top:12px">${it.qty.toLocaleString("en-US")}</td>
    <td style="text-align:right;vertical-align:top;padding-top:12px">฿${fmtN(it.price)}</td>
    <td style="text-align:right;vertical-align:top;padding-top:12px">฿${fmtN(it.qty * it.price)}</td>
  </tr>`).join("");
  const html = `<!doctype html><html lang="th"><head><meta charset="utf-8"><title>${q.doc_no}</title>
  <style>
    * { box-sizing: border-box; font-family: 'Segoe UI', Tahoma, sans-serif; }
    body { margin: 0; padding: 26px 34px; color: #12212E; font-size: 12.5px; }
    table.items { width: 100%; border-collapse: collapse; margin-top: 16px; }
    table.items thead th { background: #1B7FD4; color: #fff; padding: 8px; font-size: 12px; text-align: left; }
    table.items tbody td { border-bottom: 1px solid #D7E4F0; padding: 8px; }
    table.items tbody tr:first-child td { border-top: 2px solid #0E3A5C; }
    .muted { color: #8A9BA8; }
    @media print { body { padding: 8mm 10mm; } }
  </style></head><body>
  <table style="width:100%"><tr>
    <td style="width:55%;vertical-align:top">
      <img src="${location.origin}/logo-consertech.png" style="height:56px" onerror="this.style.display='none'">
      <div style="margin-top:8px;font-weight:700">${CO.nameTh}</div>
      <div style="font-size:11.5px;color:#4A5E6E;max-width:330px">${CO.addr}</div>
      <div style="font-size:11.5px;color:#4A5E6E">Tel: ${CO.tel}</div>
      <div style="font-size:11.5px;color:#4A5E6E">Tax Id: ${CO.taxId}</div>
    </td>
    <td style="vertical-align:top">
      <div style="background:linear-gradient(90deg,#F0A030 0 8px,#1B7FD4 8px);color:#fff;font-size:22px;font-weight:800;text-align:center;padding:10px 0;border-radius:2px">Quotation</div>
      <table style="width:100%;font-size:12px;margin-top:10px">
        <tr><td class="muted" style="width:104px;padding:2px 0">Salesperson</td><td>${esc(q.sales_name ?? "-")}</td></tr>
        <tr><td class="muted" style="padding:2px 0">Phone</td><td>${CO.tel}</td></tr>
        <tr><td class="muted" style="padding:2px 0">Email</td><td>${esc(q.sales_email ?? CO.email)}</td></tr>
        <tr><td colspan="2" style="height:8px"></td></tr>
        <tr><td class="muted" style="padding:2px 0">Quotation No.</td><td style="font-weight:700">${q.doc_no}</td></tr>
        <tr><td class="muted" style="padding:2px 0">Quotation Date</td><td>${fmtDMY(created)}</td></tr>
        <tr><td class="muted" style="padding:2px 0">Valid until</td><td>${fmtDMY(valid)}</td></tr>
      </table>
    </td>
  </tr></table>
  <div style="margin-top:14px">
    ${q.contact_name ? `<div style="font-weight:700">ATTN : ${esc(q.contact_name)}</div>` : ""}
    <div style="font-weight:800">${esc(q.customer_name)}</div>
    ${q.customer_address ? `<div style="font-size:11.5px;color:#4A5E6E;max-width:420px">${esc(q.customer_address)}</div>` : ""}
    ${q.customer_tax_id ? `<div style="font-size:11.5px;color:#4A5E6E">Tax Id: ${esc(q.customer_tax_id)}</div>` : ""}
  </div>
  <table class="items"><thead><tr>
    <th style="width:34px;text-align:center">No.</th><th colspan="2">Product Name</th>
    <th style="width:46px;text-align:center">Qty</th><th style="width:92px;text-align:right">Unit Price</th><th style="width:100px;text-align:right">Total</th>
  </tr></thead><tbody>${rows}</tbody></table>
  <table style="width:100%;margin-top:14px"><tr>
    <td style="vertical-align:bottom;font-size:12px;font-weight:600;text-align:center">${bahtWords(q.total)}</td>
    <td style="width:300px">
      <table style="width:100%;font-size:12.5px">
        <tr><td style="padding:5px 8px">Subtotal</td><td style="text-align:right;padding:5px 8px">฿${fmtN(q.subtotal)}</td></tr>
        ${q.discount > 0 ? `<tr><td style="padding:5px 8px">Discount</td><td style="text-align:right;padding:5px 8px">-฿${fmtN(q.discount)}</td></tr>` : ""}
        <tr><td style="padding:5px 8px;border-bottom:1px solid #D7E4F0">VAT 7%</td><td style="text-align:right;padding:5px 8px;border-bottom:1px solid #D7E4F0">฿${fmtN(q.vat)}</td></tr>
        <tr style="font-weight:800;font-size:14px"><td style="padding:7px 8px">Grand Total</td><td style="text-align:right;padding:7px 8px">฿${fmtN(q.total)}</td></tr>
        <tr><td colspan="2" style="border-top:3px double #1B7FD4"></td></tr>
      </table>
    </td>
  </tr></table>
  ${q.note ? `<div style="margin-top:10px;font-size:11.5px;color:#4A5E6E"><strong style="color:#12212E">หมายเหตุ:</strong> ${esc(q.note)}</div>` : ""}
  <table style="width:100%;margin-top:60px;text-align:center;font-size:12px"><tr>
    <td style="width:50%">
      <div style="font-weight:600">${CO.nameTh}</div>
      <div style="height:58px;display:flex;align-items:flex-end;justify-content:center">
        ${q.sig_url ? `<img src="${q.sig_url}" style="max-height:52px;max-width:190px;object-fit:contain">` : ""}
      </div>
      <div style="border-top:1.5px solid #12212E;width:220px;margin:4px auto 0;padding-top:4px" class="muted">Prepared By</div>
      <div style="font-weight:600">${esc(q.sales_name ?? "")}</div>
    </td>
    <td style="width:50%">
      <div style="font-weight:600">${esc(q.customer_name)}</div>
      <div style="height:58px"></div>
      <div style="border-top:1.5px solid #12212E;width:220px;margin:4px auto 0;padding-top:4px" class="muted">Authorized by</div>
      <div class="muted">(..............................................)</div>
    </td>
  </tr></table>
  <script>window.onload = () => setTimeout(() => window.print(), 400);</script>
  </body></html>`;
  const w = window.open("", "_blank");
  if (!w) { alert("เบราว์เซอร์บล็อกป๊อปอัป — อนุญาตป๊อปอัปเพื่อพิมพ์ PDF"); return; }
  w.document.write(html);
  w.document.close();
}

async function exportQuotationExcel(q: PrintData) {
  const XLSX = await import("xlsx");
  const aoa: (string | number)[][] = [
    [CO.nameTh + " — ใบเสนอราคา (QUOTATION)"],
    [CO.addr],
    [`Tel ${CO.tel} · ${CO.email} · Tax Id ${CO.taxId}`],
    [],
    ["Quotation No.", q.doc_no, "", "Date", fmtDMY(q.created_at ? new Date(q.created_at) : new Date())],
    ["ลูกค้า", q.customer_name, "", "ผู้ติดต่อ", q.contact_name ?? "-"],
    ...(q.customer_address ? [["ที่อยู่", q.customer_address]] : []),
    ...(q.customer_tax_id ? [["Tax Id ลูกค้า", q.customer_tax_id]] : []),
    [],
    ["No.", "รายการ", "หน่วย", "จำนวน", "ราคา/หน่วย (฿)", "จำนวนเงิน (฿)"],
    ...q.items.map((it, i) => [i + 1, (it.code ? `[${it.code}] ` : "") + it.name + (it.desc ? ` — ${it.desc}` : ""), it.unit, it.qty, it.price, it.qty * it.price]),
    [],
    ["", "", "", "", "Subtotal", q.subtotal],
    ...(q.discount > 0 ? [["", "", "", "", "Discount", -q.discount]] : []),
    ["", "", "", "", "VAT 7%", q.vat],
    ["", "", "", "", "Grand Total", q.total],
    ["", "", "", "", "", bahtWords(q.total)],
  ];
  if (q.note) aoa.push([], ["หมายเหตุ", q.note]);
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws["!cols"] = [{ wch: 6 }, { wch: 60 }, { wch: 8 }, { wch: 8 }, { wch: 15 }, { wch: 16 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, q.doc_no);
  XLSX.writeFile(wb, `${q.doc_no}.xlsx`);
}

function QuotationBuilder({ readOnly }: { readOnly: boolean }) {
  const { dept, empId } = useDept();
  const canApprove = dept === "management";
  const dbDeals = useDbDeals();
  const dbProducts = useDbProducts();
  const { list: dbCustomers, contacts: dbContacts } = useDbCustomers();
  const [empMap, setEmpMap] = useState<Record<string, { name: string; email: string | null; signature_url: string | null }>>({});
  const [quotes, setQuotes] = useState<DbQuotation[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [docNo, setDocNo] = useState<string | null>(null);
  const [status, setStatus] = useState("ร่าง");
  const [dealId, setDealId] = useState<number | null>(null);
  const [customer, setCustomer] = useState("");
  const [contactName, setContactName] = useState("");
  const [custAddr, setCustAddr] = useState("");
  const [custTaxId, setCustTaxId] = useState("");
  const [items, setItems] = useState<QuoteItem[]>([]);
  const [discount, setDiscount] = useState(0);
  const [note, setNote] = useState("");
  const [preparedSig, setPreparedSig] = useState<string | null>(null);
  const [preparedName, setPreparedName] = useState<string | null>(null);
  const [showPad, setShowPad] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const load = async () => {
    if (!supabase) return;
    const [qz, em] = await Promise.all([
      supabase.from("quotations").select("*").order("doc_no", { ascending: false }),
      supabase.from("employees").select("id,name,email,signature_url"),
    ]);
    setQuotes((qz.data as DbQuotation[]) ?? []);
    setEmpMap(Object.fromEntries(((em.data as { id: string; name: string; email: string | null; signature_url: string | null }[]) ?? []).map((x) => [x.id, x])));
  };
  useEffect(() => { load(); }, []);

  const me = empMap[empId];
  const mySig = me?.signature_url ?? null;

  const subtotal = items.reduce((a, it) => a + it.qty * it.price, 0);
  const afterDisc = Math.max(0, subtotal - discount);
  const vat = Math.round(afterDisc * 0.07 * 100) / 100;
  const total = afterDisc + vat;

  const resetForm = () => {
    setEditingId(null); setDocNo(null); setStatus("ร่าง");
    setDealId(null); setCustomer(""); setContactName(""); setCustAddr(""); setCustTaxId("");
    setItems([]); setDiscount(0); setNote(""); setPreparedSig(null); setPreparedName(null); setErr("");
  };

  const pickDeal = (id: number) => {
    setDealId(id);
    const d = dbDeals.find((x) => x.id === id);
    if (d) setCustomer(d.customer_name);
  };

  const loadQuote = (q: DbQuotation) => {
    setEditingId(q.id); setDocNo(q.doc_no); setStatus(q.status);
    setDealId(q.deal_id); setCustomer(q.customer_name);
    setContactName(q.contact_name ?? ""); setCustAddr(q.customer_address ?? ""); setCustTaxId(q.customer_tax_id ?? "");
    setItems(Array.isArray(q.items) ? q.items : []);
    setDiscount(Number(q.discount) || 0); setNote(q.note ?? "");
    setPreparedSig(q.prepared_sig_url); setPreparedName(q.prepared_by_name); setErr("");
  };

  const extraFields = () => ({
    contact_name: contactName.trim() || null,
    customer_address: custAddr.trim() || null,
    customer_tax_id: custTaxId.trim() || null,
  });

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
        const patch: Record<string, unknown> = { ...extraFields() };
        if (newStatus) { patch.status = newStatus; setStatus(newStatus); }
        await supabase.from("quotations").update(patch).eq("id", r.id);
        if (dealId !== null) {
          await supabase.from("deal_activities").insert({ deal_id: dealId, emp_id: empId || null, type: "เอกสาร", note: `สร้างใบเสนอราคา ${r.doc_no}` });
        }
      } else {
        const patch: Record<string, unknown> = {
          deal_id: dealId, customer_name: customer.trim(), items,
          subtotal, discount, vat, total, note: note.trim() || null, ...extraFields(),
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

  // เซ็นเอกสาร — ใช้ลายเซ็นที่บันทึกไว้ หรือเปิดแผ่นเซ็นถ้ายังไม่มี
  const applySignature = async (url: string) => {
    if (!supabase || editingId === null) return;
    const name = me?.name ?? "";
    await supabase.from("quotations").update({ prepared_sig_url: url, prepared_by_name: name }).eq("id", editingId);
    setPreparedSig(url); setPreparedName(name);
    setShowPad(false);
    load();
  };
  const signDoc = () => {
    if (editingId === null) { setErr("บันทึกเอกสารก่อนจึงจะเซ็นได้"); return; }
    if (mySig) applySignature(mySig);
    else setShowPad(true);
  };

  const printData = (q?: DbQuotation): PrintData => {
    if (q) {
      const creator = q.created_by ? empMap[q.created_by] : undefined;
      return { ...q, sales_name: q.prepared_by_name ?? creator?.name ?? null, sales_email: creator?.email ?? null, sig_url: q.prepared_sig_url };
    }
    return {
      doc_no: docNo ?? "(ยังไม่บันทึก)", customer_name: customer, contact_name: contactName, customer_address: custAddr, customer_tax_id: custTaxId,
      items, subtotal, discount, vat, total, note,
      sales_name: preparedName ?? me?.name ?? null, sales_email: me?.email ?? null, sig_url: preparedSig,
    };
  };

  return (
    <div className="grid gap-5 min-[1040px]:grid-cols-[1fr_360px] items-start">
      {showPad && <SignaturePad empId={empId} onSaved={applySignature} onCancel={() => setShowPad(false)} />}
      <div className="card-white p-5 min-w-0">
        <div className="flex flex-wrap justify-between gap-2">
          <div>
            <p className="text-[11px] font-bold text-sky">เลขที่เอกสาร (รันอัตโนมัติเมื่อบันทึก)</p>
            <p className="font-bold text-navy text-[18px]">
              {docNo ?? "QXXXXXXXXX"}{" "}
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
            <label className="text-[11.5px] font-bold text-muted">ลูกค้า (พิมพ์ค้นหาจากระบบ หรือพิมพ์ชื่อใหม่) *</label>
            <Combo value={customer} disabled={readOnly} placeholder="พิมพ์ชื่อบริษัท..."
              options={dbCustomers.flatMap((c) => [{ value: c.name, label: c.name_en ?? undefined }, ...(c.name_en ? [{ value: c.name_en, label: c.name }] : [])])}
              onChange={(v) => {
                setCustomer(v);
                const hit = dbCustomers.find((c) => c.name === v || c.name_en === v);
                if (hit) {
                  // เติมข้อมูลจากระบบลูกค้าให้อัตโนมัติ
                  if (hit.contact_name) setContactName(hit.contact_name);
                  if (hit.tax_id) setCustTaxId(hit.tax_id);
                  const addr = [hit.address, hit.subdistrict, hit.district, hit.province, hit.postcode].filter(Boolean).join(" ");
                  if (addr) setCustAddr(addr);
                }
              }}
              className="mt-1 w-full text-[13px] rounded-lg border border-ice px-3 py-2" />
          </div>
          <div>
            <label className="text-[11.5px] font-bold text-muted">ผู้ติดต่อ (ATTN — พิมพ์ค้นหาได้)</label>
            <Combo value={contactName} onChange={setContactName} disabled={readOnly} placeholder="ชื่อผู้ติดต่อฝั่งลูกค้า"
              options={(dbCustomers.find((c) => c.name === customer || c.name_en === customer)
                ? dbContacts.filter((x) => x.customer_id === dbCustomers.find((c) => c.name === customer || c.name_en === customer)!.id)
                : dbContacts
              ).flatMap((x) => [{ value: x.name, label: x.name_en ?? undefined }, ...(x.name_en ? [{ value: x.name_en, label: x.name }] : [])])}
              className="mt-1 w-full text-[13px] rounded-lg border border-ice px-3 py-2" />
          </div>
          <div>
            <label className="text-[11.5px] font-bold text-muted">Tax ID ลูกค้า</label>
            <input value={custTaxId} onChange={(e) => setCustTaxId(e.target.value)} disabled={readOnly} placeholder="เลขผู้เสียภาษี 13 หลัก"
              className="mt-1 w-full text-[13px] rounded-lg border border-ice px-3 py-2" />
          </div>
          <div className="sm:col-span-2">
            <label className="text-[11.5px] font-bold text-muted">ที่อยู่ลูกค้า</label>
            <input value={custAddr} onChange={(e) => setCustAddr(e.target.value)} disabled={readOnly} placeholder="ที่อยู่สำหรับออกเอกสาร"
              className="mt-1 w-full text-[13px] rounded-lg border border-ice px-3 py-2" />
          </div>
        </div>

        <div className="overflow-x-auto mt-4 -mx-1 px-1">
        <table className="w-full min-w-[520px] text-[13px]">
          <thead>
            <tr className="bg-ice/70 text-navy">
              <th className="text-left px-3 py-2 font-bold" colSpan={2}>รายการ</th>
              <th className="text-right px-2 py-2 font-bold w-16">จำนวน</th>
              <th className="text-right px-2 py-2 font-bold w-24">ราคา/หน่วย</th>
              <th className="text-right px-3 py-2 font-bold w-28">รวม</th>
              {!readOnly && <th className="w-8"></th>}
            </tr>
          </thead>
          <tbody>
            {items.map((it, i) => (
              <tr key={i} className={i % 2 ? "bg-ice/30" : ""}>
                <td className="pl-3 py-2 w-12">
                  {it.image_url
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={it.image_url} alt="" className="w-10 h-10 object-contain bg-white border border-ice rounded" />
                    : <div className="w-10 h-10 rounded bg-ice/70 flex items-center justify-center text-[15px]">📦</div>}
                </td>
                <td className="px-2 py-2">
                  {it.code && <span className="text-[10.5px] text-sky font-bold mr-1.5">{it.code}</span>}
                  {readOnly || it.code ? (
                    <span className="font-semibold text-navy">{it.name}</span>
                  ) : (
                    <input value={it.name} onChange={(e) => setItems(items.map((x, j) => j === i ? { ...x, name: e.target.value } : x))}
                      placeholder="ชื่อรายการ" className="w-full rounded border border-ice px-1.5 py-0.5" />
                  )}
                  {it.desc && <p className="text-[11px] text-muted/80 leading-snug mt-0.5">{it.desc}</p>}
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
              <tr><td colSpan={readOnly ? 5 : 6} className="px-3 py-6 text-center text-muted/70 text-[12.5px]">ยังไม่มีรายการ — เพิ่มจากข้อมูล Master หรือพิมพ์รายการเองด้านล่าง</td></tr>
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
                const p = dbProducts.find((x) => x.code === e.target.value);
                if (p) setItems([...items, { code: p.code, name: p.name, desc: p.description, unit: p.unit, qty: 1, price: p.price, image_url: p.image_url }]);
              }}
            >
              <option value="">＋ เพิ่มรายการจากข้อมูล Master...</option>
              {dbProducts.filter((p) => !items.some((it) => it.code === p.code)).map((p) => (
                <option key={p.id} value={p.code}>{p.code} — {p.name} ({fmt(p.price)}฿)</option>
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

        {/* ลายเซ็นผู้เสนอราคา */}
        <div className="mt-3 rounded-xl bg-ice/40 px-3.5 py-2.5 flex flex-wrap items-center gap-3 text-[12.5px]">
          <strong className="text-navy">🖊 ลายเซ็นผู้เสนอราคา:</strong>
          {preparedSig ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preparedSig} alt="ลายเซ็น" className="h-10 bg-white border border-ice rounded px-2 object-contain" />
              <span className="text-muted">เซ็นแล้วโดย {preparedName}</span>
              {!readOnly && <button onClick={() => setShowPad(true)} className="text-sky font-semibold hover:text-brand">เซ็นใหม่</button>}
            </>
          ) : (
            <>
              <span className="text-muted">ยังไม่ได้เซ็น</span>
              {!readOnly && (
                <button onClick={signDoc} disabled={editingId === null} title={editingId === null ? "บันทึกเอกสารก่อน" : ""}
                  className="btn btn-outline text-[12px] py-1.5 px-3 disabled:opacity-50">
                  {mySig ? "กดเซ็นด้วยลายเซ็นของฉัน" : "สร้างลายเซ็น + เซ็นเอกสาร"}
                </button>
              )}
            </>
          )}
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
          <button onClick={() => printQuotation(printData())} disabled={items.length === 0} className="btn btn-outline text-[13.5px] py-2 disabled:opacity-50">🖨 PDF</button>
          <button onClick={() => exportQuotationExcel(printData())} disabled={items.length === 0} className="btn btn-outline text-[13.5px] py-2 disabled:opacity-50">⬇ Excel</button>
        </div>
        <p className="mt-3 text-[11px] text-muted/70 italic">* PDF เปิดหน้าต่างพิมพ์ — เลือก &ldquo;Save as PDF&rdquo; ได้เลย · เลขที่เอกสารรันต่อเนื่องอัตโนมัติจากฐานข้อมูล · รูปสินค้าและลายเซ็นแสดงในเอกสารอัตโนมัติ</p>
      </div>

      {/* ทะเบียนใบเสนอราคาจริงจาก DB */}
      <div className="card-white p-5 min-w-0">
        <h3 className="font-bold text-navy text-[15px]">ทะเบียนใบเสนอราคา <span className="text-sky text-[12px]">({quotes.length})</span></h3>
        <div className="mt-3 space-y-2.5 max-h-[560px] overflow-y-auto pr-1">
          {quotes.map((q) => (
            <div key={q.id} className={`rounded-lg border p-3 text-[12.5px] cursor-pointer transition ${editingId === q.id ? "border-brand shadow-sm" : "border-ice hover:border-brand"}`}
              onClick={() => loadQuote(q)}>
              <div className="flex justify-between font-bold text-navy">
                <span>{q.doc_no}{q.prepared_sig_url && <span title="เซ็นแล้ว" className="ml-1">🖊</span>}</span><span>{fmt(Math.round(Number(q.total)))}฿</span>
              </div>
              <p className="text-muted mt-0.5">{q.customer_name}</p>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                <span className={`text-[10.5px] font-bold rounded px-1.5 py-0.5 ${statusBadge(q.status)}`}>{q.status}</span>
                <span className="text-muted/70 text-[11px]">{dateTh(q.created_at)}</span>
                {canApprove && q.status === "รออนุมัติ" && (
                  <button onClick={(e) => { e.stopPropagation(); setQuoteStatus(q, "อนุมัติแล้ว"); }}
                    className="ml-auto text-[10.5px] font-bold bg-[#2E9E5B]/15 text-[#2E9E5B] rounded px-1.5 py-0.5 hover:bg-[#2E9E5B]/25">✓ อนุมัติ</button>
                )}
                <button onClick={(e) => { e.stopPropagation(); printQuotation(printData(q)); }} className="text-[10.5px] font-bold bg-ice text-navy rounded px-1.5 py-0.5 hover:bg-sky/20">🖨</button>
                <button onClick={(e) => { e.stopPropagation(); exportQuotationExcel(printData(q)); }} className="text-[10.5px] font-bold bg-ice text-navy rounded px-1.5 py-0.5 hover:bg-sky/20">⬇ xlsx</button>
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
