import Link from "next/link";
import { company, industry40 } from "@/lib/data";

export default function Footer() {
  return (
    <footer className="bg-navy text-white mt-auto">
      <div className="container-site py-12 grid gap-10 md:grid-cols-[1.2fr_1fr_1fr]">
        <div>
          <div className="bg-white rounded-xl px-4 py-3 inline-block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-consertech.png" alt="CONSERTECH" width={160} />
          </div>
          <p className="mt-4 text-[14px] font-bold text-white tracking-wide">CONSULT • SERVICE • TECHNOLOGY</p>
          <p className="text-[13px] text-[#BFD6E9]">{company.taglineTh}</p>
          <p className="mt-3 text-sm text-[#CADCFC] max-w-[40ch] leading-relaxed">
            {company.nameTh} — ที่ปรึกษาและผู้ให้บริการระบบอัตโนมัติอุตสาหกรรมครบวงจร
          </p>
        </div>
        <div className="text-sm space-y-2 text-[#CADCFC]">
          <p className="font-bold text-white text-base">ติดต่อเรา</p>
          <p className="flex gap-2"><span>🏠</span><span>{company.address}</span></p>
          <p className="flex gap-2"><span>📞</span><span>{company.phone}</span></p>
          <p className="flex gap-2"><span>✉️</span><a href={`mailto:${company.email}`} className="hover:text-white">{company.email}</a></p>
          <p className="flex gap-2"><span>🌐</span><span>{company.website}</span></p>
        </div>
        <div className="text-sm space-y-2">
          <p className="font-bold text-white text-base">โซลูชัน</p>
          {industry40.map((g) => (
            <p key={g.id}><Link href={`/solution#${g.id}`} className="text-[#CADCFC] hover:text-white">{g.en}</Link></p>
          ))}
          <p className="pt-2"><Link href="/downloads" className="text-[#CADCFC] hover:text-white">📥 ดาวน์โหลดเอกสาร</Link></p>
          <p><Link href="/academy" className="text-[#CADCFC] hover:text-white">CONSERTECH Academy</Link></p>
          <p><Link href="/staff" className="text-[#7FA8C9] hover:text-white">Staff Login</Link></p>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="container-site py-4 flex flex-wrap justify-between gap-2 text-xs text-[#7FA8C9]">
          <span>© 2026 {company.nameEn} All rights reserved.</span>
          <span>นโยบายความเป็นส่วนตัว (ร่าง — รอเอกสาร PDPA)</span>
        </div>
      </div>
    </footer>
  );
}
