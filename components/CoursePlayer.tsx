"use client";

// หน้าเรียน — วิดีโอ player placeholder + สารบัญบทเรียน + progress ตามดีไซน์ Zone B
import Link from "next/link";
import { useState } from "react";
import type { Course } from "@/lib/data";
import { useMockAuth } from "@/lib/mockAuth";

export default function CoursePlayer({ course }: { course: Course }) {
  const { user, setProgress } = useMockAuth();
  const [current, setCurrent] = useState(0);
  const pct = user?.progress[course.slug] ?? 0;
  const locked = course.level === "premium" && !user;

  return (
    <section className="section-pad">
      <div className="container-site">
        <Link href="/academy/courses" className="text-sky text-sm font-semibold">← คอร์สทั้งหมด</Link>
        <h1 className="mt-3 text-[26px] min-[900px]:text-[34px] leading-[1.25] font-bold max-w-[36ch]">{course.title}</h1>
        <div className="mt-2 flex items-center gap-3 text-[13px]">
          <span className={`font-bold rounded-full px-3 py-1 ${course.level === "free" ? "bg-ice text-brand" : "bg-amber/15 text-amber"}`}>
            {course.level === "free" ? "ฟรี" : "Premium"}
          </span>
          <span className="text-muted">{course.duration} · {course.lessons.length} บทเรียน</span>
        </div>

        <div className="mt-7 grid gap-7 min-[900px]:grid-cols-[1.6fr_1fr] items-start">
          {/* video placeholder */}
          <div>
            <div className="relative rounded-[14px] bg-navy aspect-video flex items-center justify-center overflow-hidden">
              {locked ? (
                <div className="text-center text-white px-6">
                  <p className="text-3xl">🔒</p>
                  <p className="mt-2 font-bold">คอร์สนี้สำหรับสมาชิก Premium</p>
                  <Link href="/academy/login" className="btn btn-amber mt-4">เข้าสู่ระบบ / สมัครสมาชิก</Link>
                </div>
              ) : (
                <button
                  className="w-16 h-16 rounded-full bg-amber flex items-center justify-center hover:brightness-95 transition"
                  aria-label="เล่นวิดีโอ"
                  onClick={() => setProgress(course.slug, Math.min(100, pct + 20))}
                >
                  <span className="text-navy text-2xl ml-1">▶</span>
                </button>
              )}
              <span className="absolute bottom-3 right-4 text-[11px] text-white/50">วิดีโอเดโม — รอไฟล์จริง</span>
            </div>
            <p className="mt-3 font-semibold text-navy">บทที่ {current + 1}: {course.lessons[current]}</p>
            <p className="mt-1 text-[14px] text-muted">{course.desc}</p>
          </div>

          {/* lesson list + progress */}
          <div className="card-white p-5">
            <div className="flex justify-between text-[13px] font-semibold">
              <span className="text-navy">ความคืบหน้า</span>
              <span className="text-brand">{pct}%</span>
            </div>
            <div className="mt-2 h-2 rounded-full bg-ice overflow-hidden">
              <div className="h-full bg-brand rounded-full transition-all" style={{ width: `${pct}%` }} />
            </div>
            <ul className="mt-5 space-y-1">
              {course.lessons.map((l, i) => (
                <li key={l}>
                  <button
                    onClick={() => setCurrent(i)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg text-[14px] transition ${
                      i === current ? "bg-ice text-navy font-bold" : "text-muted hover:bg-ice/60"
                    }`}
                  >
                    <span className="text-sky font-semibold mr-2">{i + 1}.</span>
                    {l}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
