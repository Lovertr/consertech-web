"use client";

// โมดูลสื่อสารลูกค้า — ดัดแปลงจาก client-portal ของ tomas-tech-pm
// ลูกค้าแต่ละโปรเจกต์ได้ลิงก์ส่วนตัว: ดูสถานะงาน คุยกับทีม ส่งคำขอ อัปโหลดไฟล์

import { useState } from "react";
import StaffShell, { useDept } from "@/components/staff/StaffShell";
import { callCopilot } from "@/lib/copilot";
import { clientLinks, clientThread, clientRequests } from "@/lib/staffData";

function ClientsBody() {
  const [selected, setSelected] = useState(0);
  const { access } = useDept();
  const readOnly = access("clients") === "read";
  const [draft, setDraft] = useState("");
  const [drafting, setDrafting] = useState(false);
  const aiDraft = async () => {
    setDrafting(true);
    try {
      const lastMsgs = clientThread.slice(-4).map((t) => `${t.from}: ${t.text}`).join("\n");
      const j = await callCopilot({ action: "draft_email", payload: `บริบท: ทีม CONSERTECH ตอบลูกค้าใน Client Portal ของโปรเจกต์ติดตั้ง AGV\nบทสนทนาล่าสุด:\n${lastMsgs}\n\nร่างคำตอบสั้นๆ สุภาพ เป็นภาษาไทย ตอบประเด็นล่าสุดของลูกค้า` });
      setDraft(String(j.text ?? "").replace(/\n+/g, " ").trim());
    } catch (e) { setDraft("⚠ " + String(e)); }
    setDrafting(false);
  };

  return (
    <>
      {readOnly && (
        <p className="mb-3 text-[12.5px] bg-ice text-sky font-semibold rounded-lg px-3 py-2 inline-block">
          👁️ ดูอย่างเดียว — ตอบลูกค้าได้เฉพาะฝ่ายขาย / PM
        </p>
      )}

      <div className="grid gap-5 min-[1040px]:grid-cols-[340px_1fr] items-start">
        {/* รายชื่อลิงก์ลูกค้า */}
        <div className="space-y-3">
          <div className="card-white p-4">
            <div className="flex items-center justify-between">
              <p className="font-bold text-navy text-[14px]">ลิงก์ลูกค้า (Client Portal)</p>
              {!readOnly && <button className="text-[12px] font-bold text-brand">＋ สร้างลิงก์</button>}
            </div>
            <div className="mt-3 space-y-2">
              {clientLinks.map((c, i) => (
                <button key={c.project} onClick={() => setSelected(i)}
                  className={`w-full text-left rounded-xl border p-3 transition text-[12.5px] ${selected === i ? "border-brand bg-ice/40" : "border-ice hover:border-brand"}`}>
                  <div className="flex justify-between items-start gap-2">
                    <p className="font-bold text-navy leading-snug">{c.customer}</p>
                    {c.unread > 0 && <span className="bg-amber text-navy text-[10.5px] font-bold rounded-full px-1.5">{c.unread}</span>}
                  </div>
                  <p className="text-muted mt-0.5">{c.project}</p>
                  <p className="text-[11px] text-muted/70 mt-1">{c.contact} · เข้าดูล่าสุด {c.lastSeen}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="card-white p-4">
            <p className="font-bold text-navy text-[14px]">คำขอจากลูกค้า</p>
            <div className="mt-2.5 space-y-2">
              {clientRequests.map((r, i) => (
                <div key={i} className="rounded-lg border border-ice p-2.5 text-[12px]">
                  <p><span className="font-bold text-brand">{r.type}</span> — {r.from} <span className="text-muted/60">· {r.time}</span></p>
                  <p className="text-muted mt-0.5">{r.detail}</p>
                  <p className={`mt-1 font-semibold ${r.status === "รอตอบ" ? "text-amber" : "text-sky"}`}>{r.status}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* บทสนทนา */}
        <div className="card-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ice pb-3">
            <div>
              <p className="font-bold text-navy">{clientLinks[selected].customer} — {clientLinks[selected].contact}</p>
              <p className="text-[12px] text-muted">{clientLinks[selected].project}</p>
            </div>
            <div className="flex gap-2 text-[12px]">
              <span className="bg-ice text-brand font-bold rounded px-2 py-1">ลูกค้าเห็น: สถานะงาน · Milestone · ไฟล์</span>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {clientThread.map((m, i) => (
              <div key={i} className={`max-w-[85%] ${m.from === "staff" ? "ml-auto" : ""}`}>
                <p className={`text-[11px] mb-1 ${m.from === "staff" ? "text-right text-sky" : "text-muted"}`}>{m.name} · {m.time}</p>
                <div className={`rounded-2xl px-4 py-2.5 text-[13.5px] leading-relaxed ${
                  m.from === "staff" ? "bg-brand text-white rounded-tr-sm" : "bg-ice text-ink rounded-tl-sm"
                }`}>
                  {m.text}
                </div>
              </div>
            ))}
          </div>

          {!readOnly && (
            <div className="mt-4 border-t border-ice pt-3">
              <div className="flex gap-2">
                <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="พิมพ์ข้อความถึงลูกค้า..." className="flex-1 min-w-0 rounded-xl border border-ice px-4 py-2.5 text-[13.5px]" />
                <button className="btn btn-primary text-[13px] py-2 px-4 shrink-0">ส่ง</button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                <button onClick={aiDraft} disabled={drafting}
                  className="text-[11.5px] font-semibold bg-amber/15 text-amber rounded-lg px-2.5 py-1 disabled:opacity-60">
                  {drafting ? "⏳ AI กำลังร่าง..." : "✨ ให้ AI ร่างคำตอบ"}
                </button>
                <button className="text-[11.5px] font-semibold bg-ice text-sky rounded-lg px-2.5 py-1">แนบไฟล์</button>
                <button className="text-[11.5px] font-semibold bg-ice text-sky rounded-lg px-2.5 py-1">แนบสถานะ Milestone ล่าสุด</button>
                <button className="text-[11.5px] font-semibold bg-ice text-sky rounded-lg px-2.5 py-1">แจ้งเตือนผ่าน Line/อีเมล</button>
              </div>
            </div>
          )}

          <p className="mt-4 text-[11.5px] text-muted/70 italic">
            ระบบจริง: ลูกค้าเข้าผ่านลิงก์เฉพาะโปรเจกต์ (ไม่ต้องสมัครสมาชิก) เห็นความคืบหน้า/เอกสารที่เราเลือกเปิดเผย
            ทุกข้อความแจ้งเตือนทีมผ่าน Line — ลดการตามงานทางโทรศัพท์และรวมประวัติการคุยไว้ที่เดียว
          </p>
        </div>
      </div>
    </>
  );
}

export default function ClientsPage() {
  return (
    <StaffShell title="สื่อสารลูกค้า">
      <ClientsBody />
    </StaffShell>
  );
}
