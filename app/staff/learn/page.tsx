"use client";

// 🎓 AI ครูฝึก (Academy) — สอน/ตอบคำถามพนักงานเรื่องสินค้าและเทคนิค: AGV, เซนเซอร์, PLC, การต่อสาย, Safety ฯลฯ
// - โหมด ถาม-ตอบ / บทเรียน / แบบทดสอบ / เปรียบเทียบสินค้า
// - แนบสินค้าจาก Master (สเปกจริงใน DB) ให้ AI อธิบาย/เปรียบเทียบได้
// - AI อ่านฐานความรู้บริษัท (ai_knowledge) อยู่แล้วผ่าน edge function; บทสนทนาบันทึกต่อคน (ai_tutor_sessions)
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import StaffShell, { useDept } from "@/components/staff/StaffShell";
import Combo from "@/components/staff/Combo";
import { supabase } from "@/lib/supabase";
import { callCopilot } from "@/lib/copilot";
import { mdToHtml } from "@/lib/articles";

type Msg = { role: "user" | "ai"; text: string; at?: string };
type Session = { id: number; emp_id: string; title: string; track: string | null; mode: string; messages: Msg[]; updated_at: string };
type Prod = { id: number; code: string; name: string; category: string; brand: string | null; series: string | null; model: string | null; specs: string | null; description: string | null; price: number; unit: string };
type Mode = "qa" | "lesson" | "quiz" | "compare";

const TRACKS: { key: string; icon: string; label: string; desc: string; starters: string[] }[] = [
  { key: "agv", icon: "🤖", label: "AGV / AMR & FMS", desc: "หลักการทำงาน การนำทาง LiDAR ระบบขับเคลื่อน FMS", starters: ["AGV LiDAR-Guided ทำงานยังไง อธิบายเป็นขั้นตอน", "Differential / Steering / Quad Drive ต่างกันยังไง เลือกยังไง", "FMS ป้องกันรถชนกันที่ทางแยกได้ยังไง", "คำนวณจำนวน AGV ที่ต้องใช้จากรอบงานยังไง"] },
  { key: "sensor", icon: "📡", label: "เซนเซอร์", desc: "Photoelectric, Proximity, Ultrasonic, ม่านแสง, Pressure", starters: ["เซนเซอร์แสง Through-beam / Retro-reflective / Diffuse ต่างกันยังไง เลือกยังไง", "NPN กับ PNP ต่างกันยังไง ดูจากอะไรว่าต้องใช้แบบไหน", "จะตรวจจับขวดใสบนสายพาน ควรใช้เซนเซอร์แบบไหน", "ม่านแสงตรวจจับวัตถุ (Detecting Grating) กับ Safety Light Curtain ต่างกันยังไง"] },
  { key: "plc", icon: "🧠", label: "PLC & โปรแกรม", desc: "Ladder, ST, Timer/Counter, Siemens / Mitsubishi / Omron", starters: ["สอน Ladder พื้นฐาน: Self-holding, Interlock, Timer, Counter พร้อมตัวอย่าง", "เขียน Ladder ควบคุมสายพาน Start/Stop + เซนเซอร์นับชิ้นงาน", "Structured Text ต่างจาก Ladder ยังไง ควรใช้เมื่อไร", "Scan cycle ของ PLC คืออะไร ทำไมต้องรู้"] },
  { key: "wiring", icon: "🔌", label: "ไฟฟ้า & การต่อสาย", desc: "ต่อสายเซนเซอร์เข้า PLC, ตู้คอนโทรล, ความปลอดภัย", starters: ["ต่อสายเซนเซอร์ 3 สาย (น้ำตาล/น้ำเงิน/ดำ) เข้า Input PLC ยังไง", "Sink/Source ของการ์ด Input คืออะไร ต่อผิดเกิดอะไรขึ้น", "ขั้นตอนต่อสายตู้คอนโทรลอย่างปลอดภัย และเช็คก่อนจ่ายไฟ", "ทำไมต้องแยกรางสายกำลังกับสายสัญญาณ"] },
  { key: "safety", icon: "🛡️", label: "Machine Safety", desc: "ISO 13849, PL/SIL, Light Curtain, Safety Scanner, E-Stop", starters: ["Performance Level (PL) คืออะไร เลือก PLr ยังไง", "คำนวณ Safety distance ของ Light Curtain (ISO 13855) ยังไง", "Safety Relay กับ Safety PLC ต่างกันยังไง", "E-Stop Category 0 กับ 1 ต่างกันยังไง"] },
  { key: "network", icon: "🌐", label: "Network & IoT", desc: "Wi-Fi อุตสาหกรรม, Ethernet/IP, Modbus, PROFINET", starters: ["Modbus TCP กับ PROFINET ต่างกันยังไง", "ออกแบบ Wi-Fi ให้ AGV ไม่หลุดต้องคำนึงอะไร", "VLAN คืออะไร ทำไมต้องแยกวงหุ่นยนต์"] },
  { key: "sales", icon: "💼", label: "ความรู้สินค้าเพื่อการขาย", desc: "อธิบายสินค้าให้ลูกค้าเข้าใจ ตอบคำถามที่ลูกค้าถามบ่อย", starters: ["อธิบาย Condition Monitoring ให้ลูกค้าที่ไม่ใช่ช่างเข้าใจใน 1 นาที", "ลูกค้าถามว่า AGV คุ้มไหม ตอบยังไง", "RFID กับ Barcode ต่างกันยังไง เหมาะกับงานไหน"] },
];

