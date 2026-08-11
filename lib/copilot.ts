// เรียก AI ผ่าน Edge Function "ai-copilot" (ProjectOS Company — คีย์ Claude/Gemini ตั้งไว้ใน Supabase Secrets แล้ว)
// actions: summarize_deal | draft_email | analyze_pipeline | ocr_card | ask (ส่ง payload ตรงๆ)
import { supabase } from "@/lib/supabase";

export async function callCopilot(body: Record<string, unknown>): Promise<{ text?: string; provider?: string }> {
  if (!supabase) throw new Error("ยังไม่เชื่อมต่อระบบ");
  const { data, error } = await supabase.functions.invoke("ai-copilot", { body });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(String(data.error));
  return data as { text?: string; provider?: string };
}
