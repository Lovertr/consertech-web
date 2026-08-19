"use client";

// Hero ตามสไตล์ Company Profile v5 — พื้นขาวซ้าย / บล็อกน้ำเงินเข้มขวาโค้งมุม + แถบ tagline ด้านล่าง
import Link from "next/link";
import { useLang } from "@/lib/i18n";
import { company } from "@/lib/data";

export default function Hero() {
  const { t, lang } = useLang();
  return (
    <section className="relative overflow-hidden bg-white">
      {/* แถบน้ำเงินเข้มด้านขวา (โค้งมุมล่างซ้ายเหมือนหน้าปก) */}
      <div className="hidden min-[900px]:block absolute inset-y-0 right-0 w-[46%] bg-navy rounded-bl-[120px]" aria-hidden />
      <div className="container-site relative grid min-[900px]:grid-cols-[1.1fr_1fr] gap-10 items-center pt-16 pb-16 min-[900px]:pt-20 min-[900px]:pb-20">
        <div>
          <p className="text-brand font-bold tracking-[0.18em] text-[12.5px] uppercase">
            {company.tagline}
          </p>
          <h1 className="mt-4 text-[34px] leading-[1.15] font-bold text-navy min-[900px]:text-[52px] max-w-[16ch]">
            {t("hero.pre")}<br />
            <span className="text-brand">{t("hero.title")}</span>
          </h1>
          <p className="mt-5 text-[16.5px] leading-[1.75] text-muted max-w-[54ch]">{t("hero.sub")}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/about#contact" className="btn btn-primary">{t("cta.survey")}</Link>
            <Link href="/solution" className="btn btn-outline">{t("hero.cta2")}</Link>
          </div>
          {/* แถบ 3 คำสำคัญ */}
          <div className="mt-10 flex flex-wrap gap-x-6 gap-y-2 text-[13px] font-bold text-navy">
            {["CONSULT", "SERVICE", "TECHNOLOGY"].map((w, i) => (
              <span key={w} className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-brand" />{w}
                <span className="font-normal text-muted">{["ปรึกษา", "บริการ", "เทคโนโลยี"][i]}</span>
              </span>
            ))}
          </div>
        </div>
        {/* ภาพ: การ์ดโค้งมุมซ้อนบนพื้นน้ำเงิน */}
        <div className="relative">
          <div className="rounded-[28px] overflow-hidden shadow-2xl border-4 border-white bg-white">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/hero-warehouse.png" alt="Industrial Automation by CONSERTECH" className="w-full h-auto object-cover aspect-[4/3]" />
          </div>
          <div className="absolute -bottom-5 left-6 right-6 min-[900px]:left-8 min-[900px]:-right-4 bg-white rounded-2xl shadow-lg border border-ice px-5 py-3.5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold text-sky tracking-wider uppercase">{lang === "th" ? "ระบบและเทคโนโลยีอุตสาหกรรม" : "Industrial Systems & Technology"}</p>
              <p className="text-[14px] font-bold text-navy">Industry 4.0 · Automation · Robotics · AI</p>
            </div>
            <span className="text-brand text-[22px] font-bold">»</span>
          </div>
        </div>
      </div>
      {/* แถบ tagline ล่างสุดตามหน้าปกโปรไฟล์ */}
      <div className="bg-ice/70 border-t border-ice">
        <div className="container-site py-3.5 flex flex-wrap items-center gap-x-8 gap-y-1">
          <p className="text-[14px] font-bold text-navy tracking-wide">CONSULT • SERVICE • TECHNOLOGY</p>
          <p className="text-[13.5px] text-brand font-semibold">{company.taglineTh}</p>
        </div>
      </div>
    </section>
  );
}
