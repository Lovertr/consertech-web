import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getArticle, getPublishedArticles, mdToHtml, splitLead, fmtDateTh, SITE_URL } from "@/lib/articles";
import { industry40, company } from "@/lib/data";
import ViewCounter from "./ViewCounter";

export const revalidate = 300;

export async function generateStaticParams() {
  const all = await getPublishedArticles();
  return all.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const a = await getArticle(slug);
  if (!a) return { title: "ไม่พบบทความ" };
  const title = a.seo_title ?? a.title;
  const description = a.seo_description ?? a.excerpt ?? undefined;
  const url = `${SITE_URL}/blog/${a.slug}`;
  return {
    // seo_title มักมี "| CONSERTECH" อยู่แล้ว → ใช้ absolute กัน template เติมซ้ำ
    title: /CONSERTECH/i.test(title) ? { absolute: title } : title,
    description, keywords: a.keywords?.length ? a.keywords : undefined,
    alternates: { canonical: url },
    openGraph: { title, description, url, type: "article", publishedTime: a.published_at ?? undefined, modifiedTime: a.updated_at, authors: [a.author ?? "CONSERTECH"], images: a.cover_url ? [{ url: a.cover_url, width: 1200, height: 675, alt: a.cover_alt ?? a.title }] : undefined, siteName: "CONSERTECH" },
    twitter: { card: "summary_large_image", title, description, images: a.cover_url ? [a.cover_url] : undefined },
  };
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const a = await getArticle(slug);
  if (!a) notFound();
  const g = industry40.find((x) => x.id === a.solution_id);
  const [lead, rest] = splitLead(a.body_md);
  const all = await getPublishedArticles();
  const related = all.filter((x) => x.slug !== a.slug && (x.solution_id === a.solution_id)).slice(0, 3);
  const more = related.length < 3 ? all.filter((x) => x.slug !== a.slug && !related.includes(x)).slice(0, 3 - related.length) : [];

  const jsonLd = {
    "@context": "https://schema.org", "@type": "TechArticle",
    headline: a.title, description: a.seo_description ?? a.excerpt, image: a.cover_url ? [a.cover_url] : undefined,
    datePublished: a.published_at, dateModified: a.updated_at, inLanguage: "th-TH",
    author: { "@type": "Organization", name: a.author ?? "CONSERTECH" },
    publisher: { "@type": "Organization", name: company.nameEn, logo: { "@type": "ImageObject", url: `${SITE_URL}/logo-consertech.png` } },
    mainEntityOfPage: `${SITE_URL}/blog/${a.slug}`, keywords: a.keywords?.join(", "),
  };
  const breadcrumb = {
    "@context": "https://schema.org", "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "หน้าแรก", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "บทความ", item: `${SITE_URL}/blog` },
      { "@type": "ListItem", position: 3, name: a.title, item: `${SITE_URL}/blog/${a.slug}` },
    ],
  };

  return (
    <article>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      <ViewCounter slug={a.slug} />

      {/* หัวบทความ */}
      <header className="bg-[#F4F7FA]">
        <div className="container-site pt-8 pb-10">
          <nav className="text-[13px] text-muted flex flex-wrap gap-1.5" aria-label="breadcrumb">
            <Link href="/" className="hover:text-brand">หน้าแรก</Link><span>›</span>
            <Link href="/blog" className="hover:text-brand">บทความ</Link>
            {g && <><span>›</span><Link href={`/blog?s=${g.id}`} className="hover:text-brand">{g.en}</Link></>}
          </nav>
          <div className="mt-5 grid gap-8 min-[900px]:grid-cols-[1.1fr_1fr] items-center">
            <div>
              {g && <span className="inline-block text-[12px] font-bold rounded-full px-3 py-1 text-white" style={{ backgroundColor: g.color }}>{g.icon} {g.en} <span className="opacity-80">({g.th})</span></span>}
              <h1 className="mt-3 text-[28px] min-[900px]:text-[38px] leading-[1.25] font-bold text-navy">{a.title}</h1>
              {a.excerpt && <p className="mt-3 text-[16px] text-muted leading-relaxed">{a.excerpt}</p>}
              <p className="mt-4 text-[13px] text-muted/80">{fmtDateTh(a.published_at)} · {a.author ?? "ทีมวิศวกร CONSERTECH"}</p>
            </div>
            {a.cover_url && (
              <div className="rounded-[24px] overflow-hidden shadow-xl border-4 border-white">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={a.cover_url} alt={a.cover_alt ?? a.title} className="w-full aspect-[16/9] object-cover" />
              </div>
            )}
          </div>
        </div>
      </header>

      {/* เนื้อหา */}
      <div className="container-site py-12 grid gap-10 min-[1040px]:grid-cols-[1fr_300px] items-start">
        <div className="max-w-[780px]">
          <div className="prose-article" dangerouslySetInnerHTML={{ __html: mdToHtml(lead) }} />
          {a.diagram_svg && (
            <figure className="my-8">
              <div className="rounded-2xl border border-ice bg-white overflow-hidden [&>svg]:w-full [&>svg]:h-auto" dangerouslySetInnerHTML={{ __html: a.diagram_svg }} />
              <figcaption className="mt-2 text-[12.5px] text-muted/80 text-center">ไดอะแกรม: {a.title.split(":")[0]}</figcaption>
            </figure>
          )}
          <div className="prose-article" dangerouslySetInnerHTML={{ __html: mdToHtml(rest) }} />

          <div className="mt-10 rounded-2xl bg-brand text-white p-6 min-[700px]:p-8 flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-[18px] font-bold text-white">อยากรู้ว่าโซลูชันนี้ใช้กับโรงงานของคุณได้อย่างไร?</p>
              <p className="mt-1 text-[14px] text-white/85">ให้ทีมวิศวกรเข้าสำรวจหน้างานฟรี — ไม่มีค่าใช้จ่าย ไม่มีข้อผูกมัด</p>
            </div>
            <Link href="/about#contact" className="btn btn-amber">นัดสำรวจหน้างานฟรี</Link>
          </div>
        </div>

        {/* แถบข้าง */}
        <aside className="space-y-5 min-[1040px]:sticky min-[1040px]:top-24">
          {g && (
            <div className="rounded-2xl border border-ice bg-white p-5">
              <p className="text-[11.5px] font-bold text-sky tracking-wider uppercase">โซลูชันในหมวดนี้</p>
              <p className="mt-1 font-bold text-navy">{g.icon} {g.en}</p>
              <ul className="mt-3 space-y-1.5">
                {g.items.map((it) => {
                  const art = all.find((x) => x.solution_id === g.id && x.solution_item === it.en);
                  return (
                    <li key={it.en} className="text-[13px]">
                      {art ? <Link href={`/blog/${art.slug}`} className={`hover:text-brand ${art.slug === a.slug ? "font-bold text-brand" : "text-ink"}`}>{it.en}</Link> : <span className="text-muted">{it.en}</span>}
                    </li>
                  );
                })}
              </ul>
              <Link href={`/solution#${g.id}`} className="mt-3 inline-block text-[12.5px] font-semibold text-brand hover:text-navy">ดูหน้าโซลูชัน →</Link>
            </div>
          )}
          <div className="rounded-2xl border border-ice bg-white p-5">
            <p className="text-[11.5px] font-bold text-sky tracking-wider uppercase">ดาวน์โหลด</p>
            <p className="mt-1 text-[13.5px] text-ink">Company Profile และแคตตาล็อกสินค้า</p>
            <Link href="/downloads" className="mt-2 inline-block btn btn-outline text-[13px] py-2 px-3.5">📥 ไปหน้าดาวน์โหลด</Link>
          </div>
        </aside>
      </div>

      {/* บทความที่เกี่ยวข้อง */}
      {(related.length + more.length) > 0 && (
        <section className="bg-[#F4F7FA]">
          <div className="container-site py-12">
            <h2 className="text-[22px] font-bold text-navy">บทความที่เกี่ยวข้อง</h2>
            <div className="mt-5 grid gap-5 min-[640px]:grid-cols-3">
              {[...related, ...more].map((x) => (
                <Link key={x.id} href={`/blog/${x.slug}`} className="group bg-white rounded-2xl border border-ice overflow-hidden hover:border-brand transition">
                  {x.cover_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={x.cover_url} alt={x.cover_alt ?? x.title} className="w-full aspect-[16/9] object-cover" loading="lazy" />
                  )}
                  <div className="p-4">
                    <p className="text-[14.5px] font-bold text-navy leading-snug group-hover:text-brand">{x.title}</p>
                    <p className="mt-1 text-[12px] text-muted/70">{fmtDateTh(x.published_at)}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </article>
  );
}
