import type { Metadata } from "next";
import Link from "next/link";
import Placeholder from "@/components/Placeholder";
import { comparison, fmsFeatures } from "@/lib/data";

export const metadata: Metadata = {
  title: "โซลูชัน LiDAR-Guided AGV",
  description: "ลูกผสมที่ลงตัวระหว่าง AGV และ AMR — เส้นทางเสมือน ไม่ต้องติดเทป แม่นยำสูงสุด",
};

const features = [
  {
    title: "Laser Scanning + Natural Navigation",
    desc: "LiDAR สแกนสภาพแวดล้อมสร้างแผนที่ดิจิทัล ระบุตำแหน่งตัวเองแม่นยำ (Localization) โดยไม่ต้องพึ่งเทปหรือ QR บนพื้น",
  },
  {
    title: "Virtual Path — เปลี่ยนเส้นทางในซอฟต์แวร์",
    desc: "กำหนดเส้นทาง ความเร็ว ทางแยก จุดจอด ผ่านซอฟต์แวร์ทั้งหมด ปรับผังการผลิตได้โดยไม่ต้องรื้อหน้างาน",
  },
  {
    title: "ติดตั้งเร็ว หน้างานสะอาด",
    desc: "ไม่ติดแถบแม่เหล็ก ไม่เจาะพื้น ลดเวลาติดตั้งและค่าใช้จ่ายหน้างาน พื้นที่โรงงานสวยงามเหมือนเดิม",
  },
];

export default function SolutionPage() {
  return (
    <>
      <section className="section-pad">
        <div className="container-site">
          <p className="eyebrow">Our #1 Solution</p>
          <h1 className="mt-2 text-[32px] min-[900px]:text-[46px] leading-[1.18] font-bold">LiDAR-Guided AGV</h1>
          <p className="mt-3 text-[17px] text-muted">ลูกผสมที่ลงตัวระหว่าง AGV และ AMR</p>

          <div className="mt-10 grid gap-10 min-[900px]:grid-cols-[1.3fr_1fr] items-start">
            <div className="space-y-7">
              {features.map((f) => (
                <div key={f.title} className="flex gap-4">
                  <div className="w-2.5 h-2.5 mt-2.5 rounded-full bg-amber shrink-0" />
                  <div>
                    <h2 className="text-[19px] font-bold text-brand">{f.title}</h2>
                    <p className="mt-1 text-[15px] text-muted">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <Placeholder ratio="1/1" label="รูป LiDAR-Guided AGV (รอไฟล์)" className="card p-4" />
          </div>
        </div>
      </section>

      <section className="section-pad bg-ice/50">
        <div className="container-site">
          <h2 className="text-[26px] min-[900px]:text-[32px] font-bold">ทำไมต้องทางสายกลาง?</h2>
          <p className="mt-2 text-muted">เปรียบเทียบ 3 เทคโนโลยีนำทาง</p>
          <div className="mt-7 overflow-x-auto rounded-[14px] border border-ice bg-white">
            <table className="w-full min-w-[720px] text-[14px]">
              <thead>
                <tr>
                  {comparison.headers.map((h, i) => (
                    <th
                      key={h}
                      className={`text-left px-4 py-3 text-white font-bold ${i === 2 ? "bg-amber text-navy" : "bg-navy"}`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {comparison.rows.map((row, ri) => (
                  <tr key={ri} className={ri % 2 ? "bg-ice/40" : "bg-white"}>
                    {row.map((cell, ci) => (
                      <td
                        key={ci}
                        className={`px-4 py-3 ${ci === 0 ? "font-semibold text-navy" : ""} ${ci === 2 ? "bg-[#DCEBF7]/70 font-semibold text-navy" : "text-muted"}`}
                      >
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-5 font-semibold text-amber italic">
            LiDAR-Guided AGV = ความยืดหยุ่นเกือบเท่า AMR + ความแม่นยำสูงกว่า + งบประมาณที่จับต้องได้
          </p>
        </div>
      </section>

      <section className="section-pad">
        <div className="container-site">
          <h2 className="text-[26px] min-[900px]:text-[32px] font-bold">ทำงานร่วมกับ Fleet Management System</h2>
          <div className="mt-7 grid gap-5 min-[900px]:grid-cols-3">
            {fmsFeatures.map((f) => (
              <div key={f.title} className="card p-6">
                <h3 className="font-bold text-brand text-[17px]">{f.title}</h3>
                <p className="mt-1.5 text-[14px] text-muted">{f.desc}</p>
              </div>
            ))}
          </div>
          <Link href="/fleet-management" className="btn btn-outline mt-7">ดูรายละเอียด FMS →</Link>
        </div>
      </section>
    </>
  );
}
