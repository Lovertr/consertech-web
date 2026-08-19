import type { Metadata } from "next";
import Link from "next/link";
import { getPublishedArticles, fmtDateTh, SITE_URL } from "@/lib/articles";
import { industry40 } from "@/lib/data";

export const revalidate = 300; // ISR: อัปเดตทุก 5 นาทีหลังแอดมินแก้บทความ

export const metadata: Metadata = {
  title: "บทความ — ความรู้ระบบอัตโนมัติอุตสาหกรรม AGV/AMR, ASRS, AI Vision, Machine Safety",
  description: "บทความจากทีมวิศวกร CONSERTECH: โซลูชัน Industry 4.0 ทั้ง 6 หมวด — คลังสินค้าอัตโนมัติ, สายการผลิต, AGV/AMR, ตรวจสอบคุณภาพด้วย AI, บำรุงรักษาเชิงพยากรณ์ และความปลอดภัยเครื่องจักร อ่านจบ เอาไปตัดสินใจได้",
  alternates: { canonical: `${SITE_URL}/blog` },
  openGraph: { title: "บทความ | CONSERTECH", description: "ความรู้ระบบอัตโนมัติอุตสาหกรรมจากทีมวิศวกรตัวจริง", url: `${SITE_URL}/blog`, type: "website" },
};

export default async function BlogPage({ searchParams }: { searchParams: Promise<{ s?: string }> }) {
  const { s } = await searchParams;
  const all = await getPublishedArticles();
  const list = s ? all.filter((a) => a.solution_id === s) : all;
  const groupOf = (id: string | null) => industry40.find((g) => g.id === id);

  const jsonLd = {
    "@context": "https://schema.org", "@type": "Blog", name: "CONSERTECH Blog", url: `${SITE_URL}/blog`,
    blogPost: all.slice(0, 20).map((a) => ({ "@type": "BlogPosting", headline: a.title, url: `${SITE_URL}/blog/${a.slug}`, datePublished: a.published_at, image: a.cover_url ?? undefined })),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <section className="bg-navy text-white">
        <div className="container-site section-pad">
          <div className="border-l-4 border-white pl-4 max-w-[70ch]">
            <p className="text-[12.5px] font-bold text-[#BFD6E9] tracking-[0.18em] uppercase">Knowledge</p>
            <h1 className="mt-1 text-[32px] min-[900px]:text-[44px] leading-[1.15] font-bold text-white">บทความ</h1>
            <p className="mt-3 text-[16px] text-[#D7E6F3]">ความรู้จากทีมวิศวกรตัวจริง — อธิบายทุกโซลูชันให้เข้าใจง่าย อ่านจบ เอาไปตัดสินใจได้</p>
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            <Link href="/blog" className={`text-[12.5px] font-semibold rounded-full px-3.5 py-1.5 border transition ${!s ? "bg-white text-navy border-white" : "bg-white/10 border-white/20 hover:bg-white/20"}`}>ทั้งหมด ({all.length})</Link>
            {industry40.map((g) => {
              const n = all.filter((a) => a.solution_id === g.id).length;
              return n > 0 ? (
                <Link key={g.id} href={`/blog?s=${g.id}`} className={`text-[12.5px] font-semibold rounded-full px-3.5 py-1.5 border transition ${s === g.id ? "bg-white text-navy border-white" : "bg-white/10 border-white/20 hover:bg-white/20"}`}>
                  {g.icon} {g.en} ({n})
                </Link>
              ) : null;
            })}
          </div>
        </div>
      </section>

      <section className="section-pad bg-[#F4F7FA]">
        <div className="container-site">
          <div className="grid gap-6 min-[640px]:grid-cols-2 min-[1040px]:grid-cols-3">
            {list.map((a) => {
              const g = groupOf(a.solution_id);
              return (
                <Link key={a.id} href={`/blog/${a.slug}`} className="group bg-white rounded-2xl border border-ice overflow-hidden hover:border-brand hover:shadow-lg transition flex flex-col">
                  <div className="aspect-[16/9] bg-ice/60 overflow-hidden relative">
                    {a.cover_url
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img src={a.cover_url} alt={a.cover_alt ?? a.title} className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500" loading="lazy" />
                      : <div className="w-full h-full flex items-center justify-center text-[44px]">{g?.icon ?? "📄"}</div>}
                    {g && <span className="absolute top-3 left-3 text-[11px] font-bold rounded-full px-2.5 py-1 text-white shadow" style={{ backgroundColor: g.color }}>{g.icon} {g.en}</span>}
                  </div>
                  <div className="p-5 flex-1 flex flex-col">
                    <h2 className="text-[16.5px] font-bold text-navy leading-snug group-hover:text-brand transition">{a.title}</h2>
                    {a.excerpt && <p className="mt-2 text-[13.5px] text-muted leading-relaxed line-clamp-3">{a.excerpt}</p>}
                    <p className="mt-auto pt-3 text-[12px] text-muted/70">{fmtDateTh(a.published_at)} · {a.author ?? "ทีมวิศวกร CONSERTECH"}</p>
                  </div>
                </Link>
              );
            })}
          </div>
          {list.length === 0 && <p className="text-muted">ยังไม่มีบทความในหมวดนี้</p>}
        </div>
      </section>
    </>
  );
}
