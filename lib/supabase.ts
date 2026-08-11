// Supabase client — ต่อฐานข้อมูลจริง (โปรเจกต์ส่วนตัวชั่วคราว ตาม Blueprint เฟส 0 ค่อยย้ายเป็นบัญชีองค์กร)
// ค่าเริ่มต้นฝังไว้ให้ใช้งานได้ทันทีทุกที่ (anon key เป็นคีย์ฝั่งเบราว์เซอร์ เปิดเผยได้ — ความปลอดภัยจริงอยู่ที่ RLS)
// ถ้าตั้ง env NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY จะใช้ค่านั้นแทน (เช่นตอนย้ายโปรเจกต์องค์กร)

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://fahrshostvjtginrnetd.supabase.co";
const anon =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZhaHJzaG9zdHZqdGdpbnJuZXRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA5MDU1MzUsImV4cCI6MjA5NjQ4MTUzNX0.U4SMrf7nnik2fQSHO9MwP2PZTvPLC6KqSbAZeNzc-kQ";

export const supabase: SupabaseClient | null = url && anon ? createClient(url, anon) : null;
