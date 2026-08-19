"use client";

// 📥 หน้าดาวน์โหลดสาธารณะ — Company Profile / Catalog / Brochure / Datasheet
// ข้อมูลจากตาราง downloads (แอดมินจัดการที่ /staff/master → แท็บ "ไฟล์ดาวน์โหลด")
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { company } from "@/lib/data";

type Dl = {
  id: number; title: string; title_en: string | null; category: string; description: string | null;
  file_url: string; file_name: string | null; file_size: number | null; cover_url: string | null;
  sort: number; download_count: number; created_at: string;
};

export const CATEGORY_ORDER = ["Company Profile", "Catalog", "Brochure", "Datasheet", "อื่นๆ"];
const catIcon = (c: string) =>
  c === "Company Profile" ? "🏢" : c === "Catalog" ? "📚" : c === "Brochure" ? "📄" : c === "Datasheet" ? "📐" : "📁";
const fmtSize = (n: number | null) => !n ? "" : n > 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.round(n / 1024)} KB`;
const extOf = (f: Dl) => ((f.file_name ?? f.file_url).split("?")[0].split(".").pop() ?? "").toUpperCase().slice(0, 5);

export default function DownloadsPage() {
  const [files, setFiles] = useState<Dl[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");

  useEffect(() => {
    if (!supabase) { setLoading(false); return; }
    supabase.from("downloads").select("*").eq("is_public", true).order("sort").order("created_at", { ascending: false })
      .then(({ data }) => { setFiles((data as Dl[]) ?? []); setLoading(false); });
  }, []);

  const cats = useMemo(() => {
    const present = new Set(files.map((f) => f.category));
    return CATEGORY_ORDER.filter((c) => present.has(c)).concat([...present].filter((c) => !CATEGORY_ORDER.includes(c)));
  }, [files]);

  const list = files.filter((f) =>
    (!cat || f.category === cat) &&
    (!q.trim() || [f.title, f.title_en, f.description, f.category, f.file_name].filter(Boolean).join(" ").toLowerCase().includes(q.trim().toLowerCase()))
  );

  const grouped = cats.map((c) => ({ cat: c, items: list.filter((f) => f.category === c) })).filter((g) => g.items.length);

  const download = async (f: Dl) => {
    // นับยอด (ไม่บล็อกการเปิดไฟล์)
    supabase?.rpc("bump_download", { p_id: f.id }).then(() => {});
    window.open(f.file_url, "_blank", "noopener");
  };

  return (
    <>
      <section className="bg-navy text-white">
        <div className="container-site section-pad">
          <div className="border-l-4 border-white pl-4 max-w-[70ch]">
            <p className="text-[12.5px] font-bold text-[#BFD6E9] tracking-[0.18em] uppercase">Downloads</p>
            <h1 className="mt-1 text-[32px] min-[900px]:text-[44px] leading-[1.15] font-bold text-white">ดาวน์โหลดเอกสาร</h1>
            <p className="mt-3 text-[16px] text-[#D7E6F3] leading-relaxed">Company Profile, แคตตาล็อกสินค้า, โบรชัวร์ และเอกสารข้อมูลทางเทคนิค — ดาวน์โหลดได้ฟรี ไม่ต้องลงทะเบียน</p>
          </div>
        </div>
      </section>

      <section className="section-pad bg-[#F4F7FA] min-h-[50vh]">
        <div className="container-site">
          <div className="flex flex-wrap items-center gap-2 mb-6">
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="🔍 ค้นหาเอกสาร..."
              className="rounded-xl border border-ice bg-white px-4 py-2.5 text-[14px] w-64" />
            <button onClick={() => setCat("")} className={`text-[13px] font-semibold rounded-full px-3.5 py-1.5 border transition ${!cat ? "bg-brand text-white border-brand" : "bg-white border-ice text-muted hover:border-brand"}`}>ทั้งหมด ({files.length})</button>
            {cats.map((c) => (
              <button key={c} onClick={() => setCat(c === cat ? "" : c)}
                className={`text-[13px] font-semibold rounded-full px-3.5 py-1.5 border transition ${cat === c ? "bg-brand text-white border-brand" : "bg-white border-ice text-muted hover:border-brand"}`}>
                {catIcon(c)} {c} ({files.filter((f) => f.category === c).length})
              </button>
            ))}
          </div>

          {loading && <p className="text-muted text-[14px]">กำลังโหลด...</p>}
          {!loading && files.length === 0 && (
            <div className="bg-white rounded-2xl border border-ice p-10 text-center">
              <p className="text-[40px]">📂</p>
              <p className="mt-2 font-bold text-navy">ยังไม่มีเอกสารให้ดาวน์โหลดในขณะนี้</p>
              <p className="text-[14px] text-muted mt-1">ติดต่อขอเอกสารได้ที่ {company.email} หรือ {company.phone}</p>
            </div>
          )}
          {!loading && files.length > 0 && grouped.length === 0 && <p className="text-muted text-[14px]">ไม่พบเอกสารที่ค้นหา</p>}

          <div className="space-y-10">
            {grouped.map((g) => (
              <div key={g.cat}>
                <h2 className="text-[20px] font-bold text-navy flex items-center gap-2">
                  <span>{catIcon(g.cat)}</span>{g.cat}
                  <span className="text-[13px] font-semibold text-sky">({g.items.length})</span>
                </h2>
                <div className="mt-4 grid gap-4 min-[600px]:grid-cols-2 min-[1000px]:grid-cols-3">
                  {g.items.map((f) => (
                    <div key={f.id} className="bg-white rounded-2xl border border-ice overflow-hidden hover:border-brand hover:shadow-lg transition flex flex-col">
                      <div className="aspect-[16/9] bg-ice/60 flex items-center justify-center overflow-hidden">
                        {f.cover_url
                          // eslint-disable-next-line @next/next/no-img-element
                          ? <img src={f.cover_url} alt={f.title} className="w-full h-full object-cover" />
                          : <span className="text-[44px]">{catIcon(f.category)}</span>}
                      </div>
                      <div className="p-4 flex-1 flex flex-col">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="text-[15px] font-bold text-navy leading-snug">{f.title}</h3>
                          <span className="shrink-0 text-[10px] font-bold bg-navy text-white rounded px-1.5 py-0.5">{extOf(f) || "FILE"}</span>
                        </div>
                        {f.title_en && <p className="text-[12.5px] text-sky font-semibold">{f.title_en}</p>}
                        {f.description && <p className="mt-1.5 text-[13px] text-muted leading-snug line-clamp-3">{f.description}</p>}
                        <div className="mt-auto pt-3 flex items-center justify-between gap-2">
                          <span className="text-[11.5px] text-muted/70">{[fmtSize(f.file_size), f.download_count > 0 && `${f.download_count} ดาวน์โหลด`].filter(Boolean).join(" · ")}</span>
                          <button onClick={() => download(f)} className="btn btn-primary text-[13px] py-2 px-3.5">⬇ ดาวน์โหลด</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-12 bg-white rounded-2xl border border-ice p-6 flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="font-bold text-navy">ต้องการเอกสารเพิ่มเติม หรือใบเสนอราคา?</p>
              <p className="text-[14px] text-muted">ทีมงานพร้อมส่งข้อมูลเชิงลึกและนัดสำรวจหน้างานให้ฟรี</p>
            </div>
            <Link href="/about#contact" className="btn btn-primary">ติดต่อเรา</Link>
          </div>
        </div>
      </section>
    </>
  );
}
