"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMockAuth } from "@/lib/mockAuth";

const tabs = [
  { href: "/academy", label: "ภาพรวม" },
  { href: "/academy/courses", label: "คอร์สทั้งหมด" },
  { href: "/academy/dashboard", label: "คอร์สของฉัน" },
];

export default function AcademyNav() {
  const pathname = usePathname();
  const { user, logout } = useMockAuth();

  return (
    <div className="bg-ice/60 border-b border-ice">
      <div className="container-site flex flex-wrap items-center justify-between gap-x-4 gap-y-1 min-h-12 py-1.5">
        <div className="flex items-center gap-3 min-[600px]:gap-5 min-w-0">
          <span className="hidden min-[600px]:inline text-[13px] font-bold text-brand tracking-wide uppercase">Academy</span>
          <nav className="flex gap-3 min-[600px]:gap-4 overflow-x-auto max-w-full">
            {tabs.map((t) => {
              const active = t.href === "/academy" ? pathname === "/academy" : pathname.startsWith(t.href);
              return (
                <Link
                  key={t.href}
                  href={t.href}
                  className={`text-[14px] font-semibold whitespace-nowrap ${active ? "text-navy" : "text-muted hover:text-brand"}`}
                >
                  {t.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="text-[13px]">
          {user ? (
            <span className="text-muted">
              สวัสดี <strong className="text-navy">{user.name}</strong>{" "}
              <button onClick={logout} className="text-sky hover:text-brand ml-2 font-semibold">ออกจากระบบ</button>
            </span>
          ) : (
            <Link href="/academy/login" className="font-semibold text-brand hover:text-navy">เข้าสู่ระบบ / สมัครสมาชิก</Link>
          )}
        </div>
      </div>
    </div>
  );
}
