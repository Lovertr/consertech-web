import Link from "next/link";
import { notFound } from "next/navigation";
import AgvImage from "@/components/AgvImage";
import { vehicles } from "@/lib/data";

export function generateStaticParams() {
  return vehicles.map((v) => ({ slug: v.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const v = vehicles.find((x) => x.slug === slug);
  return { title: v ? `${v.name} — AGV` : "รถ AGV", description: v?.desc };
}

export default async function VehicleDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const v = vehicles.find((x) => x.slug === slug);
  if (!v) notFound();
  const others = vehicles.filter((x) => x.slug !== v.slug);

  return (
    <section className="section-pad">
      <div className="container-site">
        <Link href="/vehicles" className="text-sky text-sm font-semibold">← รถ AGV ทั้งหมด</Link>
        <div className="mt-4 grid gap-10 min-[900px]:grid-cols-[1fr_1.2fr] items-start">
          <AgvImage src={v.image} alt={v.name} ratio="1/1" className="card p-4" sizes="(max-width: 900px) 90vw, 45vw" />

          <div>
            <p className="eyebrow">LiDAR-Guided AGV</p>
            <h1 className="mt-1 text-[30px] min-[900px]:text-[40px] leading-[1.2] font-bold">{v.name}</h1>
            <p className="mt-1 text-sky font-semibold">{v.short}</p>
            <p className="mt-4 text-muted">{v.desc}</p>

            <h2 className="mt-7 text-[19px] font-bold">เหมาะสำหรับ</h2>
            <ul className="mt-2 space-y-1.5">
              {v.useCases.map((u) => (
                <li key={u} className="flex gap-2.5 text-[15px] text-muted">
                  <span className="text-amber font-bold">✓</span> {u}
                </li>
              ))}
            </ul>

            <h2 className="mt-7 text-[19px] font-bold">ข้อมูลเบื้องต้น</h2>
            <div className="mt-3 rounded-[14px] border border-ice overflow-hidden">
              {v.specs.map(([k, val], i) => (
                <div key={k} className={`grid grid-cols-[40%_60%] text-[14px] ${i % 2 ? "bg-white" : "bg-ice/50"}`}>
                  <div className="px-4 py-2.5 font-semibold text-navy">{k}</div>
                  <div className="px-4 py-2.5 text-muted">{val}</div>
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-2xl bg-ice/60 border border-ice p-4 text-[13.5px] text-muted">
              <span className="font-bold text-navy">Hybrid vs Fully Automatic:</span> รุ่น Hybrid มีแผงควบคุม/คันโยกให้พนักงานขับเองได้ทันทีหากระบบนำทางมีปัญหา
              ส่วนรุ่น Fully Automatic กะทัดรัดกว่าและราคาต่ำกว่า แต่เมื่อขัดข้องต้องรอทีมช่าง — เราช่วยเลือกให้เหมาะกับหน้างานและงบประมาณ
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/about#contact" className="btn btn-primary">ขอคำปรึกษารุ่นนี้</Link>
              <Link href="/fleet-management" className="btn btn-outline">ระบบ FMS ควบคุมหลายคัน</Link>
              <Link href="/solution" className="btn btn-outline">เทคโนโลยีนำทาง</Link>
            </div>
          </div>
        </div>

        {/* รถรูปแบบอื่น */}
        <div className="mt-14">
          <h2 className="text-[20px] font-bold text-navy">รถรูปแบบอื่น</h2>
          <div className="mt-4 grid gap-4 grid-cols-2 min-[900px]:grid-cols-4">
            {others.map((o) => (
              <Link key={o.slug} href={`/vehicles/${o.slug}`} className="card p-3 block group">
                <AgvImage src={o.image} alt={o.name} ratio="4/3" sizes="(max-width: 900px) 45vw, 22vw" />
                <p className="mt-2 text-[14px] font-bold text-brand group-hover:text-navy">{o.name}</p>
                <p className="text-[12px] text-muted">{o.short}</p>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
