import Link from "next/link";
import { company } from "@/lib/data";

export default function Footer() {
  return (
    <footer className="bg-navy text-white mt-auto">
      <div className="container-site py-12 grid gap-10 md:grid-cols-3">
        <div>
          <div className="bg-white rounded-xl px-4 py-3 inline-block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-consertech.png" alt="CONSERTECH" width={160} />
          </div>
          <p className="mt-4 text-sm text-[#CADCFC] max-w-[36ch]">
            {company.nameTh} — {company.tagline}
          </p>
        </div>
        <div className="text-sm space-y-2 text-[#CADCFC]">
          <p className="font-bold text-white text-base">ติดต่อเรา</p>
          <p>{company.address}</p>
          <p>
            โทร {company.phone} ({company.contactPerson})
          </p>
          <p>{company.email}</p>
        </div>
        <div className="text-sm space-y-2">
          <p className="font-bold text-white text-base">ลิงก์</p>
          <p><Link href="/solution" className="text-[#CADCFC] hover:text-white">โซลูชัน LiDAR-Guided AGV</Link></p>
          <p><Link href="/vehicles" className="text-[#CADCFC] hover:text-white">รถ AGV 5 รูปแบบ</Link></p>
          <p><Link href="/blog" className="text-[#CADCFC] hover:text-white">บทความ</Link></p>
          <p><Link href="/academy" className="text-[#CADCFC] hover:text-white">CONSERTECH Academy</Link></p>
          {/* Staff Login ไว้ที่ footer ตามข้อเสนอ (Known gap #5) — ย้ายได้ถ้า CEO ต้องการ */}
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
