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
      <div className="container-site flex items-center justify-between h-12">
        <div className="flex items-center gap-5">
          <span className="text-[13px] font-bold text-brand tracking-wide uppercase">Academy</span>
          <nav className="flex gap-4 overflow-x-auto">
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
