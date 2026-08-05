import Link from "next/link";
import { courses } from "@/lib/data";

export const metadata = { title: "คอร์สทั้งหมด" };

export default function CoursesPage() {
  return (
    <section className="section-pad">
      <div className="container-site">
        <h1 className="text-[30px] min-[900px]:text-[40px] font-bold">คอร์สทั้งหมด</h1>
        <p className="mt-2 text-muted">{courses.length} คอร์ส จากประสบการณ์ออกแบบและติดตั้งจริง</p>

        <div className="mt-9 grid gap-6 min-[700px]:grid-cols-2 min-[1040px]:grid-cols-3">
          {courses.map((c) => (
            <Link key={c.slug} href={`/academy/courses/${c.slug}`} className="card-white p-6 flex flex-col">
              <div className="flex items-center justify-between">
                <span
                  className={`text-[11.5px] font-bold rounded-full px-3 py-1 ${
                    c.level === "free" ? "bg-ice text-brand" : "bg-amber/15 text-amber"
                  }`}
                >
                  {c.level === "free" ? "ฟรี" : "Premium"}
                </span>
                <span className="text-[12px] text-muted">{c.duration}</span>
              </div>
              <h2 className="mt-3 text-[17px] font-bold text-navy leading-snug">{c.title}</h2>
              <p className="mt-2 text-[13.5px] text-muted flex-1">{c.desc}</p>
              <p className="mt-4 text-[13px] font-semibold text-brand">{c.lessons.length} บทเรียน →</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
