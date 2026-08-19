import type { Metadata } from "next";
import Link from "next/link";
import AgvImage from "@/components/AgvImage";
import { comparison, fmsFeatures, industry40, industrialSystems } from "@/lib/data";

export const metadata: Metadata = {
  title: "โซลูชันระบบอัตโนมัติอุตสาหกรรม (Industry 4.0)",
  description: "โซลูชัน 6 หมวด: Facility & Maintenance, Quality Assurance, Production, Intra-Logistic (AGV/AMR), Warehouse, Machine Safety — ปรึกษา ออกแบบ ติดตั้ง ดูแลครบวงจร",
};

const lidarFeatures = [
  { title: "Laser Scanning + Natural Navigation", desc: "LiDAR สแกนสภาพแวดล้อมสร้างแผนที่ดิจิทัล ระบุตำแหน่งตัวเองแม่นยำ (Localization) โดยไม่ต้องพึ่งเทปหรือ QR บนพื้น" },
  { title: "Virtual Path — เปลี่ยนเส้นทางในซอฟต์แวร์", desc: "กำหนดเส้นทาง ความเร็ว ทางแยก จุดจอด ผ่านซอฟต์แวร์ทั้งหมด ปรับผังการผลิตได้โดยไม่ต้องรื้อหน้างาน" },
  { title: "ติดตั้งเร็ว หน้างานสะอาด", desc: "ไม่ติดแถบแม่เหล็ก ไม่เจาะพื้น ลดเวลาติดตั้งและค่าใช้จ่ายหน้างาน พื้นที่โรงงานสวยงามเหมือนเดิม" },
];

