import type { Metadata } from "next";
import Link from "next/link";
import { company, strategicFocus } from "@/lib/data";
import ContactForm from "@/components/ContactForm";

export const metadata: Metadata = {
  title: "เกี่ยวกับเรา / ติดต่อ",
  description: "รู้จัก CONSERTECH — Consult · Service · Technology ที่ปรึกษาและผู้ให้บริการระบบอัตโนมัติอุตสาหกรรม และช่องทางติดต่อนัดสำรวจหน้างานฟรี",
};

export default function AboutPage() {
  return (
    <>
      {/* ปกแบบโปรไฟล์ */}
      <section className="relative overflow-hidden bg-white">
        <div className="hidden min-[900px]:block absolute inset-y-0 right-0 w-[40%] bg-navy rounded-bl-[120px]" aria-hidden />
        <div className="container-site relative grid min-[900px]:grid-cols-[1.2fr_1fr] gap-10 items-center section-pad">
          <div>
            <p className="eyebrow">About Us</p>
            <h1 className="mt-2 text-[34px] min-[900px]:text-[50px] leading-[1.12] font-bold text-navy">{company.nameEn}</h1>
            <p className="mt-2 text-[20px] text-brand font-semibold">{company.nameTh}</p>
            <div className="mt-6 inline-block border-b-2 border-brand pb-1">
              <p className="text-[15px] font-bold text-navy tracking-wide">CONSULT • SERVICE • TECHNOLOGY</p>
              <p className="text-[14px] text-brand">{company.taglineTh}</p>
            </div>
            <p className="mt-6 text-[15.5px] text-muted leading-[1.75] max-w-[58ch]">
              CONSERTECH คือทีมที่ปรึกษาและวิศวกรระบบอัตโนมัติอุตสาหกรรมของคนไทย เราช่วยโรงงานวิเคราะห์ปัญหาจริงหน้างาน
              ออกแบบโซลูชันที่คุ้มค่า ติดตั้ง ทดสอบ และดูแลระยะยาว — ครอบคลุมตั้งแต่คลังสินค้า สายการผลิต โลจิสติกส์ภายใน (AGV/AMR)
              การตรวจสอบคุณภาพด้วย AI ไปจนถึงความปลอดภัยของเครื่องจักร
            </p>
          </div>
          <div className="rounded-[28px] overflow-hidden shadow-2xl border-4 border-white bg-white">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/hero-warehouse.png" alt="CONSERTECH" className="w-full aspect-[4/3] object-cover" />
          </div>
        </div>
      </section>

      {/* วิสัยทัศน์ */}
      <section className="bg-[#F4F7FA]">
        <div className="container-site py-12">
          <div className="rounded-2xl bg-brand text-white p-8 min-[900px]:p-10 grid gap-6 min-[900px]:grid-cols-[auto_1fr] items-center">
            <p className="text-amber font-bold text-[13px] tracking-[0.18em] uppercase">Vision<br /><span className="text-white/80 normal-case tracking-normal font-semibold">วิสัยทัศน์</span></p>
            <p className="text-[19px] min-[900px]:text-[22px] leading-relaxed font-semibold">“{company.vision}”</p>
          </div>
        </div>
      </section>

      {/* Strategic Focus */}
      <section className="section-pad">
        <div className="container-site">
          <p className="eyebrow">Strategic Focus</p>
          <h2 className="mt-2 text-[28px] min-[900px]:text-[34px] font-bold text-navy">จุดมุ่งเน้นเชิงกลยุทธ์</h2>
          <div className="mt-8 grid gap-5 min-[900px]:grid-cols-3">
            {strategicFocus.map((p) => (
              <div key={p.key} className={`rounded-2xl p-6 border ${p.highlight ? "bg-brand text-white border-brand" : "bg-white border-ice"}`}>
                <span className={`w-11 h-11 rounded-full flex items-center justify-center text-[22px] ${p.highlight ? "bg-white/15" : "bg-ice"}`}>{p.icon}</span>
                <h3 className={`mt-3 text-[18px] font-bold ${p.highlight ? "text-white" : "text-navy"}`}>{p.en}</h3>
                <p className={`text-[14px] ${p.highlight ? "text-white/80" : "text-muted"}`}>{p.th}</p>
                <ul className="mt-3 space-y-1.5">
                  {p.items.map((it) => (
                    <li key={it.en} className={`text-[13.5px] flex gap-2 ${p.highlight ? "text-white/95" : "text-ink"}`}>
                      <span className={`mt-[8px] w-1.5 h-1.5 rounded-full shrink-0 ${p.highlight ? "bg-white" : "bg-brand"}`} />
                      <span>{it.en} <span className={p.highlight ? "text-white/70" : "text-muted"}>({it.th})</span></span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="mt-6">
            <Link href="/downloads" className="btn btn-outline">📥 ดาวน์โหลด Company Profile</Link>
          </div>
        </div>
      </section>

      {/* ติดต่อ */}
      <section id="contact" className="section-pad bg-[#F4F7FA] scroll-mt-20">
        <div className="container-site grid gap-10 min-[900px]:grid-cols-2 items-start">
          <div>
            <p className="eyebrow">Let’s Connect with Us!</p>
            <h2 className="mt-2 text-[26px] min-[900px]:text-[32px] font-bold text-navy">นัดสำรวจหน้างานฟรี</h2>
            <p className="mt-2 text-muted">กรอกข้อมูลแล้วทีมวิศวกรจะติดต่อกลับภายใน 1 วันทำการ — ไม่มีค่าใช้จ่าย ไม่มีข้อผูกมัด</p>
            <div className="mt-6 bg-white rounded-2xl border border-ice p-5 space-y-2.5 text-[14.5px]">
              <p><strong className="text-navy">{company.nameEn}</strong> <span className="text-muted">({company.nameTh})</span></p>
              <p className="flex gap-2.5 text-ink"><span className="text-brand">🏠</span>{company.address}</p>
              <p className="flex gap-2.5 text-ink"><span className="text-brand">📞</span>{company.phone}</p>
              <p className="flex gap-2.5 text-ink"><span className="text-brand">✉️</span><a href={`mailto:${company.email}`} className="hover:text-brand">{company.email}</a></p>
              <p className="flex gap-2.5 text-ink"><span className="text-brand">🌐</span>{company.website}</p>
            </div>
            <div className="mt-5 rounded-2xl overflow-hidden border border-ice">
              <iframe src={company.mapsEmbed} width="100%" height="260" style={{ border: 0 }} allowFullScreen loading="lazy"
                referrerPolicy="strict-origin-when-cross-origin" title="แผนที่ CONSERTECH CO., LTD." />
            </div>
            <a href={company.mapsUrl} target="_blank" rel="noopener noreferrer" className="inline-block mt-3 text-[14px] font-semibold text-brand hover:text-navy">
              เปิดเส้นทางใน Google Maps →
            </a>
          </div>
          <ContactForm />
        </div>
      </section>
    </>
  );
}
