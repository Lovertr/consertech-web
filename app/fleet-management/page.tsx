import type { Metadata } from "next";
import Link from "next/link";
import { fmsFeatures } from "@/lib/data";
import { FmsArchitecture, TrafficControlDiagram, WifiLayoutDiagram } from "@/components/FmsDiagrams";

export const metadata: Metadata = {
  title: "Fleet Management System (FMS) — ควบคุม AGV หลายคันให้ทำงานเป็นทีม",
  description:
    "FMS คือหอบังคับการของรถ AGV/AMR — Traffic Control, Task Allocation, Status Monitoring พร้อมออกแบบโครงข่าย Wi-Fi/LAN และเชื่อมต่อ WMS/ERP/PLC ครบทั้ง Ecosystem โดย CONSERTECH",
  keywords: ["Fleet Management System", "FMS", "AGV", "AMR", "Traffic Control", "Wi-Fi อุตสาหกรรม", "WMS", "V2V", "CONSERTECH"],
};

const FEATURE_ICON: Record<string, string> = { "Traffic Control": "🚦", "Task Allocation": "📋", "Status Monitoring": "📡" };

const layers = [
  {
    n: 1, title: "รถและเครื่องจักร", en: "Vehicles & Machines",
    items: ["เซนเซอร์ตรวจจับ — Photo / Proximity / LiDAR / 3D Camera", "ตัวควบคุมและประมวลผลของเครื่องจักร (PLC / Controller)", "ชุดขับเคลื่อน — มอเตอร์ กระบอกสูบ", "โมดูลสื่อสาร เครื่องจักร-เครื่องจักร และ เครื่องจักร-FMS"],
  },
  {
    n: 2, title: "โครงข่ายสื่อสาร", en: "Network",
    items: ["Wireless Access Points กระจายสัญญาณครอบคลุมพื้นที่", "Local Network (LAN) และ Switch L2/L3 เชื่อมทุกอุปกรณ์", "Wired LAN สำหรับเครื่องจักรอยู่กับที่ / PLC", "Wi-Fi สำหรับ AGV / AMR ที่เคลื่อนที่ตลอดเวลา"],
  },
  {
    n: 3, title: "ส่วนควบคุมกลาง (FMS)", en: "Central Control",
    items: ["Fleet Management Server — บริหารจราจรและสถานะรถ", "WMS / ERP Integration — รับคำสั่งงานและแผนผลิต", "User Dashboard — ดูสถานะทุกคันแบบ Real-time", "Log & Report — ย้อนดูประวัติงานและ KPI"],
  },
];

const fmsVsWms: [string, string, string][] = [
  ["สิ่งที่จัดการ", "สินค้า สต็อก คำสั่งซื้อ", "หุ่นยนต์ การจราจร แบตเตอรี่"],
  ["เป้าหมายหลัก", "ความถูกต้องของจำนวนสินค้า", "ความราบรื่นของการเดินรถ"],
  ["มุมมองข้อมูล", "เชิงธุรกิจและบัญชี (Inventory)", "เชิงเทคนิคและพิกัด (Physical / Logic)"],
  ["ผู้ใช้งาน", "ผู้จัดการคลัง พนักงานเช็คสต็อก", "วิศวกรควบคุมระบบ ช่างบำรุงรักษา"],
];

const networkQualities = [
  { t: "ความหน่วงต่ำ (Low Latency)", d: "ข้อมูลที่มาช้ามีค่าเท่ากับข้อมูลผิด — คำสั่งหยุด/หลบต้องถึงรถภายในหลักสิบมิลลิวินาที" },
  { t: "ทนทาน & น่าเชื่อถือ (Redundancy)", d: "ระบบต้องทำงาน 24/7 — ออกแบบเส้นทางสำรองและอุปกรณ์สำรองในจุดสำคัญ" },
  { t: "ครอบคลุม & Seamless Roaming", d: "จุดสำคัญที่สุดของ AGV/AMR — สลับ AP ได้โดยไม่หลุดการเชื่อมต่อ (802.11r/k/v)" },
  { t: "ความปลอดภัย (Cybersecurity)", d: "แยก VLAN วงหุ่นยนต์ออกจากออฟฟิศ เข้ารหัส WPA3 / WPA2-Enterprise และมี Firewall" },
  { t: "ขยายระบบได้ (Scalability)", d: "เพิ่มรถ เพิ่มเครื่องจักร เพิ่ม AP ได้โดยไม่ต้องรื้อระบบเดิม" },
];

