import type { Metadata } from "next";
import Link from "next/link";
import { blogPosts } from "@/lib/data";

export const metadata: Metadata = {
  title: "บทความ",
  description: "ความรู้ระบบ AGV, AMR, LiDAR-Guided และ Factory Automation จากทีมวิศวกร CONSERTECH",
};

export default function BlogPage() {
  return (
    <section className="section-pad">
      <div className="container-site">
        <p className="eyebrow">Knowledge</p>
        <h1 className="mt-2 text-[32px] min-[900px]:text-[46px] leading-[1.18] font-bold">บทความ</h1>
        <p className="mt-3 text-muted">ความรู้จากทีมวิศวกรตัวจริง — อ่านจบ เอาไปใช้ตัดสินใจได้</p>

        {/* NOTE: บทความ 4 ชิ้นนี้รอทีมรีวิวก่อน publish จริง (Known gap #2) */}
        <div className="mt-10 grid gap-6 min-[700px]:grid-cols-2">
          {blogPosts.map((p) => (
            <Link key={p.slug} href={`/blog/${p.slug}`} className="card-white p-6 block">
              <span className="inline-block text-[12px] font-semibold text-brand bg-ice rounded-full px-3 py-1">{p.tag}</span>
              <h2 className="mt-3 text-[19px] font-bold text-navy leading-snug">{p.title}</h2>
              <p className="mt-2 text-[14.5px] text-muted">{p.excerpt}</p>
              <p className="mt-3 text-[12.5px] text-muted/70">{p.date}</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
