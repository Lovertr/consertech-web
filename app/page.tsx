import Link from "next/link";
import Hero from "@/components/Hero";
import Placeholder from "@/components/Placeholder";
import { painPoints, solutions, vehicles, whyUs, processSteps } from "@/lib/data";

export default function HomePage() {
  return (
    <>
      <Hero />

      {/* Pain points */}
      <section className="section-pad">
        <div className="container-site">
          <p className="eyebrow">The Challenge</p>
          <h2 className="mt-2 text-[26px] min-[900px]:text-[32px] font-bold">โรงงานวันนี้กำลังเจอกับอะไร?</h2>
          <div className="mt-8 grid gap-5 min-[700px]:grid-cols-2">
            {painPoints.map((p) => (
              <div key={p.title} className="card p-6">
                <h3 className="text-[18px] font-bold text-navy">{p.title}</h3>
                <p className="mt-1.5 text-muted text-[15px]">{p.desc}</p>
              </div>
            ))}
          </div>
          <div className="mt-8 rounded-2xl bg-navy text-white px-6 py-5 text-[15px] min-[700px]:text-base">
            ตลาดหุ่นยนต์ AGV/AMR ทั่วโลกกำลังโตสู่{" "}
            <strong className="text-amber text-xl">$22,000 ล้าน</strong> ภายในปี 2030 — โรงงานทั่วโลกกำลังเปลี่ยน
            แล้วคุณล่ะ?
          </div>
        </div>
      </section>

      {/* Solutions 6 ด้าน */}
      <section className="section-pad bg-ice/50">
        <div className="container-site">
          <p className="eyebrow">Solution Guideline</p>
          <h2 className="mt-2 text-[26px] min-[900px]:text-[32px] font-bold">โซลูชันครบวงจร 6 ด้าน</h2>
          <div className="mt-8 grid gap-5 min-[700px]:grid-cols-2 min-[1040px]:grid-cols-3">
            {solutions.map((s) => (
              <div key={s.title} className={`p-6 rounded-[14px] border transition ${s.highlight ? "bg-navy text-white border-navy" : "card-white"}`}>
                <h3 className={`text-[17px] font-bold ${s.highlight ? "text-white" : "text-brand"}`}>{s.title}</h3>
                <p className={`mt-1.5 text-[14px] ${s.highlight ? "text-[#D9E6F2]" : "text-muted"}`}>{s.desc}</p>
                {s.highlight && <p className="mt-3 text-amber text-[13px] font-semibold">จุดแข็งอันดับหนึ่งของเรา →</p>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Vehicles strip */}
      <section className="section-pad">
        <div className="container-site">
          <p className="eyebrow">Vehicle Types</p>
          <h2 className="mt-2 text-[26px] min-[900px]:text-[32px] font-bold">เลือกได้ทุกรูปแบบ ตามหน้างานของคุณ</h2>
          <p className="mt-2 text-muted">ออกแบบและคำนวณโครงสร้างรถโดยทีมวิศวกร รองรับน้ำหนัก 200 – 1,000+ กก.</p>
          <div className="mt-8 grid gap-4 grid-cols-2 min-[900px]:grid-cols-5">
            {vehicles.map((v) => (
              <Link key={v.slug} href={`/vehicles/${v.slug}`} className="card p-4 block">
                <Placeholder ratio="1/1" />
                <h3 className="mt-3 text-[14px] font-bold text-brand leading-snug">{v.name}</h3>
                <p className="mt-1 text-[12.5px] text-muted">{v.short}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Why us */}
      <section className="section-pad bg-ice/50">
        <div className="container-site">
          <h2 className="text-[26px] min-[900px]:text-[32px] font-bold">ทำไมลูกค้าเลือก CONSERTECH</h2>
          <div className="mt-8 grid gap-5 min-[700px]:grid-cols-2">
            {whyUs.map((w) => (
              <div key={w.title} className="card-white p-6">
                <h3 className="text-[17px] font-bold text-brand">{w.title}</h3>
                <p className="mt-1.5 text-[14.5px] text-muted">{w.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Process */}
      <section className="section-pad">
        <div className="container-site">
          <p className="eyebrow">Turnkey Engineering Process</p>
          <h2 className="mt-2 text-[26px] min-[900px]:text-[32px] font-bold">ทำงานกับเราเป็นขั้นตอน โปร่งใส วัดผลได้</h2>
          <div className="mt-8 grid gap-4 min-[700px]:grid-cols-3">
            {processSteps.map((s, i) => (
              <div key={s.n} className="card p-5">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white font-bold ${i === 5 ? "bg-amber text-navy" : "bg-brand"}`}>
                  {s.n}
                </div>
                <h3 className="mt-3 font-bold text-navy">{s.title} <span className="text-sky text-[13px] font-semibold">/ {s.en}</span></h3>
                <p className="mt-1 text-[13.5px] text-muted">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-navy text-white">
        <div className="container-site section-pad text-center">
          <h2 className="text-[28px] min-[900px]:text-[34px] font-bold text-white">พร้อมเริ่มก้าวแรกหรือยัง?</h2>
          <p className="mt-3 text-[#CADCFC] mx-auto">นัดสำรวจหน้างานและรับคำปรึกษาเบื้องต้น ฟรี ไม่มีค่าใช้จ่าย ไม่มีข้อผูกมัด</p>
          <Link href="/about#contact" className="btn btn-amber mt-7">นัดสำรวจหน้างานฟรี</Link>
        </div>
      </section>
    </>
  );
}
