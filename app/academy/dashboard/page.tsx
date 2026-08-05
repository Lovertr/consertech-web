"use client";

import Link from "next/link";
import { courses } from "@/lib/data";
import { useMockAuth } from "@/lib/mockAuth";

// ใบประกาศ 2 ใบตามดีไซน์ Zone B (dummy)
const certificates = [
  { title: "พื้นฐาน Logistic Automation", date: "ก.ค. 2569" },
  { title: "ความปลอดภัยเครื่องจักรและ Protective Field", date: "ส.ค. 2569" },
];

export default function DashboardPage() {
  const { user } = useMockAuth();

  if (!user) {
    return (
      <section className="section-pad">
        <div className="container-site max-w-[440px] text-center">
          <div className="card p-8">
            <p className="text-3xl">👋</p>
            <h1 className="mt-3 text-xl font-bold text-navy">เข้าสู่ระบบเพื่อดูคอร์สของคุณ</h1>
            <Link href="/academy/login" className="btn btn-primary mt-5">เข้าสู่ระบบ / สมัครสมาชิก</Link>
          </div>
        </div>
      </section>
    );
  }

  const enrolled = courses.filter((c) => user.progress[c.slug] !== undefined);

  return (
    <section className="section-pad">
      <div className="container-site">
        <h1 className="text-[28px] min-[900px]:text-[36px] font-bold">สวัสดี {user.name}</h1>
        <p className="mt-1 text-muted">
          สมาชิกระดับ <strong className="text-amber">{user.tier === "premium" ? "Premium" : "Free"}</strong> · {user.email}
        </p>

        <h2 className="mt-9 text-[22px] font-bold">คอร์สของฉัน</h2>
        <div className="mt-4 grid gap-5 min-[700px]:grid-cols-2">
          {enrolled.length === 0 && (
            <p className="text-muted">ยังไม่มีคอร์ส — <Link href="/academy/courses" className="text-brand font-semibold">เลือกคอร์สแรกเลย</Link></p>
          )}
          {enrolled.map((c) => {
            const pct = user.progress[c.slug];
            return (
              <Link key={c.slug} href={`/academy/courses/${c.slug}`} className="card-white p-6 block">
                <h3 className="font-bold text-navy leading-snug">{c.title}</h3>
                <div className="mt-3 flex items-center gap-3">
                  <div className="flex-1 h-2 rounded-full bg-ice overflow-hidden">
                    <div className="h-full bg-brand rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-[13px] font-bold text-brand">{pct}%</span>
                </div>
                <p className="mt-2 text-[13px] text-muted">{pct >= 100 ? "เรียนจบแล้ว 🎉" : "เรียนต่อ →"}</p>
              </Link>
            );
          })}
        </div>

        <h2 className="mt-10 text-[22px] font-bold">ใบประกาศนียบัตร</h2>
        <div className="mt-4 grid gap-5 min-[700px]:grid-cols-2">
          {certificates.map((cert) => (
            <div key={cert.title} className="rounded-[14px] border-2 border-amber/60 bg-white p-6 relative">
              <span className="absolute top-4 right-5 text-2xl">🏅</span>
              <p className="text-[11px] font-bold tracking-widest text-sky uppercase">Certificate of Completion</p>
              <h3 className="mt-2 font-bold text-navy pr-10">{cert.title}</h3>
              <p className="mt-1 text-[13px] text-muted">ออกให้ {user.name} · {cert.date}</p>
              <button className="btn btn-outline mt-4 text-[13px] py-2 px-4">ดาวน์โหลด PDF (เดโม)</button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
