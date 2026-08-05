"use client";

// Language toggle TH/EN — ตาม README handoff: ตอนนี้แปล EN เฉพาะเมนูและ hero
// เมื่อได้คำแปลเต็มจากลูกค้า ให้ย้ายไป next-intl / i18next

import { createContext, useContext, useState, ReactNode } from "react";

type Lang = "th" | "en";

const dict = {
  th: {
    "nav.home": "หน้าแรก",
    "nav.solution": "โซลูชัน",
    "nav.vehicles": "รถ AGV",
    "nav.fms": "Fleet Management",
    "nav.blog": "บทความ",
    "nav.about": "เกี่ยวกับเรา",
    "nav.academy": "Academy",
    "cta.survey": "นัดสำรวจหน้างานฟรี",
    "hero.pre": "ยกระดับโรงงานของคุณสู่",
    "hero.title": "Intra-Logistic Automation",
    "hero.sub":
      "โซลูชัน LiDAR-Guided AGV และ Fleet Management System ออกแบบโดยทีมวิศวกรไทย ติดตั้งจริง ใช้งานได้จริง",
    "hero.cta2": "ดูโซลูชันทั้งหมด",
  },
  en: {
    "nav.home": "Home",
    "nav.solution": "Solution",
    "nav.vehicles": "AGV Vehicles",
    "nav.fms": "Fleet Management",
    "nav.blog": "Blog",
    "nav.about": "About Us",
    "nav.academy": "Academy",
    "cta.survey": "Book a Free Site Survey",
    "hero.pre": "Upgrade your factory with",
    "hero.title": "Intra-Logistic Automation",
    "hero.sub":
      "LiDAR-Guided AGV and Fleet Management System solutions — engineered, installed, and supported by our Thai team.",
    "hero.cta2": "Explore Solutions",
  },
} as const;

type DictKey = keyof (typeof dict)["th"];

const LangContext = createContext<{
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (k: DictKey) => string;
}>({ lang: "th", setLang: () => {}, t: (k) => k });

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>("th");
  const t = (k: DictKey) => dict[lang][k] ?? dict.th[k];
  return <LangContext.Provider value={{ lang, setLang, t }}>{children}</LangContext.Provider>;
}

export const useLang = () => useContext(LangContext);