const wifiRules = [
  ["ระยะห่าง AP", "25–30 ม. ในคลังทั่วไป (ถี่ขึ้นเมื่อมีชั้นวางสูง/โลหะบัง)"],
  ["ผังการวาง", "สลับฟันปลา ไม่วางเป็นแถวตรง เพื่อให้สัญญาณซ้อนทับพอดี"],
  ["มาตรฐาน", "Wi-Fi 6 (802.11ax) รองรับอุปกรณ์หนาแน่น + Wireless Controller ส่วนกลาง"],
  ["Fast Roaming", "เปิด 802.11r / k / v ให้รถสลับ AP ได้ภายใน < 100 ms"],
  ["ช่องสัญญาณ", "Non-overlapping — 2.4 GHz ใช้ 1 / 6 / 11 และให้ AMR วิ่งบน 5 GHz เป็นหลัก"],
];

const ecosystem = [
  { title: "Wi-Fi อุตสาหกรรม", desc: "ออกแบบตำแหน่ง Access Point ให้ครอบคลุมทั่วพื้นที่ตามมาตรฐาน IEEE 802.11 — รถไม่หลุดการเชื่อมต่อ" },
  { title: "เชื่อมต่อ PLC / WMS / MES", desc: "สื่อสารกับเครื่องจักรและระบบบริหารคลัง/การผลิตที่มีอยู่ เชื่อมข้อมูลเป็นระบบเดียว" },
  { title: "สื่อสารระหว่างรถ (V2V)", desc: "แชร์พิกัด ความเร็ว ทิศทาง เพื่อป้องกันการชนที่ทางแยกและวิ่งเป็นขบวนอย่างปลอดภัย" },
  { title: "โครงสร้างเครือข่าย", desc: "เลือก Switch และโครงสร้างเครือข่ายที่เหมาะสม (L2/L3, Gigabit) ตามขนาดระบบ" },
];

