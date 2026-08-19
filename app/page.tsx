import Link from "next/link";
import Hero from "@/components/Hero";
import { strategicFocus, industrialSystems, industry40, whyUs, processSteps, company } from "@/lib/data";
import { getPublishedArticles } from "@/lib/articles";

export const revalidate = 300;

export default async function HomePage() {
  const articles = await getPublishedArticles();
  const articleFor = (sol: string, item: string) => articles.find((a) => a.solution_id === sol && a.solution_item === item);
  return (
    <>
      <Hero />

      {/* ── STRATEGIC FOCUS: 3 เสาหลัก (ตามหน้า 2 ของโปรไฟล์) ── */}
      <section className="section-pad bg-[#F4F7FA] relative overflow-hidden">
        <div className="container-site grid gap-8 min-[1000px]:grid-cols-[1fr_300px] items-center">
          <div className="space-y-4">
            {strategicFocus.map((p) => (
              <div key={p.key}
                className={`rounded-2xl p-6 min-[700px]:p-7 shadow-sm border ${p.highlight ? "bg-brand text-white border-brand" : "bg-white border-ice"}`}>
                <div className="flex items-center gap-3">
                  <span className={`w-9 h-9 rounded-full flex items-center justify-center text-[18px] ${p.highlight ? "bg-white/15" : "bg-ice"}`}>{p.icon}</span>
                  <h3 className={`text-[19px] font-bold ${p.highlight ? "text-white" : "text-navy"}`}>
                    {p.en} <span className={`text-[15px] font-semibold ${p.highlight ? "text-white/80" : "text-muted"}`}>({p.th})</span>
                  </h3>
                </div>
                <ul className="mt-3 grid gap-x-6 gap-y-1.5 min-[700px]:grid-cols-2">
                  {p.items.map((it) => (
                    <li key={it.en} className={`text-[14px] flex gap-2 ${p.highlight ? "text-white/95" : "text-ink"}`}>
                      <span className={`mt-[9px] w-1.5 h-1.5 rounded-full shrink-0 ${p.highlight ? "bg-white" : "bg-brand"}`} />
                      <span><strong className="font-semibold">{it.en}</strong> <span className={p.highlight ? "text-white/75" : "text-muted"}>({it.th})</span></span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="min-[1000px]:border-l-4 min-[1000px]:border-brand min-[1000px]:pl-6">
            <p className="eyebrow">Strategic Focus</p>
            <h2 className="mt-2 text-[30px] min-[900px]:text-[36px] font-bold leading-tight text-navy">STRATEGIC<br />FOCUS</h2>
            <p className="mt-2 text-[16px] text-brand font-semibold">( จุดมุ่งเน้นเชิงกลยุทธ์ )</p>
            <p className="mt-4 text-[14.5px] text-muted leading-relaxed">เราทำงานครบวงจรตั้งแต่ให้คำปรึกษา ออกแบบ ติดตั้ง ไปจนถึงดูแลระบบระยะยาว ด้วยเทคโนโลยีและนวัตกรรมล่าสุด</p>
          </div>
        </div>
      </section>

      {/* ── INDUSTRIAL SYSTEMS AND TECHNOLOGY: 6 การ์ด (หน้า 3) ── */}
      <section className="section-pad bg-navy text-white relative">
        <div className="container-site">
          <div className="border-l-4 border-white pl-4">
            <h2 className="text-[28px] min-[900px]:text-[36px] font-bold text-white leading-tight">Industrial Systems and Technology</h2>
            <p className="mt-1 text-[#BFD6E9] text-[16px]">ระบบและเทคโนโลยีอุตสาหกรรม</p>
          </div>
          <div className="mt-9 grid gap-5 min-[600px]:grid-cols-2 min-[1000px]:grid-cols-3">
            {industrialSystems.map((s) => (
              <Link key={s.en} href={s.href}
                className="group relative bg-white rounded-2xl pt-10 pb-6 px-5 text-center shadow-lg hover:-translate-y-1 transition-transform">
                <span className="absolute -top-6 left-1/2 -translate-x-1/2 w-12 h-12 rounded-full bg-brand text-white flex items-center justify-center text-[22px] shadow-md ring-4 ring-navy">
                  {s.icon}
                </span>
                <h3 className="text-[14px] font-bold text-navy tracking-wide leading-snug">{s.en}</h3>
                <p className="mt-1 text-[13px] text-muted">{s.th}</p>
                <span className="mt-3 inline-block text-[12px] font-semibold text-brand opacity-0 group-hover:opacity-100 transition">ดูรายละเอียด →</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── INDUSTRY 4.0: 6 หมวดโซลูชัน (หน้า 4 — วงล้อ) ── */}
      <section className="section-pad">
        <div className="container-site">
          <div className="text-center max-w-[60ch] mx-auto">
            <p className="eyebrow">Solutions</p>
            <h2 className="mt-2 text-[30px] min-[900px]:text-[38px] font-bold text-navy">INDUSTRY 4.0</h2>
            <p className="text-[18px] text-brand font-semibold">อุตสาหกรรม 4.0</p>
            <p className="mt-3 text-muted text-[15px]">โซลูชันระบบอัตโนมัติ 6 หมวด ครอบคลุมทั้งโรงงาน — เลือกเริ่มจากจุดที่คุ้มค่าที่สุดของคุณ</p>
          </div>
          <div className="mt-10 grid gap-5 min-[700px]:grid-cols-2 min-[1040px]:grid-cols-3">
            {industry40.map((g) => (
              <div key={g.id}
                className={`rounded-2xl p-6 border transition hover:shadow-lg ${g.highlight ? "bg-brand text-white border-brand" : "bg-white border-ice hover:border-brand"}`}>
                <Link href={`/solution#${g.id}`} className="flex items-start gap-3 group">
                  <span className="w-11 h-11 rounded-xl flex items-center justify-center text-[22px] shrink-0"
                    style={{ backgroundColor: g.highlight ? "rgba(255,255,255,0.18)" : g.color + "22" }}>{g.icon}</span>
                  <div>
                    <h3 className={`text-[15px] font-bold leading-snug group-hover:underline ${g.highlight ? "text-white" : "text-navy"}`}>{g.en}</h3>
                    <p className={`text-[13px] ${g.highlight ? "text-white/80" : "text-muted"}`}>({g.th})</p>
                  </div>
                </Link>
                <ul className="mt-4 space-y-1.5">
                  {g.items.map((it) => {
                    const art = articleFor(g.id, it.en);
                    const body = (
                      <>
                        <p className={`font-bold ${g.highlight ? "text-white" : "text-ink"}`}>• {it.en}{art && <span className={`ml-1 text-[11px] font-semibold ${g.highlight ? "text-amber" : "text-brand"}`}>→ อ่าน</span>}</p>
                        <p className={`pl-3.5 ${g.highlight ? "text-white/75" : "text-muted"}`}>{it.th}</p>
                      </>
                    );
                    return (
                      <li key={it.en} className="text-[13px] leading-snug">
                        {art ? <Link href={`/blog/${art.slug}`} className={`block rounded-lg -mx-2 px-2 py-1 transition ${g.highlight ? "hover:bg-white/10" : "hover:bg-ice/70"}`}>{body}</Link> : body}
                      </li>
                    );
                  })}
                </ul>
                {g.highlight && <Link href={`/solution#${g.id}`} className="mt-4 inline-block text-amber text-[13px] font-semibold">จุดแข็งอันดับหนึ่งของเรา →</Link>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ทำไมต้องเรา ── */}
      <section className="section-pad bg-[#F4F7FA]">
        <div className="container-site">
          <p className="eyebrow">Why CONSERTECH</p>
          <h2 className="mt-2 text-[26px] min-[900px]:text-[32px] font-bold text-navy">ทำไมลูกค้าเลือก CONSERTECH</h2>
          <div className="mt-8 grid gap-5 min-[700px]:grid-cols-2">
            {whyUs.map((w) => (
              <div key={w.title} className="bg-white rounded-2xl border border-ice p-6 hover:border-brand transition">
                <h3 className="text-[17px] font-bold text-brand">{w.title}</h3>
                <p className="mt-1.5 text-[14.5px] text-muted">{w.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ขั้นตอนการทำงาน ── */}
      <section className="section-pad">
        <div className="container-site">
          <p className="eyebrow">Turnkey Engineering Process</p>
          <h2 className="mt-2 text-[26px] min-[900px]:text-[32px] font-bold text-navy">ทำงานกับเราเป็นขั้นตอน โปร่งใส วัดผลได้</h2>
          <div className="mt-8 grid gap-4 min-[700px]:grid-cols-3">
            {processSteps.map((s, i) => (
              <div key={s.n} className="rounded-2xl border border-ice bg-white p-5 hover:border-brand transition">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white font-bold ${i === 5 ? "bg-amber text-navy" : "bg-brand"}`}>{s.n}</div>
                <h3 className="mt-3 font-bold text-navy">{s.title} <span className="text-sky text-[13px] font-semibold">/ {s.en}</span></h3>
                <p className="mt-1 text-[13.5px] text-muted">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA (สไตล์หน้า Thank you) ── */}
      <section className="bg-navy text-white relative overflow-hidden">
        <div className="container-site section-pad">
          <div className="bg-white rounded-[28px] p-8 min-[900px]:p-12 grid gap-8 min-[900px]:grid-cols-[1.2fr_1fr] items-center shadow-2xl">
            <div>
              <p className="text-[12.5px] font-bold text-sky tracking-[0.18em] uppercase">Let’s Connect with Us!</p>
              <h2 className="mt-2 text-[28px] min-[900px]:text-[36px] font-bold text-navy leading-tight">{company.nameEn}</h2>
              <p className="mt-1 text-[15px] text-muted">{company.nameTh}</p>
              <p className="mt-5 text-[14px] font-bold text-navy tracking-wide">CONSULT • SERVICE • TECHNOLOGY</p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href="/about#contact" className="btn btn-primary">นัดสำรวจหน้างานฟรี</Link>
                <Link href="/downloads" className="btn btn-outline">ดาวน์โหลด Company Profile</Link>
              </div>
            </div>
            <div className="text-[14.5px] space-y-2.5 text-ink">
              <p className="flex gap-2.5"><span className="text-brand">🏠</span><span>{company.addressEn}</span></p>
              <p className="flex gap-2.5"><span className="text-brand">📞</span><span>{company.phone}</span></p>
              <p className="flex gap-2.5"><span className="text-brand">✉️</span><a href={`mailto:${company.email}`} className="hover:text-brand">{company.email}</a></p>
              <p className="flex gap-2.5"><span className="text-brand">🌐</span><span>{company.website}</span></p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
