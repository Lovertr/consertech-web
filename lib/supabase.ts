// Supabase client — ต่อฐานข้อมูลจริง (โปรเจกต์ส่วนตัวชั่วคราว ตาม Blueprint เฟส 0 ค่อยย้ายเป็นบัญชีองค์กร)
// ถ้ายังไม่ตั้ง env (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY) ระบบ fallback เป็นข้อมูลจำลองอัตโนมัติ

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase: SupabaseClient | null = url && anon ? createClient(url, anon) : null;
