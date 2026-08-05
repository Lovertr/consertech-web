import Link from "next/link";
import { tiers, courses } from "@/lib/data";

export default function AcademyHome() {
  return (
    <>
      <section className="section-pad bg-gradient-to-br from-navy to-brand text-white">
        <div className="container-site">
          <p className="text-[#BFD6E9] font-semibold tracking-widest text-sm uppercase">CONSERTECH Academy</p>
          <h1 className="mt-3 text-[30px] min-[900px]:text-[44px] leading-[1.2] font-bold text-white max-w-[22ch]">
            เรียนรู้เทคโนโลยี AGV จากวิศวกรตัวจริง
          </h1>
          <p className="mt-4 text-[#D7E6F3] max-w-[52ch]">
            คอร์สจากประสบการณ์ออกแบบและติดตั้งจริง — ตั้งแต่พื้นฐาน AGV/AMR จนถึงการคำนวณโครงสร้างรถ
            การตั้งค่า LiDAR และการวางระบบ Fleet Management
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/academy/courses" className="btn btn-amber">ดูคอร์สทั้งหมด ({courses.length} คอร์ส)</Link>
            <Link href="/academy/login" className="btn border border-white/60 text-white hover:bg-white/10">สมัครสมาชิกฟรี</Link>
          </div>
        </div>
      </section>

      <section className="section-pad">
        <div className="container-site">
          <h2 className="text-[26px] min-[900px]:text-[32px] font-bold text-center">ระดับสมาชิก</h2>
          <p className="mt-2 text-muted text-center mx-auto">เริ่มฟรี อัปเกรดเมื่อพร้อม</p>
          <div className="mt-9 grid gap-6 min-[900px]:grid-cols-3 items-start">
            {tiers.map((t) => (
              <div
                key={t.name}
                className={`rounded-[14px] p-7 border ${t.highlight ? "bg-navy text-white border-navy shadow-lg" : "card-white"}`}
              >
                {t.highlight && (
                  <span className="inline-block text-[11px] font-bold bg-amber text-navy rounded-full px-3 py-1 mb-3">แนะนำ</span>
                )}
                <h3 className={`text-[22px] font-bold ${t.highlight ? "text-white" : "text-navy"}`}>{t.name}</h3>
                <p className={`mt-1 text-[14px] ${t.highlight ? "text-[#CADCFC]" : "text-muted"}`}>{t.desc}</p>
                <ul className="mt-5 space-y-2.5">
                  {t.features.map((f) => (
                    <li key={f} className={`flex gap-2.5 text-[14px] ${t.highlight ? "text-[#D7E6F3]" : "text-muted"}`}>
                      <span className="text-amber font-bold">✓</span> {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href={t.cta === "ติดต่อฝ่ายขาย" ? "/about#contact" : "/academy/login"}
                  className={`btn w-full mt-6 ${t.highlight ? "btn-amber" : "btn-outline"}`}
                >
                  {t.cta}
                </Link>
              </div>
            ))}
          </div>
          <p className="mt-6 text-center text-[12.5px] text-muted/70">
            * ราคาสมาชิก Premium จะประกาศเร็วๆ นี้
          </p>
        </div>
      </section>
    </>
  );
}
