"use client";

// 📝 บทความเว็บไซต์ (CMS) — สร้าง/แก้ไข/เผยแพร่บทความที่แสดงบน /blog และลิงก์จากการ์ดโซลูชัน
// เนื้อหาเป็น Markdown ง่ายๆ + ไดอะแกรม SVG (ไม่บังคับ) + ภาพปก + ช่อง SEO
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import StaffShell, { useDept } from "@/components/staff/StaffShell";
import { supabase } from "@/lib/supabase";
import { industry40 } from "@/lib/data";
import { mdToHtml, splitLead, type Article } from "@/lib/articles";

const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-+|-+$/g, "").slice(0, 80);

const empty = (): Partial<Article> => ({
  slug: "", title: "", excerpt: "", tag: "โซลูชัน", solution_id: null, solution_item: null,
  cover_url: null, cover_alt: "", body_md: "", diagram_svg: null, seo_title: "", seo_description: "",
  keywords: [], status: "draft", author: "ทีมวิศวกร CONSERTECH",
});

function ContentBody() {
  const { empId, access } = useDept();
  const readOnly = access("content") === "read";
  const [rows, setRows] = useState<Article[]>([]);
  const [q, setQ] = useState("");
  const [filt, setFilt] = useState<"all" | "published" | "draft">("all");
  const [editing, setEditing] = useState<Partial<Article> | null>(null);
  const [kwText, setKwText] = useState("");
  const [tab, setTab] = useState<"edit" | "preview">("edit");
  const [busy, setBusy] = useState(false); const [msg, setMsg] = useState("");
  const coverRef = useRef<HTMLInputElement>(null); const imgRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  const load = useCallback(async () => {
    if (!supabase) return;
    const { data } = await supabase.from("articles").select("*").order("updated_at", { ascending: false });
    setRows((data as Article[]) ?? []);
  }, []);
  useEffect(() => { load(); }, [load]);

  const list = rows.filter((r) => (filt === "all" || r.status === filt) &&
    (!q.trim() || (r.title + " " + (r.excerpt ?? "") + " " + r.slug + " " + (r.solution_item ?? "")).toLowerCase().includes(q.trim().toLowerCase())));

  const openNew = () => { setEditing(empty()); setKwText(""); setTab("edit"); setMsg(""); };
  const openEdit = (a: Article) => { setEditing({ ...a }); setKwText((a.keywords ?? []).join(", ")); setTab("edit"); setMsg(""); };
  const set = (patch: Partial<Article>) => setEditing((e) => (e ? { ...e, ...patch } : e));

  const uploadTo = async (file: File, folder: string) => {
    if (!supabase) throw new Error("no db");
    const safe = file.name.replace(/[^A-Za-z0-9._-]+/g, "_");
    const path = `${folder}/${Date.now()}-${safe}`;
    const { error } = await supabase.storage.from("attachments").upload(path, file, { contentType: file.type || undefined });
    if (error) throw error;
    return supabase.storage.from("attachments").getPublicUrl(path).data.publicUrl;
  };
  const pickCover = async (f: File) => {
    setBusy(true); try { set({ cover_url: await uploadTo(f, "articles") }); } catch (e) { setMsg("⚠ อัปโหลดรูปปกไม่สำเร็จ: " + String((e as Error).message ?? e)); } finally { setBusy(false); }
  };
  const insertImage = async (f: File) => {
    setBusy(true);
    try {
      const url = await uploadTo(f, "articles/inline");
      const ta = bodyRef.current; const md = editing?.body_md ?? "";
      const pos = ta ? ta.selectionStart : md.length;
      const snippet = `\n\n![${f.name.replace(/\.[^.]+$/, "")}](${url})\n\n`;
      set({ body_md: md.slice(0, pos) + snippet + md.slice(pos) });
    } catch (e) { setMsg("⚠ แทรกรูปไม่สำเร็จ: " + String((e as Error).message ?? e)); } finally { setBusy(false); }
  };

  const save = async (publish?: boolean) => {
    if (!supabase || !editing) return;
    const title = (editing.title ?? "").trim();
    if (!title) { setMsg("⚠ กรุณาใส่ชื่อบทความ"); return; }
    const slug = (editing.slug ?? "").trim() || slugify(title);
    if (!slug) { setMsg("⚠ กรุณาใส่ slug (ตัวอักษรอังกฤษ/ตัวเลข/ขีดกลาง)"); return; }
    setBusy(true); setMsg("");
    const status = publish === undefined ? (editing.status ?? "draft") : publish ? "published" : "draft";
    const row = {
      slug, title, excerpt: (editing.excerpt ?? "").trim() || null, tag: (editing.tag ?? "").trim() || null,
      solution_id: editing.solution_id || null, solution_item: editing.solution_item || null,
      cover_url: editing.cover_url || null, cover_alt: (editing.cover_alt ?? "").trim() || title,
      body_md: editing.body_md ?? "", diagram_svg: (editing.diagram_svg ?? "").trim() || null,
      seo_title: (editing.seo_title ?? "").trim() || null, seo_description: (editing.seo_description ?? "").trim() || null,
      keywords: kwText.split(",").map((s) => s.trim()).filter(Boolean),
      status, author: (editing.author ?? "").trim() || "ทีมวิศวกร CONSERTECH",
      published_at: status === "published" ? (editing.published_at ?? new Date().toISOString()) : editing.published_at ?? null,
      updated_at: new Date().toISOString(),
    };
    const r = editing.id
      ? await supabase.from("articles").update(row).eq("id", editing.id)
      : await supabase.from("articles").insert({ ...row, created_by: empId || null });
    setBusy(false);
    if (r.error) { setMsg("⚠ " + (r.error.message.includes("duplicate") ? `slug "${slug}" ซ้ำกับบทความอื่น` : r.error.message)); return; }
    setMsg(status === "published" ? "✅ เผยแพร่แล้ว — หน้าเว็บอัปเดตภายใน ~5 นาที" : "✅ บันทึกร่างแล้ว");
    await load();
    if (!editing.id) { const { data } = await supabase.from("articles").select("*").eq("slug", slug).maybeSingle(); if (data) setEditing(data as Article); }
    else set({ status });
  };
  const remove = async (a: Article) => {
    if (!supabase) return;
    if (!confirm(`ลบบทความ "${a.title}"? (ย้อนกลับไม่ได้)`)) return;
    await supabase.from("articles").delete().eq("id", a.id);
    setEditing(null); load();
  };
  const duplicate = (a: Article) => {
    setEditing({ ...a, id: undefined, slug: a.slug + "-copy", title: a.title + " (สำเนา)", status: "draft", published_at: null, view_count: 0 });
    setKwText((a.keywords ?? []).join(", ")); setTab("edit"); setMsg("");
  };

  const group = industry40.find((g) => g.id === editing?.solution_id);
  const previewHtml = useMemo(() => {
    if (!editing) return "";
    const [lead, rest] = splitLead(editing.body_md ?? "");
    return `${mdToHtml(lead)}${editing.diagram_svg ? `<div class="my-6 rounded-2xl border border-ice overflow-hidden [&>svg]:w-full [&>svg]:h-auto">${editing.diagram_svg}</div>` : ""}${mdToHtml(rest)}`;
  }, [editing]);

  if (!supabase) return <p className="text-[13px] text-muted bg-ice/50 rounded-lg px-3 py-2 inline-block">⚠ ยังไม่ได้เชื่อมต่อฐานข้อมูล</p>;

  return (
    <>
      {editing ? (
        <div className="card-white p-5 border-2 border-brand/30">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-bold text-navy text-[15px]">{editing.id ? "✎ แก้ไขบทความ" : "＋ บทความใหม่"}
              {editing.id && <span className={`ml-2 text-[10.5px] font-bold rounded px-1.5 py-0.5 ${editing.status === "published" ? "bg-[#2E9E5B]/15 text-[#2E9E5B]" : "bg-amber/15 text-[#9A6A10]"}`}>{editing.status === "published" ? "เผยแพร่แล้ว" : "ร่าง"}</span>}
            </p>
            <div className="flex gap-1 bg-ice rounded-lg p-0.5">
              {(["edit", "preview"] as const).map((t) => (
                <button key={t} onClick={() => setTab(t)} className={`px-3 py-1 rounded-md text-[12px] font-semibold ${tab === t ? "bg-white text-navy shadow-sm" : "text-muted"}`}>{t === "edit" ? "แก้ไข" : "พรีวิว"}</button>
              ))}
            </div>
          </div>

          {tab === "edit" ? (
            <div className="mt-3 grid gap-3 min-[1000px]:grid-cols-[1fr_320px]">
              {/* คอลัมน์หลัก */}
              <div className="space-y-3">
                <div>
                  <label className="text-[11.5px] font-bold text-muted">ชื่อบทความ (H1) *</label>
                  <input value={editing.title ?? ""} onChange={(e) => { const v = e.target.value; set({ title: v, ...(editing.id ? {} : { slug: slugify(v) }) }); }} disabled={readOnly}
                    className="mt-1 w-full rounded-lg border border-ice px-3 py-2 text-[14px] font-semibold" />
                </div>
                <div>
                  <label className="text-[11.5px] font-bold text-muted">คำโปรย (แสดงในการ์ดและใต้หัวข้อ — 1–2 ประโยค)</label>
                  <textarea value={editing.excerpt ?? ""} onChange={(e) => set({ excerpt: e.target.value })} rows={2} disabled={readOnly}
                    className="mt-1 w-full rounded-lg border border-ice px-3 py-2 text-[13px]" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <label className="text-[11.5px] font-bold text-muted">เนื้อหา (Markdown) — <code className="bg-ice px-1 rounded">## หัวข้อ</code> <code className="bg-ice px-1 rounded">- รายการ</code> <code className="bg-ice px-1 rounded">1. ลำดับ</code> <code className="bg-ice px-1 rounded">**ตัวหนา**</code> <code className="bg-ice px-1 rounded">[ลิงก์](/solution)</code></label>
                    {!readOnly && (
                      <>
                        <input ref={imgRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) insertImage(f); e.target.value = ""; }} />
                        <button onClick={() => imgRef.current?.click()} disabled={busy} className="text-[11.5px] font-semibold text-sky hover:text-brand">🖼 แทรกรูปในเนื้อหา</button>
                      </>
                    )}
                  </div>
                  <textarea ref={bodyRef} value={editing.body_md ?? ""} onChange={(e) => set({ body_md: e.target.value })} rows={22} disabled={readOnly}
                    className="mt-1 w-full rounded-lg border border-ice px-3 py-2 text-[13px] font-mono leading-relaxed" />
                  <p className="text-[11px] text-muted/70 mt-1">เคล็ดลับ: ย่อหน้าแรกจะแสดงก่อนไดอะแกรม แล้วเนื้อหาที่เหลือต่อจากไดอะแกรม</p>
                </div>
                <div>
                  <label className="text-[11.5px] font-bold text-muted">ไดอะแกรม SVG (ไม่บังคับ — วางโค้ด &lt;svg&gt;...&lt;/svg&gt;)</label>
                  <textarea value={editing.diagram_svg ?? ""} onChange={(e) => set({ diagram_svg: e.target.value })} rows={4} disabled={readOnly}
                    className="mt-1 w-full rounded-lg border border-ice px-3 py-2 text-[11.5px] font-mono" />
                </div>
              </div>

              {/* แถบข้าง: ผูกโซลูชัน / ปก / SEO */}
              <div className="space-y-3">
                <div className="rounded-xl border border-ice p-3 bg-ice/30">
                  <p className="text-[12px] font-bold text-navy">🔗 ผูกกับโซลูชัน (การ์ดในหน้าโซลูชัน/หน้าแรกจะลิงก์มาบทความนี้)</p>
                  <select value={editing.solution_id ?? ""} onChange={(e) => set({ solution_id: e.target.value || null, solution_item: null })} disabled={readOnly}
                    className="mt-2 w-full rounded-lg border border-ice px-2.5 py-1.5 text-[12.5px] bg-white">
                    <option value="">— ไม่ผูก (บทความทั่วไป) —</option>
                    {industry40.map((g) => <option key={g.id} value={g.id}>{g.icon} {g.en}</option>)}
                  </select>
                  {group && (
                    <select value={editing.solution_item ?? ""} onChange={(e) => set({ solution_item: e.target.value || null })} disabled={readOnly}
                      className="mt-2 w-full rounded-lg border border-ice px-2.5 py-1.5 text-[12.5px] bg-white">
                      <option value="">— ระบบย่อย (เลือกเพื่อลิงก์จากการ์ด) —</option>
                      {group.items.map((it) => {
                        const taken = rows.find((r) => r.solution_id === group.id && r.solution_item === it.en && r.id !== editing.id);
                        return <option key={it.en} value={it.en}>{it.en}{taken ? ` (มีบทความแล้ว: ${taken.title.slice(0, 20)}…)` : ""}</option>;
                      })}
                    </select>
                  )}
                </div>
                <div className="rounded-xl border border-ice p-3">
                  <p className="text-[12px] font-bold text-navy">🖼 ภาพปก (แนะนำ 1200×675)</p>
                  {editing.cover_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={editing.cover_url} alt="" className="mt-2 w-full aspect-[16/9] object-cover rounded-lg border border-ice" />
                  )}
                  {!readOnly && (
                    <div className="mt-2 flex flex-wrap gap-2 items-center">
                      <input ref={coverRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) pickCover(f); e.target.value = ""; }} />
                      <button onClick={() => coverRef.current?.click()} disabled={busy} className="btn btn-outline text-[12px] py-1.5 px-3">{editing.cover_url ? "เปลี่ยนรูป" : "อัปโหลดรูป"}</button>
                      {editing.cover_url && <button onClick={() => set({ cover_url: null })} className="text-[11.5px] text-muted hover:text-[#D94141]">ลบรูป</button>}
                    </div>
                  )}
                  <input value={editing.cover_url ?? ""} onChange={(e) => set({ cover_url: e.target.value || null })} placeholder="หรือวาง URL รูป" disabled={readOnly}
                    className="mt-2 w-full rounded-lg border border-ice px-2.5 py-1.5 text-[11.5px]" />
                  <input value={editing.cover_alt ?? ""} onChange={(e) => set({ cover_alt: e.target.value })} placeholder="Alt text (SEO) — อธิบายรูป" disabled={readOnly}
                    className="mt-2 w-full rounded-lg border border-ice px-2.5 py-1.5 text-[11.5px]" />
                </div>
                <div className="rounded-xl border border-ice p-3">
                  <p className="text-[12px] font-bold text-navy">🔍 SEO</p>
                  <label className="mt-2 block text-[11px] font-bold text-muted">Slug (URL) — /blog/…</label>
                  <input value={editing.slug ?? ""} onChange={(e) => set({ slug: slugify(e.target.value) })} disabled={readOnly}
                    className="mt-1 w-full rounded-lg border border-ice px-2.5 py-1.5 text-[12px] font-mono" />
                  <label className="mt-2 block text-[11px] font-bold text-muted">SEO Title (≤ 60 ตัวอักษร) <span className="text-muted/60">{(editing.seo_title ?? "").length}</span></label>
                  <input value={editing.seo_title ?? ""} onChange={(e) => set({ seo_title: e.target.value })} placeholder="ว่าง = ใช้ชื่อบทความ" disabled={readOnly}
                    className="mt-1 w-full rounded-lg border border-ice px-2.5 py-1.5 text-[12px]" />
                  <label className="mt-2 block text-[11px] font-bold text-muted">Meta Description (≤ 158) <span className={`${(editing.seo_description ?? "").length > 158 ? "text-[#D94141]" : "text-muted/60"}`}>{(editing.seo_description ?? "").length}</span></label>
                  <textarea value={editing.seo_description ?? ""} onChange={(e) => set({ seo_description: e.target.value })} rows={3} placeholder="ว่าง = ใช้คำโปรย" disabled={readOnly}
                    className="mt-1 w-full rounded-lg border border-ice px-2.5 py-1.5 text-[12px]" />
                  <label className="mt-2 block text-[11px] font-bold text-muted">Keywords (คั่นด้วย ,)</label>
                  <input value={kwText} onChange={(e) => setKwText(e.target.value)} placeholder="AGV, AMR, คลังสินค้าอัตโนมัติ" disabled={readOnly}
                    className="mt-1 w-full rounded-lg border border-ice px-2.5 py-1.5 text-[12px]" />
                  <label className="mt-2 block text-[11px] font-bold text-muted">หมวด / ผู้เขียน</label>
                  <div className="mt-1 flex gap-2">
                    <input value={editing.tag ?? ""} onChange={(e) => set({ tag: e.target.value })} placeholder="โซลูชัน" disabled={readOnly} className="flex-1 min-w-0 rounded-lg border border-ice px-2.5 py-1.5 text-[12px]" />
                    <input value={editing.author ?? ""} onChange={(e) => set({ author: e.target.value })} disabled={readOnly} className="flex-1 min-w-0 rounded-lg border border-ice px-2.5 py-1.5 text-[12px]" />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-3 rounded-xl border border-ice p-5 bg-white">
              {editing.cover_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={editing.cover_url} alt="" className="w-full max-w-[720px] aspect-[16/9] object-cover rounded-2xl border border-ice mb-5" />
              )}
              <h1 className="text-[28px] font-bold text-navy leading-tight">{editing.title || "(ชื่อบทความ)"}</h1>
              {editing.excerpt && <p className="mt-2 text-muted">{editing.excerpt}</p>}
              <div className="prose-article mt-6 max-w-[780px]" dangerouslySetInnerHTML={{ __html: previewHtml }} />
            </div>
          )}

          {msg && <p className={`mt-3 text-[12.5px] font-semibold ${msg.startsWith("✅") ? "text-[#2E9E5B]" : "text-[#D94141]"}`}>{msg}</p>}
          <div className="mt-3 flex flex-wrap gap-2 items-center">
            {!readOnly && (
              <>
                <button onClick={() => save(true)} disabled={busy} className="btn btn-primary text-[13px] py-2 px-4 disabled:opacity-50">{busy ? "⏳..." : "🚀 เผยแพร่"}</button>
                <button onClick={() => save(false)} disabled={busy} className="btn btn-outline text-[13px] py-2 px-4 disabled:opacity-50">💾 บันทึกร่าง</button>
              </>
            )}
            <button onClick={() => setEditing(null)} className="btn btn-outline text-[13px] py-2 px-4">ปิด</button>
            {editing.id && editing.status === "published" && (
              <a href={`/blog/${editing.slug}`} target="_blank" rel="noreferrer" className="text-[12.5px] font-semibold text-sky hover:text-brand">↗ เปิดดูบนเว็บ</a>
            )}
            {editing.id && !readOnly && (
              <button onClick={() => remove(editing as Article)} className="ml-auto text-[12.5px] font-semibold text-[#D94141]/70 hover:text-[#D94141]">🗑 ลบบทความ</button>
            )}
          </div>
        </div>
      ) : (
        <div className="card-white overflow-hidden">
          <div className="flex flex-wrap justify-between items-center gap-2 px-5 pt-4 pb-3">
            <div>
              <p className="font-bold text-navy">บทความเว็บไซต์ <span className="text-sky text-[13px]">({rows.length})</span></p>
              <p className="text-[11.5px] text-muted">แสดงที่ <a href="/blog" target="_blank" className="text-brand font-semibold hover:underline">/blog</a> และลิงก์จากการ์ดโซลูชัน — เผยแพร่แล้วอัปเดตบนเว็บภายใน ~5 นาที</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="🔍 ค้นหา..." className="rounded-lg border border-ice px-3 py-1.5 text-[12.5px] w-44" />
              <select value={filt} onChange={(e) => setFilt(e.target.value as typeof filt)} className="rounded-lg border border-ice px-2.5 py-1.5 text-[12.5px] bg-white">
                <option value="all">ทั้งหมด</option><option value="published">เผยแพร่แล้ว</option><option value="draft">ร่าง</option>
              </select>
              {!readOnly && <button onClick={openNew} className="btn btn-primary text-[12.5px] py-1.5 px-3">＋ บทความใหม่</button>}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-[13px]">
              <thead>
                <tr className="bg-ice/70 text-navy">
                  <th className="text-left px-4 py-2.5 font-bold w-20">ปก</th>
                  <th className="text-left px-3 py-2.5 font-bold">บทความ</th>
                  <th className="text-left px-3 py-2.5 font-bold">โซลูชัน</th>
                  <th className="text-right px-3 py-2.5 font-bold">อ่าน</th>
                  <th className="text-center px-3 py-2.5 font-bold">สถานะ</th>
                  <th className="text-left px-3 py-2.5 font-bold">อัปเดต</th>
                  <th className="px-3 py-2.5 text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {list.map((a, i) => {
                  const g = industry40.find((x) => x.id === a.solution_id);
                  return (
                    <tr key={a.id} className={i % 2 ? "bg-ice/30" : ""}>
                      <td className="px-4 py-2">
                        {a.cover_url
                          // eslint-disable-next-line @next/next/no-img-element
                          ? <img src={a.cover_url} alt="" className="w-16 h-10 rounded object-cover border border-ice" />
                          : <div className="w-16 h-10 rounded bg-ice/70 flex items-center justify-center">{g?.icon ?? "📄"}</div>}
                      </td>
                      <td className="px-3 py-2">
                        <button onClick={() => openEdit(a)} className="text-left font-semibold text-navy hover:text-brand leading-snug">{a.title}</button>
                        <p className="text-[11px] text-muted/70 font-mono">/blog/{a.slug}</p>
                      </td>
                      <td className="px-3 py-2 text-[12px] text-muted">{g ? <>{g.icon} {g.en}<br /><span className="text-[11px]">{a.solution_item ?? ""}</span></> : "—"}</td>
                      <td className="px-3 py-2 text-right text-muted">{a.view_count}</td>
                      <td className="px-3 py-2 text-center">
                        <span className={`text-[10.5px] font-bold rounded px-1.5 py-0.5 ${a.status === "published" ? "bg-[#2E9E5B]/15 text-[#2E9E5B]" : "bg-amber/15 text-[#9A6A10]"}`}>{a.status === "published" ? "เผยแพร่" : "ร่าง"}</span>
                      </td>
                      <td className="px-3 py-2 text-[12px] text-muted whitespace-nowrap">{new Date(a.updated_at).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "2-digit" })}</td>
                      <td className="px-3 py-2 text-right whitespace-nowrap">
                        <button onClick={() => openEdit(a)} className="text-[12px] font-semibold text-brand hover:text-navy px-1.5">{readOnly ? "ดู" : "แก้ไข"}</button>
                        {!readOnly && <button onClick={() => duplicate(a)} className="text-[12px] font-semibold text-sky hover:text-navy px-1.5" title="ทำสำเนาเป็นร่างใหม่">สำเนา</button>}
                        {a.status === "published" && <a href={`/blog/${a.slug}`} target="_blank" rel="noreferrer" className="text-[12px] font-semibold text-muted hover:text-brand px-1.5">↗</a>}
                      </td>
                    </tr>
                  );
                })}
                {list.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-muted/70 text-[12.5px]">ไม่พบบทความ</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}

export default function ContentPage() {
  return (
    <StaffShell title="บทความเว็บไซต์">
      <ContentBody />
    </StaffShell>
  );
}
