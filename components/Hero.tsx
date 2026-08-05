"use client";

import Link from "next/link";
import Placeholder from "./Placeholder";
import { useLang } from "@/lib/i18n";

export default function Hero() {
  const { t } = useLang();
  return (
    <section className="bg-gradient-to-br from-navy via-brand to-[#1E77B5] text-white">
      <div className="container-site section-pad grid gap-10 min-[900px]:grid-cols-[1.2fr_1fr] items-center">
        <div>
          <p className="text-[#BFD6E9] font-semibold tracking-widest text-sm uppercase">
            Consult · Service · Technology
          </p>
          <h1 className="mt-4 text-[34px] leading-[1.18] font-bold text-white min-[900px]:text-[46px] max-w-[18ch]">
            {t("hero.pre")}{" "}
            <span className="text-amber">{t("hero.title")}</span>
          </h1>
          <p className="mt-5 text-[17px] leading-[1.7] text-[#D7E6F3] max-w-[52ch]">{t("hero.sub")}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/about#contact" className="btn btn-amber">
              {t("cta.survey")}
            </Link>
            <Link href="/solution" className="btn border border-white/60 text-white hover:bg-white/10">
              {t("hero.cta2")}
            </Link>
          </div>
        </div>
        <Placeholder ratio="4/3" label="รูปรถ AGV จริง (รอไฟล์)" className="bg-white/95" />
      </div>
    </section>
  );
}
