import type { Metadata } from "next";
import Link from "next/link";
import { fmsFeatures } from "@/lib/data";

export const metadata: Metadata = {
  title: "Fleet Management System (FMS)",
  description: "หอบังคับการที่ทำให้รถทุกคันทำงานเป็นทีมเดียวกัน — Traffic Control, Task Allocation, Status Monitoring",
};

const ecosystem = [
  { title: "Wi-Fi อุตสาหกรรม", desc: "ออกแบบตำแหน่ง Access Point ให้ครอบคลุมทั่วพื้นที่ตามมาตรฐาน IEEE 802.11 — รถไม่หลุดการเชื่อมต่อ" },
  { title: "เชื่อมต่อ PLC / WMS / MES", desc: "สื่อสารกับเครื่องจักรและระบบบริหารคลัง/การผลิตที่มีอยู่ เชื่อมข้อมูลเป็นระบบเดียว" },
  { title: "สื่อสารระหว่างรถ (V2V)", desc: "แชร์พิกัด ความเร็ว ทิศทาง เพื่อป้องกันการชนที่ทางแยกและวิ่งเป็นขบวนอย่างปลอดภัย" },
  { title: "โครงสร้างเครือข่าย", desc: "เลือก Switch และโครงสร้างเครือข่ายที่เหมาะสม (L2/L3, Gigabit) ตามขนาดระบบ" },
];

export default function FmsPage() {
  return (
    <>
      <section className="section-pad">
        <div className="container-site">
          <p className="eyebrow">Fleet Management &amp; Ecosystem</p>
          <h1 className="mt-2 text-[32px] min-[900px]:text-[46px] leading-[1.18] font-bold">
            Fleet Management System (FMS)
          </h1>
          <p className="mt-3 text-[17px] text-muted max-w-[52ch]">
            “หอบังคับการ” ที่ทำให้รถทุกคันทำงานเป็นทีมเดียวกัน — รถ AGV 10 คันวิ่งพร้อมกันโดยไม่ชนกัน
            เพราะทุกคันคุยผ่านตัวกลางที่มองเห็นภาพรวมทั้งระบบ
          </p>

          <div className="mt-10 grid gap-5 min-[900px]:grid-cols-3">
            {fmsFeatures.map((f) => (
              <div key={f.title} className="card p-6">
                <h2 className="font-bold text-brand text-[18px]">{f.title}</h2>
                <p className="mt-1.5 text-[14.5px] text-muted">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section-pad bg-navy text-white">
        <div className="container-site">
          <h2 className="text-[26px] min-[900px]:text-[32px] font-bold text-white">
            เราออกแบบระบบสื่อสารให้ครบทั้ง <span className="text-amber">Ecosystem</span>
          </h2>
          <div className="mt-8 grid gap-5 min-[700px]:grid-cols-2">
            {ecosystem.map((e) => (
              <div key={e.title} className="rounded-[14px] bg-white/5 border border-white/10 p-6">
                <h3 className="font-bold text-amber text-[17px]">{e.title}</h3>
                <p className="mt-1.5 text-[14.5px] text-[#D7E6F3]">{e.desc}</p>
              </div>
            ))}
          </div>
          <Link href="/about#contact" className="btn btn-amber mt-9">ปรึกษาการวางระบบ FMS</Link>
        </div>
      </section>
    </>
  );
}
