"use client";
// นับยอดเข้าชมบทความ (client-side, ไม่บล็อกการเรนเดอร์)
import { useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function ViewCounter({ slug }: { slug: string }) {
  useEffect(() => {
    if (!supabase) return;
    const key = `viewed:${slug}`;
    if (typeof sessionStorage !== "undefined" && sessionStorage.getItem(key)) return;
    supabase.rpc("bump_article_view", { p_slug: slug }).then(() => {
      try { sessionStorage.setItem(key, "1"); } catch { /* ignore */ }
    });
  }, [slug]);
  return null;
}