const MODES: { key: Mode; label: string; icon: string; hint: string }[] = [
  { key: "qa", label: "ถาม-ตอบ", icon: "💬", hint: "ถามอะไรก็ได้ ครูจะอธิบายเป็นขั้นตอน พร้อมตัวอย่าง" },
  { key: "lesson", label: "บทเรียน", icon: "📘", hint: "พิมพ์หัวข้อ → ได้บทเรียนเป็นโครงสร้าง (เป้าหมาย · เนื้อหา · ตัวอย่าง · สรุป · แบบฝึกหัด)" },
  { key: "quiz", label: "แบบทดสอบ", icon: "📝", hint: "พิมพ์หัวข้อ → ได้ข้อสอบ 5 ข้อ ตอบแล้วครูตรวจให้พร้อมเฉลย" },
  { key: "compare", label: "เปรียบเทียบสินค้า", icon: "⚖️", hint: "เลือกสินค้าจาก Master 2–3 รายการ → ครูเทียบสเปก จุดต่าง และแนะนำว่างานแบบไหนใช้รุ่นไหน" },
];

// แปลง Markdown + code fence เป็น HTML (โค้ด PLC/ST/Ladder ต้องคง whitespace)
function esc(s: string) { return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
function renderMd(md: string): string {
  const parts = md.split(/```/);
  return parts.map((p, i) => {
    if (i % 2 === 1) {
      const nl = p.indexOf("\n"); const lang = nl > -1 ? p.slice(0, nl).trim() : ""; const code = nl > -1 ? p.slice(nl + 1) : p;
      return `<pre class="tutor-code"><div class="tutor-code-lang">${esc(lang || "code")}</div><code>${esc(code.replace(/\s+$/, ""))}</code></pre>`;
    }
    // ตารางแบบ markdown ง่ายๆ
    const lines = p.split("\n"); const out: string[] = []; let tbl: string[] = [];
    const flushT = () => {
      if (tbl.length >= 2) {
        const rows = tbl.filter((l) => !/^\s*\|?\s*:?-{2,}/.test(l)).map((l) => l.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim()));
        const [h, ...body] = rows;
        out.push(`<div class="overflow-x-auto"><table class="tutor-table"><thead><tr>${h.map((c) => `<th>${inlineMd(c)}</th>`).join("")}</tr></thead><tbody>${body.map((r) => `<tr>${r.map((c) => `<td>${inlineMd(c)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`);
      } else if (tbl.length) out.push(mdToHtml(tbl.join("\n")));
      tbl = [];
    };
    let buf: string[] = [];
    const flushB = () => { if (buf.length) { out.push(mdToHtml(buf.join("\n"))); buf = []; } };
    for (const l of lines) {
      if (/^\s*\|.*\|\s*$/.test(l)) { flushB(); tbl.push(l); }
      else if (/^\s*(-{3,}|\*{3,})\s*$/.test(l)) { flushT(); flushB(); out.push('<hr class="my-3 border-ice" />'); }
      else { flushT(); buf.push(l); }
    }
    flushT(); flushB();
    return out.join("\n");
  }).join("\n");
}
function inlineMd(s: string) { return mdToHtml(s).replace(/^<p>|<\/p>$/g, ""); }

function prodLine(p: Prod) {
  return `• ${p.code} — ${p.name}${p.brand ? ` (${p.brand}${p.series ? " / " + p.series : ""}${p.model ? " / " + p.model : ""})` : ""} | หมวด: ${p.category}${p.price ? ` | ราคา ${Number(p.price).toLocaleString("th-TH")} บ./${p.unit}` : ""}${p.description ? `\n  รายละเอียด: ${p.description}` : ""}${p.specs ? `\n  สเปก: ${p.specs.slice(0, 1500)}` : ""}`;
}

function LearnBody() {
  const { empId } = useDept();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [cur, setCur] = useState<Session | null>(null);
  const [track, setTrack] = useState<string>("sensor");
  const [mode, setMode] = useState<Mode>("qa");
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [products, setProducts] = useState<Prod[]>([]);
  const [picked, setPicked] = useState<Prod[]>([]);
  const [pickText, setPickText] = useState("");
  const [showList, setShowList] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  const loadSessions = useCallback(async () => {
    if (!supabase || !empId) return;
    const { data } = await supabase.from("ai_tutor_sessions").select("*").eq("emp_id", empId).order("updated_at", { ascending: false }).limit(40);
    setSessions((data as Session[]) ?? []);
  }, [empId]);
  useEffect(() => { loadSessions(); }, [loadSessions]);
  useEffect(() => {
    if (!supabase) return;
    supabase.from("products").select("id,code,name,category,brand,series,model,specs,description,price,unit").order("code").then(({ data }) => setProducts((data as Prod[]) ?? []));
  }, []);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [cur?.messages.length, busy]);

  const msgs = cur?.messages ?? [];
  const trackMeta = TRACKS.find((t) => t.key === track)!;

  const prodOptions = useMemo(() => products.map((p) => ({ value: `${p.code} — ${p.name}`, sub: [p.brand, p.series, p.model].filter(Boolean).join(" / ") || p.category })), [products]);
  const addProduct = (label: string) => {
    const code = label.split(" — ")[0]?.trim(); const p = products.find((x) => x.code === code);
    if (p && !picked.some((x) => x.id === p.id) && picked.length < 4) setPicked([...picked, p]);
    setPickText("");
  };

  const buildPrompt = (question: string, history: Msg[]) => {
    const persona = [
      "คุณคือ 'ครูฝึก' (AI Tutor) ของ CONSERTECH สอนพนักงานใหม่/ฝ่ายขาย/วิศวกร เรื่องสินค้าและเทคนิคระบบอัตโนมัติอุตสาหกรรม",
      "วิธีสอน: อธิบายภาษาไทยเข้าใจง่าย เป็นขั้นตอน ยกตัวอย่างหน้างานจริง ใช้หัวข้อ/รายการ/ตารางเมื่อช่วยให้เข้าใจ ถ้าเป็นโค้ด (Ladder ให้เขียนเป็นข้อความอธิบาย rung ทีละบรรทัด หรือ Structured Text/สคริปต์) ให้ใส่ใน code block ``` เสมอ",
      "เมื่อพูดถึงงานไฟฟ้า/ต่อสาย/เครื่องจักร ให้แทรกคำเตือนความปลอดภัยที่เกี่ยวข้อง (ตัดไฟ Lockout/Tagout ตรวจแรงดันก่อนแตะ ปฏิบัติตามคู่มือผู้ผลิต)",
      "ยึดฐานความรู้บริษัทใน system prompt เป็นหลัก ถ้าไม่มีให้ใช้หลักวิศวกรรมทั่วไปและบอกให้ตรวจสอบกับ datasheet/คู่มือจริง ถ้าถามเรื่องที่ตอบไม่ได้แน่ชัด ให้บอกตรงๆ อย่าเดา",
      "จบคำตอบด้วย 'ลองต่อ:' 1–2 คำถามชวนคิด/แบบฝึกหัดสั้นๆ ให้ผู้เรียนไปทำต่อ (ยกเว้นโหมดตรวจข้อสอบ)",
      `หมวดที่กำลังเรียน: ${trackMeta.label} — ${trackMeta.desc}`,
    ];
    if (mode === "lesson") persona.push("โหมดบทเรียน: จัดเป็นบทเรียนที่มีโครงสร้าง — 🎯 เป้าหมายการเรียนรู้ · 📖 เนื้อหาหลัก (แบ่งเป็นตอน) · 🏭 ตัวอย่างหน้างานจริง · ⚠️ ข้อผิดพลาดที่พบบ่อย · ✅ สรุปสั้น · ✍️ แบบฝึกหัด 3 ข้อ");
    if (mode === "quiz") persona.push("โหมดแบบทดสอบ: ถ้าผู้เรียนขอข้อสอบ ให้ออกข้อสอบ 5 ข้อ (ปรนัย 4 ตัวเลือก หรืออัตนัยสั้น) ยังไม่ต้องเฉลย บอกให้ตอบเป็นข้อๆ ถ้าผู้เรียนส่งคำตอบมา ให้ตรวจทีละข้อ ให้คะแนน อธิบายเฉลยและเหตุผล และสรุปจุดที่ควรทบทวน");
    if (mode === "compare") persona.push("โหมดเปรียบเทียบสินค้า: ทำตารางเทียบสเปกที่สำคัญของแต่ละรุ่น (จากข้อมูลสินค้าที่แนบ) → อธิบายจุดต่างที่มีผลต่อการใช้งานจริง → แนะนำว่างานแบบไหนควรเลือกรุ่นไหน และคำถามที่ควรถามลูกค้าก่อนเลือก ถ้าข้อมูลสเปกไม่พอ ให้ระบุว่าต้องดู datasheet เรื่องใด");
    const ctx = picked.length ? `ข้อมูลสินค้าที่แนบ (จากฐานข้อมูล Master ของบริษัท):\n${picked.map(prodLine).join("\n")}` : "";
    const hist = history.slice(-10).map((m) => `${m.role === "user" ? "ผู้เรียน" : "ครูฝึก"}: ${m.text}`).join("\n\n");
    return [persona.join("\n"), ctx, hist ? `บทสนทนาก่อนหน้า:\n${hist}` : "", `ผู้เรียนถาม/สั่ง: ${question}`].filter(Boolean).join("\n\n").slice(0, 13800);
  };

  const send = async (text?: string) => {
    const question = (text ?? q).trim();
    if (!question || busy) return;
    if (mode === "compare" && picked.length < 2 && !cur) { alert("โหมดเปรียบเทียบ: เลือกสินค้าอย่างน้อย 2 รายการก่อน"); return; }
    setQ("");
    const userMsg: Msg = { role: "user", text: question, at: new Date().toISOString() };
    let sess = cur;
    // สร้างเซสชันใหม่ถ้ายังไม่มี
    if (!sess && supabase) {
      const title = question.slice(0, 60);
      const { data } = await supabase.from("ai_tutor_sessions").insert({ emp_id: empId, title, track, mode, messages: [] }).select().single();
      sess = data as Session; setCur(sess);
    }
    const nextMsgs = [...(sess?.messages ?? []), userMsg];
    setCur((c) => (c ? { ...c, messages: nextMsgs } : c));
    setBusy(true);
    try {
      const j = await callCopilot({ action: "ask", payload: buildPrompt(question, sess?.messages ?? []) });
      const aiMsg: Msg = { role: "ai", text: String(j.text ?? "(ไม่มีคำตอบ)"), at: new Date().toISOString() };
      const finalMsgs = [...nextMsgs, aiMsg];
      setCur((c) => (c ? { ...c, messages: finalMsgs } : c));
      if (supabase && sess) { await supabase.from("ai_tutor_sessions").update({ messages: finalMsgs, updated_at: new Date().toISOString(), mode, track }).eq("id", sess.id); loadSessions(); }
    } catch (e) {
      const aiMsg: Msg = { role: "ai", text: "⚠ " + String(e) };
      setCur((c) => (c ? { ...c, messages: [...nextMsgs, aiMsg] } : c));
    } finally { setBusy(false); }
  };

  const newChat = () => { setCur(null); setPicked([]); setQ(""); taRef.current?.focus(); };
  const openSession = (s: Session) => { setCur(s); setMode((s.mode as Mode) || "qa"); if (s.track) setTrack(s.track); setShowList(false); };
  const delSession = async (s: Session) => { if (!supabase || !confirm("ลบบทสนทนานี้?")) return; await supabase.from("ai_tutor_sessions").delete().eq("id", s.id); if (cur?.id === s.id) setCur(null); loadSessions(); };

  const compareNow = () => {
    if (picked.length < 2) { alert("เลือกสินค้าอย่างน้อย 2 รายการ"); return; }
    send(`เปรียบเทียบ ${picked.map((p) => p.code).join(" กับ ")} ให้หน่อย ต่างกันตรงไหน และควรเลือกรุ่นไหนสำหรับงานแบบใด`);
  };

  return (
    <div className="grid gap-4 min-[1000px]:grid-cols-[260px_1fr] items-start">
      {/* ซ้าย: หมวด + ประวัติ */}
      <aside className="space-y-3 min-w-0">
        <div className="card-white p-3">
          <div className="flex items-center justify-between">
            <p className="text-[11.5px] font-bold text-sky tracking-wider uppercase px-1">หมวดวิชา</p>
            <button onClick={newChat} className="text-[11.5px] font-bold text-brand hover:text-navy">＋ เริ่มใหม่</button>
          </div>
          <div className="mt-2 flex min-[1000px]:flex-col gap-1.5 overflow-x-auto pb-1">
            {TRACKS.map((t) => (
              <button key={t.key} onClick={() => setTrack(t.key)}
                className={`shrink-0 text-left rounded-xl px-3 py-2 text-[13px] transition ${track === t.key ? "bg-brand text-white" : "hover:bg-ice text-ink"}`}>
                <span className="mr-1.5">{t.icon}</span>{t.label}
              </button>
            ))}
          </div>
        </div>
        <div className="card-white p-3 min-[1000px]:block" style={{ display: undefined }}>
          <button onClick={() => setShowList((v) => !v)} className="w-full flex items-center justify-between text-[11.5px] font-bold text-sky tracking-wider uppercase px-1">
            <span>ประวัติการเรียน ({sessions.length})</span><span className="min-[1000px]:hidden">{showList ? "▲" : "▼"}</span>
          </button>
          <div className={`mt-2 space-y-1 max-h-[340px] overflow-auto ${showList ? "" : "hidden min-[1000px]:block"}`}>
            {sessions.map((s) => (
              <div key={s.id} className={`group flex items-start gap-1 rounded-lg px-2 py-1.5 text-[12.5px] cursor-pointer ${cur?.id === s.id ? "bg-ice" : "hover:bg-ice/60"}`} onClick={() => openSession(s)}>
                <span className="shrink-0">{TRACKS.find((t) => t.key === s.track)?.icon ?? "💬"}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-ink">{s.title}</p>
                  <p className="text-[10.5px] text-muted/70">{new Date(s.updated_at).toLocaleDateString("th-TH")} · {MODES.find((m) => m.key === s.mode)?.label ?? s.mode}</p>
                </div>
                <button onClick={(e) => { e.stopPropagation(); delSession(s); }} className="opacity-0 group-hover:opacity-100 text-muted/60 hover:text-[#D94141] text-[12px]">✕</button>
              </div>
            ))}
            {sessions.length === 0 && <p className="text-[12px] text-muted/70 px-2">ยังไม่มีประวัติ — เริ่มถามได้เลย</p>}
          </div>
        </div>
      </aside>

      {/* ขวา: ห้องเรียน */}
      <section className="card-white p-4 min-[700px]:p-5 min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          {MODES.map((m) => (
            <button key={m.key} onClick={() => setMode(m.key)} title={m.hint}
              className={`text-[12.5px] font-bold rounded-full px-3 py-1.5 border transition ${mode === m.key ? "bg-navy text-white border-navy" : "border-ice text-muted hover:border-brand hover:text-brand"}`}>
              {m.icon} {m.label}
            </button>
          ))}
          <span className="ml-auto text-[11px] font-bold bg-brand/10 text-brand rounded px-1.5 py-0.5">AI จริง · อ่านฐานความรู้บริษัท + สินค้าใน Master</span>
        </div>
        <p className="mt-1.5 text-[12px] text-muted">{MODES.find((m) => m.key === mode)?.hint}</p>

        {/* แนบสินค้า */}
        <div className="mt-3 rounded-xl border border-dashed border-ice p-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[12px] font-bold text-navy shrink-0">📦 แนบสินค้าจาก Master{mode === "compare" ? " (2–4 รายการ)" : " (ไม่บังคับ)"}:</span>
            <div className="flex-1 min-w-[220px]">
              <Combo value={pickText} onChange={(v) => { setPickText(v); if (prodOptions.some((o) => o.value === v)) addProduct(v); }} options={prodOptions}
                placeholder="พิมพ์รหัส/ชื่อรุ่น/ซีรีส์ เช่น PS8, BLF, ISM..." className="w-full rounded-lg border border-ice px-3 py-1.5 text-[12.5px]" />
            </div>
            {mode === "compare" && <button onClick={compareNow} disabled={busy || picked.length < 2} className="btn btn-primary text-[12px] py-1.5 px-3 disabled:opacity-50">⚖️ เปรียบเทียบเลย</button>}
          </div>
          {picked.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {picked.map((p) => (
                <span key={p.id} className="inline-flex items-center gap-1 text-[11.5px] bg-ice text-navy rounded-full pl-2.5 pr-1 py-0.5">
                  <b>{p.code}</b> {p.name.slice(0, 28)}{p.specs ? "" : <span className="text-amber" title="ไม่มีสเปกในระบบ"> ⚠</span>}
                  <button onClick={() => setPicked(picked.filter((x) => x.id !== p.id))} className="w-4 h-4 rounded-full hover:bg-white text-muted">×</button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* บทสนทนา */}
        <div className="mt-4 min-h-[300px] max-h-[62vh] overflow-y-auto space-y-4 pr-1">
          {msgs.length === 0 && (
            <div className="rounded-2xl bg-ice/50 p-4">
              <p className="font-bold text-navy text-[15px]">{trackMeta.icon} {trackMeta.label}</p>
              <p className="text-[12.5px] text-muted mt-0.5">{trackMeta.desc} — ลองเริ่มจากคำถามเหล่านี้ หรือพิมพ์เอง</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {trackMeta.starters.map((s) => (
                  <button key={s} onClick={() => send(s)} disabled={busy} className="text-left text-[13px] rounded-xl bg-white border border-ice hover:border-brand hover:text-brand px-3 py-2.5 transition">{s}</button>
                ))}
                {mode === "lesson" && <button onClick={() => send(`สอนบทเรียนเรื่อง ${trackMeta.label} สำหรับพนักงานใหม่ ตั้งแต่พื้นฐาน`)} className="text-left text-[13px] rounded-xl bg-navy text-white px-3 py-2.5">📘 สร้างบทเรียน "{trackMeta.label}" ตั้งแต่พื้นฐาน</button>}
                {mode === "quiz" && <button onClick={() => send(`ออกข้อสอบเรื่อง ${trackMeta.label} 5 ข้อ ระดับพนักงานใหม่`)} className="text-left text-[13px] rounded-xl bg-navy text-white px-3 py-2.5">📝 ออกข้อสอบ "{trackMeta.label}" 5 ข้อ</button>}
              </div>
            </div>
          )}
          {msgs.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[92%] min-[700px]:max-w-[85%] rounded-2xl px-4 py-3 text-[14px] leading-relaxed ${m.role === "user" ? "bg-brand text-white" : "bg-[#F4F7FA] text-ink border border-ice"}`}>
                {m.role === "ai" ? (
                  <>
                    <p className="text-[10.5px] font-bold text-sky tracking-wider uppercase mb-1">🎓 ครูฝึก</p>
                    <div className="prose-article tutor-md" dangerouslySetInnerHTML={{ __html: renderMd(m.text) }} />
                  </>
                ) : <p className="whitespace-pre-wrap">{m.text}</p>}
              </div>
            </div>
          ))}
          {busy && <div className="flex justify-start"><div className="rounded-2xl bg-[#F4F7FA] border border-ice px-4 py-3 text-[13px] text-muted animate-pulse">🎓 ครูกำลังเรียบเรียงคำตอบ...</div></div>}
          <div ref={bottomRef} />
        </div>

        {/* ช่องพิมพ์ */}
        <div className="mt-3 flex gap-2 items-end">
          <textarea ref={taRef} value={q} onChange={(e) => setQ(e.target.value)} rows={2}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); send(); } }}
            placeholder={mode === "quiz" ? "พิมพ์หัวข้อที่อยากสอบ หรือส่งคำตอบข้อสอบ..." : mode === "lesson" ? "พิมพ์หัวข้อบทเรียนที่อยากเรียน..." : "ถามครูฝึก... (Enter ส่ง / Shift+Enter ขึ้นบรรทัดใหม่)"}
            className="flex-1 rounded-xl border border-ice px-3 py-2.5 text-[14px] resize-none" />
          <button onClick={() => send()} disabled={busy || !q.trim()} className="btn btn-primary py-2.5 px-4 disabled:opacity-50">ส่ง</button>
        </div>
        <p className="mt-1.5 text-[11px] text-muted/70">คำตอบสร้างโดย AI จากฐานความรู้บริษัทและหลักวิศวกรรมทั่วไป — งานไฟฟ้า/ความปลอดภัยให้ตรวจสอบกับคู่มือผู้ผลิตและวิศวกรผู้รับผิดชอบเสมอ</p>
      </section>
    </div>
  );
}

export default function LearnPage() {
  return (
    <StaffShell title="AI ครูฝึก (Academy)">
      <LearnBody />
    </StaffShell>
  );
}
