"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { useLang } from "@/lib/i18n";

const links = [
  { href: "/", key: "nav.home" },
  { href: "/solution", key: "nav.solution" },
  { href: "/vehicles", key: "nav.vehicles" },
  { href: "/fleet-management", key: "nav.fms" },
  { href: "/blog", key: "nav.blog" },
  { href: "/about", key: "nav.about" },
  { href: "/academy", key: "nav.academy" },
] as const;

export default function Header() {
  const { lang, setLang, t } = useLang();
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-ice">
      <div className="container-site flex items-center justify-between gap-4 h-[72px]">
        <Link href="/" className="shrink-0" onClick={() => setOpen(false)}>
          {/* โลโก้ 170px ตามสเปก header ใน README */}
          <Image src="/logo-consertech.png" alt="CONSERTECH" width={170} height={32} priority />
        </Link>

        {/* desktop nav — ยุบเป็น hamburger ที่ 1040px */}
        <nav className="hidden min-[1040px]:flex items-center gap-6">
          {links.map((l) => {
            const active = l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`text-[15px] font-semibold hover:text-navy ${active ? "text-brand" : "text-muted"}`}
              >
                {t(l.key)}
              </Link>
            );
          })}
        </nav>

        <div className="hidden min-[1040px]:flex items-center gap-3">
          <button
            onClick={() => setLang(lang === "th" ? "en" : "th")}
            className="text-[13px] font-semibold border border-ice rounded-lg px-2.5 py-1.5 text-muted hover:border-brand hover:text-brand"
            aria-label="เปลี่ยนภาษา"
          >
            {lang === "th" ? "TH | en" : "th | EN"}
          </button>
          <Link href="/about#contact" className="btn btn-primary text-[14px] py-2.5 px-4">
            {t("cta.survey")}
          </Link>
        </div>

        {/* hamburger */}
        <button
          className="min-[1040px]:hidden p-2 -mr-2"
          onClick={() => setOpen(!open)}
          aria-label="เมนู"
        >
          <div className="w-6 space-y-1.5">
            <span className={`block h-0.5 bg-navy transition ${open ? "rotate-45 translate-y-2" : ""}`} />
            <span className={`block h-0.5 bg-navy transition ${open ? "opacity-0" : ""}`} />
            <span className={`block h-0.5 bg-navy transition ${open ? "-rotate-45 -translate-y-2" : ""}`} />
          </div>
        </button>
      </div>

      {open && (
        <nav className="min-[1040px]:hidden border-t border-ice bg-white">
          <div className="container-site py-4 flex flex-col gap-1">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="py-2.5 font-semibold text-navy"
              >
                {t(l.key)}
              </Link>
            ))}
            <Link href="/staff" onClick={() => setOpen(false)} className="py-2.5 text-muted text-sm">
              Staff Login
            </Link>
            <div className="flex items-center gap-3 pt-3">
              <button
                onClick={() => setLang(lang === "th" ? "en" : "th")}
                className="text-[13px] font-semibold border border-ice rounded-lg px-2.5 py-1.5 text-muted"
              >
                {lang === "th" ? "TH | en" : "th | EN"}
              </button>
              <Link href="/about#contact" onClick={() => setOpen(false)} className="btn btn-primary text-[14px] py-2 px-4">
                {t("cta.survey")}
              </Link>
            </div>
          </div>
        </nav>
      )}
    </header>
  );
}
