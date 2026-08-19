// บทความจาก DB (CMS) — ใช้ทั้งฝั่ง server (SEO/metadata) และ client
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://fahrshostvjtginrnetd.supabase.co";
const anon =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZhaHJzaG9zdHZqdGdpbnJuZXRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA5MDU1MzUsImV4cCI6MjA5NjQ4MTUzNX0.U4SMrf7nnik2fQSHO9MwP2PZTvPLC6KqSbAZeNzc-kQ";

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.cs-th.com";

export type Article = {
  id: number; slug: string; title: string; excerpt: string | null; tag: string | null;
  solution_id: string | null; solution_item: string | null; cover_url: string | null; cover_alt: string | null;
  body_md: string; diagram_svg: string | null; seo_title: string | null; seo_description: string | null;
  keywords: string[]; status: string; published_at: string | null; author: string | null; view_count: number;
  created_at: string; updated_at: string;
};

// server-side client (ไม่ persist session) — เรียกได้จาก Server Components
function sb() {
  return createClient(url, anon, { auth: { persistSession: false } });
}

export async function getPublishedArticles(): Promise<Article[]> {
  const { data } = await sb().from("articles").select("*").eq("status", "published").order("published_at", { ascending: false });
  return (data as Article[]) ?? [];
}

export async function getArticle(slug: string): Promise<Article | null> {
  const { data } = await sb().from("articles").select("*").eq("slug", slug).eq("status", "published").maybeSingle();
  return (data as Article | null) ?? null;
}

// ── Markdown → HTML แบบเบา (หัวข้อ, รายการ, ตัวหนา, ลิงก์, รูป, ย่อหน้า) — พอสำหรับบทความ ปลอดภัย (escape ก่อน) ──
function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function inline(s: string) {
  let t = esc(s);
  t = t.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, '<img src="$2" alt="$1" loading="lazy" class="rounded-2xl border border-ice my-4 w-full" />');
  t = t.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_m, a, b) => `<a href="${b}" class="text-brand font-semibold underline underline-offset-2 hover:text-navy"${/^https?:/.test(b) ? ' target="_blank" rel="noopener noreferrer"' : ""}>${a}</a>`);
  t = t.replace(/\*\*([^*]+)\*\*/g, "<strong class=\"font-bold text-navy\">$1</strong>");
  t = t.replace(/`([^`]+)`/g, '<code class="bg-ice rounded px-1.5 py-0.5 text-[0.9em]">$1</code>');
  return t;
}
export function mdToHtml(md: string): string {
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const out: string[] = [];
  let list: "ul" | "ol" | null = null;
  let para: string[] = [];
  const flushPara = () => { if (para.length) { out.push(`<p>${inline(para.join(" "))}</p>`); para = []; } };
  const closeList = () => { if (list) { out.push(`</${list}>`); list = null; } };
  for (const raw of lines) {
    const line = raw.trimEnd();
    if (!line.trim()) { flushPara(); closeList(); continue; }
    const h = line.match(/^\s*(#{1,4})\s+(.*)$/);
    if (h) { flushPara(); closeList(); const lv = Math.min(h[1].length + 1, 4); out.push(`<h${lv} id="${esc(h[2]).toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "-")}">${inline(h[2])}</h${lv}>`); continue; }
    const ul = line.match(/^\s*[-•]\s+(.*)$/);
    const ol = line.match(/^\s*(\d+)[.)]\s+(.*)$/);
    if (ul || ol) {
      flushPara();
      const kind = ul ? "ul" : "ol";
      if (list !== kind) { closeList(); list = kind; out.push(`<${kind}>`); }
      out.push(`<li>${inline(ul ? ul[1] : ol![2])}</li>`);
      continue;
    }
    if (/^>\s?/.test(line)) { flushPara(); closeList(); out.push(`<blockquote>${inline(line.replace(/^>\s?/, ""))}</blockquote>`); continue; }
    closeList();
    para.push(line.trim());
  }
  flushPara(); closeList();
  return out.join("\n");
}

// แยกย่อหน้าแรกออกมา เพื่อแทรกไดอะแกรมหลังจากนั้น
export function splitLead(md: string): [string, string] {
  const parts = md.replace(/\r\n/g, "\n").split(/\n\s*\n/);
  return [parts[0] ?? "", parts.slice(1).join("\n\n")];
}

export const fmtDateTh = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("th-TH", { day: "numeric", month: "long", year: "numeric" }) : "";