export default function FmsPage() {
  const jsonLd = {
    "@context": "https://schema.org", "@type": "Service", name: "Fleet Management System (FMS) สำหรับ AGV / AMR",
    provider: { "@type": "Organization", name: "CONSERTECH CO., LTD." }, areaServed: "TH",
    description: metadata.description,
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* Hero + ไดอะแกรมสถาปัตยกรรม */}
      <section className="section-pad">
        <div className="container-site grid gap-10 min-[1000px]:grid-cols-[1fr_1.15fr] items-center">
          <div>
            <p className="eyebrow">Fleet Management &amp; Ecosystem</p>
            <h1 className="mt-2 text-[32px] min-[900px]:text-[46px] leading-[1.18] font-bold">Fleet Management System (FMS)</h1>
            <p className="mt-3 text-[17px] text-muted max-w-[52ch]">
              “หอบังคับการ” ที่ทำให้รถทุกคันทำงานเป็นทีมเดียวกัน — รถ AGV 10 คันวิ่งพร้อมกันโดยไม่ชนกัน
              เพราะทุกคันคุยผ่านตัวกลางที่มองเห็นภาพรวมทั้งระบบ ไม่ได้ตัดสินใจกันเองอย่างอิสระ 100%
            </p>
            <div className="mt-6 grid grid-cols-3 gap-3">
              {fmsFeatures.map((f) => (
                <div key={f.title} className="rounded-2xl bg-ice/60 border border-ice p-3.5">
                  <div className="text-[22px]">{FEATURE_ICON[f.title] ?? "•"}</div>
                  <p className="mt-1 font-bold text-brand text-[14px] leading-tight">{f.title}</p>
                </div>
              ))}
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/about#contact" className="btn btn-primary">ปรึกษาการวางระบบ FMS</Link>
              <Link href="/vehicles" className="btn btn-outline">ดูรถ AGV 5 รูปแบบ</Link>
            </div>
          </div>
          <figure className="card-white p-4 min-[700px]:p-6">
            <FmsArchitecture />
            <figcaption className="mt-2 text-center text-[12.5px] text-muted/80">สถาปัตยกรรม 3 ส่วน: รถ/เครื่องจักร → โครงข่ายสื่อสาร → ส่วนควบคุมกลาง (FMS) เชื่อม WMS/ERP และ Dashboard</figcaption>
          </figure>
        </div>
      </section>

      {/* 3 หน้าที่หลัก + ไดอะแกรมทางแยก */}
      <section className="section-pad bg-[#F4F7FA]">
        <div className="container-site">
          <p className="eyebrow">What FMS does</p>
          <h2 className="mt-2 text-[26px] min-[900px]:text-[32px] font-bold text-navy">FMS ทำอะไรให้รถทุกคัน</h2>
          <div className="mt-8 grid gap-8 min-[1000px]:grid-cols-[1fr_1fr] items-start">
            <div className="space-y-4">
              {fmsFeatures.map((f, i) => (
                <div key={f.title} className="card-white p-5 flex gap-4">
                  <div className="shrink-0 w-11 h-11 rounded-xl bg-brand text-white grid place-items-center text-[20px]">{FEATURE_ICON[f.title] ?? i + 1}</div>
                  <div>
                    <h3 className="font-bold text-brand text-[18px]">{f.title}</h3>
                    <p className="mt-1 text-[14.5px] text-muted">{f.desc}</p>
                  </div>
                </div>
              ))}
              <div className="rounded-2xl border border-dashed border-sky/60 p-4 text-[13.5px] text-muted">
                <span className="font-bold text-navy">V2V vs FMS:</span> V2V คือรถ 2 คัน “คุยกันเอง” ผ่านสัญญาณไร้สาย (แชร์พิกัด ความเร็ว ทิศทาง เบรก) เหมาะกับป้องกันการชนระยะใกล้
                ส่วน FMS คือหอบังคับการที่มองเห็นทุกคัน — สิ่งสำคัญของทั้งสองแบบคือ <span className="font-semibold text-navy">การกำหนดรูปแบบการสื่อสาร (Protocol / รหัสคำสั่ง)</span> ให้ชัดเจนตั้งแต่ออกแบบ
              </div>
            </div>
            <figure className="card-white p-4 min-[700px]:p-6">
              <TrafficControlDiagram />
              <figcaption className="mt-2 text-center text-[12.5px] text-muted/80">Traffic Control: รถต้อง “ขอเข้าทางร่วม” (รหัส 15) และ “แจ้งออก” (รหัส 16) กับ FMS ก่อนผ่านทางแยกเสมอ</figcaption>
            </figure>
          </div>
        </div>
      </section>

      {/* โครงสร้าง 3 ส่วน */}
      <section className="section-pad">
        <div className="container-site">
          <p className="eyebrow">System Architecture</p>
          <h2 className="mt-2 text-[26px] min-[900px]:text-[32px] font-bold text-navy">โครงสร้างการทำงาน 3 ส่วนที่เราออกแบบให้ครบ</h2>
          <div className="mt-8 grid gap-5 min-[900px]:grid-cols-3">
            {layers.map((l) => (
              <div key={l.n} className="card p-6 relative overflow-hidden">
                <span className="absolute -right-3 -top-4 text-[92px] font-black text-brand/8 leading-none select-none">{l.n}</span>
                <p className="text-[11.5px] font-bold text-sky tracking-wider uppercase">ส่วนที่ {l.n} · {l.en}</p>
                <h3 className="mt-1 text-[19px] font-bold text-navy">{l.title}</h3>
                <ul className="mt-3 space-y-2">
                  {l.items.map((it) => (
                    <li key={it} className="flex gap-2 text-[14px] text-muted"><span className="text-amber font-bold">✓</span>{it}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* FMS vs WMS */}
          <div className="mt-12 grid gap-8 min-[900px]:grid-cols-[1fr_1.3fr] items-start">
            <div>
              <h3 className="text-[22px] font-bold text-navy">FMS ต่างจาก WMS อย่างไร?</h3>
              <p className="mt-2 text-[15px] text-muted">
                <span className="font-semibold text-navy">WMS</span> จัดการ “ข้อมูลสินค้า” — สต็อกอยู่ที่ไหน จำนวนเท่าไร ใครสั่ง
                ส่วน <span className="font-semibold text-navy">FMS</span> จัดการ “การเคลื่อนที่” — รถคันไหนไปรับ วิ่งเส้นทางไหน ชาร์จเมื่อไร
                ทั้งสองต้องเชื่อมกัน: WMS ออกคำสั่ง → FMS จ่ายงานให้รถ → รายงานผลกลับ WMS
              </p>
            </div>
            <div className="rounded-2xl border border-ice overflow-hidden text-[14px]">
              <div className="grid grid-cols-[1fr_1.2fr_1.2fr] bg-navy text-white font-bold">
                <div className="px-4 py-2.5">หัวข้อ</div><div className="px-4 py-2.5">WMS (Warehouse)</div><div className="px-4 py-2.5 text-amber">FMS (Fleet)</div>
              </div>
              {fmsVsWms.map(([k, w, f], i) => (
                <div key={k} className={`grid grid-cols-[1fr_1.2fr_1.2fr] ${i % 2 ? "bg-white" : "bg-ice/50"}`}>
                  <div className="px-4 py-2.5 font-semibold text-navy">{k}</div><div className="px-4 py-2.5 text-muted">{w}</div><div className="px-4 py-2.5 text-ink font-medium">{f}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Ecosystem (เข้ม) */}
      <section className="section-pad bg-navy text-white">
        <div className="container-site">
          <h2 className="text-[26px] min-[900px]:text-[32px] font-bold text-white">
            เราออกแบบระบบสื่อสารให้ครบทั้ง <span className="text-amber">Ecosystem</span>
          </h2>
          <p className="mt-2 text-[15px] text-[#D7E6F3] max-w-[60ch]">FMS ที่ดีต้องยืนอยู่บนโครงข่ายที่ดี — เราจึงออกแบบทั้ง Wi-Fi, LAN, การเชื่อมต่อเครื่องจักร และซอฟต์แวร์ควบคุมไปพร้อมกันตั้งแต่วันแรก</p>
          <div className="mt-8 grid gap-5 min-[700px]:grid-cols-2">
            {ecosystem.map((e) => (
              <div key={e.title} className="rounded-[14px] bg-white/5 border border-white/10 p-6">
                <h3 className="font-bold text-amber text-[17px]">{e.title}</h3>
                <p className="mt-1.5 text-[14.5px] text-[#D7E6F3]">{e.desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-10 grid gap-8 min-[1000px]:grid-cols-[1.1fr_1fr] items-start">
            <figure className="rounded-2xl bg-white p-4 min-[700px]:p-5">
              <WifiLayoutDiagram />
              <figcaption className="mt-2 text-center text-[12.5px] text-muted/80">ผังการวาง Access Point แบบสลับฟันปลา ระยะ 25–30 ม. ช่องสัญญาณไม่ทับซ้อน (1 / 6 / 11) ครอบคลุมเส้นทาง AGV ทุกจุด</figcaption>
            </figure>
            <div>
              <h3 className="text-[20px] font-bold text-white">หลักออกแบบ Wi-Fi ให้ AGV ไม่หลุด</h3>
              <div className="mt-3 rounded-2xl overflow-hidden border border-white/10 text-[13.5px]">
                {wifiRules.map(([k, v], i) => (
                  <div key={k} className={`grid grid-cols-[38%_62%] ${i % 2 ? "bg-white/0" : "bg-white/5"}`}>
                    <div className="px-4 py-2.5 font-bold text-amber">{k}</div>
                    <div className="px-4 py-2.5 text-[#D7E6F3]">{v}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <h3 className="mt-12 text-[20px] font-bold text-white">โครงข่ายที่ดีสำหรับหุ่นยนต์ต้องมี 5 อย่าง</h3>
          <div className="mt-4 grid gap-4 min-[700px]:grid-cols-2 min-[1000px]:grid-cols-5">
            {networkQualities.map((q, i) => (
              <div key={q.t} className="rounded-2xl bg-white/5 border border-white/10 p-4">
                <div className="w-8 h-8 rounded-full bg-amber text-navy font-black grid place-items-center text-[14px]">{i + 1}</div>
                <p className="mt-2 font-bold text-white text-[14px] leading-snug">{q.t}</p>
                <p className="mt-1 text-[12.5px] text-[#D7E6F3] leading-relaxed">{q.d}</p>
              </div>
            ))}
          </div>

          <div className="mt-10 flex flex-wrap items-center gap-4">
            <Link href="/about#contact" className="btn btn-amber">ปรึกษาการวางระบบ FMS</Link>
            <Link href="/blog/fleet-management-system" className="text-[14px] font-semibold text-[#D7E6F3] hover:text-white underline underline-offset-4">อ่านบทความ: Fleet Management System →</Link>
          </div>
        </div>
      </section>
    </>
  );
}
