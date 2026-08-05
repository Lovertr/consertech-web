import Link from "next/link";
import { notFound } from "next/navigation";
import { blogPosts } from "@/lib/data";

export function generateStaticParams() {
  return blogPosts.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = blogPosts.find((x) => x.slug === slug);
  return { title: p?.title ?? "บทความ" };
}

export default async function BlogDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = blogPosts.find((x) => x.slug === slug);
  if (!post) notFound();

  return (
    <article className="section-pad">
      <div className="container-site max-w-[820px]">
        <Link href="/blog" className="text-sky text-sm font-semibold">← บทความทั้งหมด</Link>
        <span className="block mt-4 text-[12px] font-semibold text-brand bg-ice rounded-full px-3 py-1 w-fit">{post.tag}</span>
        <h1 className="mt-3 text-[28px] min-[900px]:text-[38px] leading-[1.25] font-bold">{post.title}</h1>
        <p className="mt-2 text-[13px] text-muted/70">{post.date} · ทีมวิศวกร CONSERTECH</p>
        <div className="mt-7 space-y-5">
          {post.body.map((para, i) => (
            <p key={i} className="text-[16px] leading-[1.8] text-ink max-w-none">{para}</p>
          ))}
        </div>
        <div className="mt-10 rounded-[14px] bg-ice p-6">
          <p className="font-bold text-navy">อยากรู้ว่าเทคโนโลยีนี้ใช้กับโรงงานของคุณได้อย่างไร?</p>
          <p className="mt-1 text-[14px] text-muted">ให้ทีมวิศวกรเข้าสำรวจหน้างานฟรี ไม่มีค่าใช้จ่าย</p>
          <Link href="/about#contact" className="btn btn-primary mt-4">นัดสำรวจหน้างานฟรี</Link>
        </div>
      </div>
    </article>
  );
}