export default function SolutionPage() {
  return (
    <>
      {/* หัวเรื่อง */}
      <section className="bg-navy text-white">
        <div className="container-site section-pad">
          <div className="border-l-4 border-white pl-4 max-w-[70ch]">
            <p className="text-[12.5px] font-bold text-[#BFD6E9] tracking-[0.18em] uppercase">Solutions</p>
            <h1 className="mt-1 text-[32px] min-[900px]:text-[46px] leading-[1.15] font-bold text-white">INDUSTRY 4.0 <span className="text-[#BFD6E9] text-[22px] min-[900px]:text-[28px] font-semibold">อุตสาหกรรม 4.0</span></h1>
            <p className="mt-3 text-[16px] text-[#D7E6F3] leading-relaxed">โซลูชันระบบอัตโนมัติ 6 หมวด ครอบคลุมทั้งโรงงาน — เราให้คำปรึกษา ออกแบบ ติดตั้ง ทดสอบ และดูแลระยะยาว โดยทีมวิศวกรไทย</p>
          </div>
          {/* แถบนำทาง 6 หมวด */}
          <div className="mt-8 flex flex-wrap gap-2">
            {industry40.map((g) => (
              <a key={g.id} href={`#${g.id}`} className="text-[12.5px] font-semibold rounded-full px-3.5 py-1.5 bg-white/10 hover:bg-white/20 transition border border-white/20">
                {g.icon} {g.en}
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Industrial Systems 6 การ์ดย่อ */}
      <section className="bg-[#F4F7FA]">
        <div className="container-site py-10">
          <div className="grid gap-3 grid-cols-2 min-[700px]:grid-cols-3 min-[1000px]:grid-cols-6">
            {industrialSystems.map((s) => (
              <a key={s.en} href={s.href.replace("/solution", "")} className="bg-white rounded-xl border border-ice p-3.5 text-center hover:border-brand transition">
                <span className="text-[24px]">{s.icon}</span>
                <p className="mt-1 text-[11px] font-bold text-navy leading-tight">{s.en}</p>
                <p className="text-[10.5px] text-muted leading-tight mt-0.5">{s.th}</p>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* 6 หมวดโซลูชัน */}
      {industry40.map((g, gi) => (
        <section key={g.id} id={g.id} className={`section-pad scroll-mt-20 ${gi % 2 ? "bg-[#F4F7FA]" : "bg-white"}`}>
          <div className="container-site">
            <div className="grid gap-8 min-[900px]:grid-cols-[1fr_1.4fr] items-start">
              <div>
                <span className="w-14 h-14 rounded-2xl flex items-center justify-center text-[28px]" style={{ backgroundColor: g.color + "22" }}>{g.icon}</span>
                <h2 className="mt-4 text-[24px] min-[900px]:text-[30px] font-bold text-navy leading-tight">{g.en}</h2>
                <p className="text-[16px] text-brand font-semibold">({g.th})</p>
                {g.highlight && <p className="mt-3 inline-block text-[12px] font-bold bg-amber/15 text-[#9A6A10] rounded-full px-3 py-1">⭐ จุดแข็งอันดับหนึ่งของเรา</p>}
              </div>
              <div className="grid gap-3 min-[600px]:grid-cols-2">
                {g.items.map((it) => (
                  <div key={it.en} className="rounded-2xl border border-ice bg-white p-5 hover:border-brand transition">
                    <div className="w-2 h-8 rounded-full mb-3" style={{ backgroundColor: g.color }} />
                    <h3 className="text-[14.5px] font-bold text-navy leading-snug">{it.en}</h3>
                    <p className="mt-1 text-[13px] text-muted">{it.th}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* รายละเอียดเพิ่มเติม AGV/LiDAR ในหมวด Intra-Logistic */}
            {g.id === "intralogistic" && (
              <div className="mt-10 rounded-[24px] bg-navy text-white p-7 min-[900px]:p-10">
                <p className="text-[12.5px] font-bold text-[#BFD6E9] tracking-[0.18em] uppercase">Featured Technology</p>
                <h3 className="mt-1 text-[24px] min-[900px]:text-[30px] font-bold text-white">LiDAR-Guided AGV — ลูกผสมที่ลงตัวระหว่าง AGV และ AMR</h3>
                <div className="mt-6 grid gap-8 min-[900px]:grid-cols-[1.3fr_1fr] items-start">
                  <div className="space-y-5">
                    {lidarFeatures.map((f) => (
                      <div key={f.title} className="flex gap-3">
                        <div className="w-2.5 h-2.5 mt-2 rounded-full bg-amber shrink-0" />
                        <div>
                          <p className="text-[16px] font-bold text-white">{f.title}</p>
                          <p className="mt-0.5 text-[14px] text-[#D7E6F3]">{f.desc}</p>
                        </div>
                      </div>
                    ))}
                    <div className="flex flex-wrap gap-3 pt-2">
                      <Link href="/vehicles" className="btn btn-amber text-[14px] py-2.5">ดูรถ AGV 5 รูปแบบ →</Link>
                      <Link href="/fleet-management" className="btn border border-white/50 text-white hover:bg-white/10 text-[14px] py-2.5">Fleet Management System</Link>
                    </div>
                  </div>
                  <AgvImage src="/images/agv-lifter-underride.png" alt="LiDAR-Guided AGV" ratio="1/1" className="bg-white rounded-2xl p-4" sizes="(max-width: 900px) 90vw, 35vw" />
                </div>
                <div className="mt-8 overflow-x-auto rounded-xl bg-white text-ink">
                  <table className="w-full min-w-[720px] text-[13.5px]">
                    <thead>
                      <tr>{comparison.headers.map((h, i) => (
                        <th key={h} className={`text-left px-4 py-3 font-bold ${i === 2 ? "bg-amber text-navy" : "bg-brand text-white"}`}>{h}</th>
                      ))}</tr>
                    </thead>
                    <tbody>
                      {comparison.rows.map((row, ri) => (
                        <tr key={ri} className={ri % 2 ? "bg-ice/40" : "bg-white"}>
                          {row.map((cell, ci) => (
                            <td key={ci} className={`px-4 py-2.5 ${ci === 0 ? "font-semibold text-navy" : ""} ${ci === 2 ? "bg-[#DCEBF7]/70 font-semibold text-navy" : "text-muted"}`}>{cell}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="mt-6 grid gap-3 min-[900px]:grid-cols-3">
                  {fmsFeatures.map((f) => (
                    <div key={f.title} className="rounded-xl bg-white/10 border border-white/15 p-4">
                      <p className="font-bold text-white text-[14.5px]">{f.title}</p>
                      <p className="mt-1 text-[13px] text-[#D7E6F3]">{f.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      ))}

      {/* CTA */}
      <section className="bg-brand text-white">
        <div className="container-site py-14 text-center">
          <h2 className="text-[26px] min-[900px]:text-[32px] font-bold text-white">ไม่แน่ใจว่าควรเริ่มจากหมวดไหน?</h2>
          <p className="mt-2 text-white/85">ให้ทีมวิศวกรสำรวจหน้างานและวิเคราะห์จุดคุ้มค่าที่สุดของโรงงานคุณ — ฟรี ไม่มีข้อผูกมัด</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link href="/about#contact" className="btn btn-amber">นัดสำรวจหน้างานฟรี</Link>
            <Link href="/downloads" className="btn border border-white/60 text-white hover:bg-white/10">ดาวน์โหลดเอกสาร</Link>
          </div>
        </div>
      </section>
    </>
  );
}
