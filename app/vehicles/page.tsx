import type { Metadata } from "next";
import Link from "next/link";
import Placeholder from "@/components/Placeholder";
import { vehicles } from "@/lib/data";

export const metadata: Metadata = {
  title: "รถ AGV 5 รูปแบบ",
  description: "Pallet Jack, Tugger, Lifter, Conveyor, Unit Load — ออกแบบและคำนวณโครงสร้างโดยทีมวิศวกร รองรับ 200–1,000+ กก.",
};

export default function VehiclesPage() {
  return (
    <section className="section-pad">
      <div className="container-site">
        <p className="eyebrow">Vehicle Types</p>
        <h1 className="mt-2 text-[32px] min-[900px]:text-[46px] leading-[1.18] font-bold max-w-[18ch]">
          เลือกรถได้ทุกรูปแบบ ตามหน้างานของคุณ
        </h1>
        <p className="mt-3 text-muted max-w-[52ch]">
          ออกแบบและคำนวณโครงสร้างรถโดยทีมวิศวกร รองรับน้ำหนัก 200 – 1,000+ กก. ทุกคันเลือกระบบขับเคลื่อน
          Differential / Steering / Quad Drive และโหมด Hybrid (อัตโนมัติ + คนควบคุม) ได้
        </p>

        <div className="mt-10 grid gap-6 min-[700px]:grid-cols-2 min-[1040px]:grid-cols-3">
          {vehicles.map((v) => (
            <Link key={v.slug} href={`/vehicles/${v.slug}`} className="card p-6 block">
              <Placeholder ratio="4/3" />
              <h2 className="mt-4 text-[19px] font-bold text-brand">{v.name}</h2>
              <p className="mt-1 text-[14px] text-muted">{v.short}</p>
              <p className="mt-3 text-[13px] font-semibold text-navy">ดูรายละเอียด →</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
