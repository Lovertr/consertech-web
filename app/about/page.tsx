import type { Metadata } from "next";
import { company } from "@/lib/data";
import ContactForm from "@/components/ContactForm";

export const metadata: Metadata = {
  title: "เกี่ยวกับเรา / ติดต่อ",
  description: "รู้จัก CONSERTECH — Consult · Service · Technology และช่องทางติดต่อนัดสำรวจหน้างานฟรี",
};

const pillars = [
  { title: "CONSULT", desc: "ที่ปรึกษาด้านวิศวกรรมและระบบอัตโนมัติ วิเคราะห์หน้างานจริงก่อนเสนอโซลูชัน" },
  { title: "SERVICE", desc: "บริการวิศวกรรมครบวงจร ออกแบบ ติดตั้ง ทดสอบ รับประกัน และดูแลหลังการขาย" },
  { title: "TECHNOLOGY", desc: "ประยุกต์ใช้เทคโนโลยีล้ำสมัย LiDAR, Fleet Management, IIoT เพื่อประสิทธิภาพสูงสุด" },
];

export default function AboutPage() {
  return (
    <>
      <section className="section-pad">
        <div className="container-site">
          <p className="eyebrow">About Us</p>
          <h1 className="mt-2 text-[32px] min-[900px]:text-[46px] leading-[1.18] font-bold">รู้จัก CONSERTECH</h1>
          <p className="mt-3 text-muted">ชื่อของเราคือคำมั่นสัญญา</p>

          <div className="mt-9 grid gap-5 min-[900px]:grid-cols-3">
            {pillars.map((p) => (
              <div key={p.title} className="card p-7">
                <h2 className="text-[20px] font-bold text-brand tracking-wide">{p.title}</h2>
                <p className="mt-2 text-[14.5px] text-muted">{p.desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 rounded-[14px] bg-navy text-white p-8">
            <p className="text-amber font-bold text-sm">วิสัยทัศน์</p>
            <p className="mt-2 text-[18px] italic leading-relaxed max-w-[60ch]">“{company.vision}”</p>
          </div>
        </div>
      </section>

      <section id="contact" className="section-pad bg-ice/50 scroll-mt-20">
        <div className="container-site grid gap-10 min-[900px]:grid-cols-2 items-start">
          <div>
            <h2 className="text-[26px] min-[900px]:text-[32px] font-bold">นัดสำรวจหน้างานฟรี</h2>
            <p className="mt-2 text-muted">กรอกข้อมูลแล้วทีมวิศวกรจะติดต่อกลับภายใน 1 วันทำการ — ไม่มีค่าใช้จ่าย ไม่มีข้อผูกมัด</p>
            <div className="mt-6 space-y-2.5 text-[15px]">
              <p><strong className="text-navy">{company.nameTh}</strong> ({company.nameEn})</p>
              <p className="text-muted">{company.address}</p>
              <p className="text-muted">โทร {company.phone}</p>
              <p className="text-muted">{company.email}</p>
            </div>
            <div className="mt-6 rounded-[14px] border border-ice bg-white h-[220px] flex items-center justify-center text-muted text-sm">
              แผนที่ Google Maps (ใส่ embed เมื่อยืนยันพิกัด)
            </div>
          </div>
          <ContactForm />
        </div>
      </section>
    </>
  );
}
