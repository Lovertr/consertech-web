# แผนส่งมอบระบบเว็บ/พอร์ทัล CONSERTECH ให้บริษัท (Ownership Transfer)

> บันทึกเมื่อ 19 ส.ค. 2569 — สถานะปัจจุบันและแผนการโอนกรรมสิทธิ์บริการคลาวด์จากบัญชีส่วนตัว (ตฤณ) ไปบัญชีบริษัท โดยที่ตฤณยังดูแลระบบต่อได้เหมือนเดิม

---

## 1. สถานะปัจจุบัน (ตรวจสอบจริงจากบัญชี)

| บริการ | บัญชี/องค์กร | แพลน | ค่าใช้จ่าย | หมายเหตุ |
|---|---|---|---|---|
| **Vercel** (โฮสต์เว็บ) | Team "tintaneet-8105's projects" — โปรเจกต์ `consertech-web` | **Hobby (ฟรี)** | $0 | ⚠ Vercel ระบุ Hobby ใช้ได้เฉพาะ non-commercial — เว็บบริษัทต้องขึ้น Pro |
| **Supabase** (DB/Storage/Edge Function) | Org "AI Agent โหราคม" — โปรเจกต์ `ProjectOS Company` (ref `fahrshostvjtginrnetd`) | **Pro ($25/เดือน)** ปนกับอีก 5 โปรเจกต์ส่วนตัว | ส่วนแบ่ง CONSERTECH ~$10–25 | ใบเสร็จรวมทุกโปรเจกต์ → เบิกยาก ควรแยก Org |
| **Anthropic API** (Claude Haiku/Sonnet) | บัญชีส่วนตัว — key อยู่ใน Supabase Secrets `ANTHROPIC_API_KEY` | pay-as-you-go | ~50–200 บาท/เดือน | ใช้ใน edge function `ai-copilot` |
| **Google AI (Gemini)** | บัญชีส่วนตัว — `GEMINI_API_KEY` | pay-as-you-go (มี free tier) | ~50–200 บาท/เดือน | OCR นามบัตร/ใบเสร็จ, ถอดเสียงประชุม |
| **GitHub** | repo ส่วนตัวของตฤณ | ฟรี | $0 | source code |
| **โดเมน** | บริษัทจดเอง | — | บริษัทจ่าย | ตั้ง `NEXT_PUBLIC_SITE_URL` ใน Vercel ให้ตรงโดเมนจริง (ค่าเริ่มต้นในโค้ด = https://www.cs-th.com) |
| OSRM / Nominatim / Google Calendar link / Unsplash | — | ฟรี | $0 | ไม่ต้องทำอะไร |

**ประมาณการค่าใช้จ่ายรายเดือนหลังจัดระเบียบ:** Vercel Pro $20 + Supabase Pro $25 + AI API $3–11 ≈ **$48–56 ≈ 1,700–2,000 บาท/เดือน** (ราคาตรวจ 19 ส.ค. 2569 — Vercel/Supabase/Anthropic/Google pricing pages)

---

## 2. หลักการโอน: "บริษัทเป็นเจ้าของ · ตฤณเป็นสมาชิกสิทธิ์เต็ม"

- Vercel Team และ Supabase Organization รองรับหลายสมาชิก → บริษัทสร้างบัญชีด้วยอีเมลบริษัท (แนะนำ `info@cs-th.com`) เป็น **Owner** (จ่ายเงิน/ถือกรรมสิทธิ์) แล้ว **เชิญตฤณเป็น Owner/Admin ร่วม**
- ตฤณ login บัญชีเดิม เห็นทั้งโปรเจกต์ส่วนตัวและของบริษัทในหน้าเดียว deploy/แก้ DB/ดู log ได้เหมือนเดิม
- **Claude (Cowork/Claude Code) ที่ตฤณใช้ทำงานไม่กระทบ** — เป็นบัญชี Claude ของตฤณเอง เชื่อม MCP ไป Vercel/Supabase ที่ตฤณ login อยู่ ตราบใดที่ยังเป็นสมาชิก Team/Org เครื่องมือทั้งหมด (migration, deploy edge function, ดู project) ใช้ได้เหมือนเดิม
- **AI ในระบบไม่สะดุด** — Secrets ย้ายตามโปรเจกต์ Supabase ไปด้วย แต่ควรเปลี่ยนเป็น API key ในนามบริษัท (ข้อ 3.3)
- สิ่งที่ตฤณ "เสีย" = แทบไม่มี (ยังมี source code, ยังเป็น Owner ร่วม, ยังใช้ Claude เดิม) — สิ่งเดียวคือถ้าบริษัทถอดออกจาก Team จะเข้าไม่ได้ ซึ่งคือความหมายของการที่บริษัทเป็นเจ้าของอยู่แล้ว
- สิ่งที่ได้: ไม่ต้องสำรองจ่าย/ทำเบิกทุกเดือน, ไม่มีความเสี่ยงส่วนตัวเรื่องข้อมูลลูกค้าอยู่ในบัญชีตัวเอง (PDPA), เพิ่ม/เปลี่ยนคนดูแลในอนาคตแค่เชิญเข้า Team

---

## 3. ขั้นตอนการโอน (ทำทีละส่วนได้ ไม่ต้องรีบ ไม่มี downtime)

### 3.1 Vercel
1. บริษัทสมัคร Vercel ด้วยอีเมลบริษัท → Create Team (เช่น "CONSERTECH")
2. อัปเกรด Team เป็น **Pro** ($20/เดือน) ใส่บัตรบริษัท
3. Team Settings → Members → เชิญอีเมลตฤณ role **Owner**
4. ตฤณ: ไปที่โปรเจกต์ `consertech-web` → Settings → General → **Transfer Project** → เลือก Team บริษัท (env vars, domain, deployment history ย้ายตาม ไม่ downtime)
5. หลังย้าย: ตรวจ Settings → Domains ว่าโดเมนบริษัทยังผูกอยู่ / ตรวจ Environment Variables (`NEXT_PUBLIC_SITE_URL`, Supabase URL/key ถ้ามี) / เปิดเว็บทดสอบ 1 รอบ

### 3.2 Supabase
1. บริษัทสมัคร Supabase ด้วยอีเมลบริษัท → New Organization (เช่น "CONSERTECH") → แพลน **Pro** ($25/เดือน)
2. Org Settings → Team → เชิญอีเมลตฤณ role **Owner**
3. ตฤณ: โปรเจกต์ `ProjectOS Company` → Project Settings → General → **Transfer project** → เลือก Org บริษัท
   - ย้ายทั้ง DB, Storage (bucket `attachments`), Edge Functions (`ai-copilot`), Secrets, RLS policies — **Project URL และ anon key ไม่เปลี่ยน โค้ดไม่ต้องแก้**
4. หลังย้าย: เปิดเว็บ ลอง login staff, สแกนนามบัตร 1 ใบ (ทดสอบ edge function), เปิดหน้า /downloads (ทดสอบ storage)
5. (แนะนำ) เปลี่ยนชื่อโปรเจกต์เป็น "CONSERTECH Portal" ให้สื่อความหมาย

### 3.3 API keys ของ AI → เปลี่ยนเป็นของบริษัท
1. บริษัทสมัคร **Anthropic Console** (console.anthropic.com) ด้วยอีเมลบริษัท เติมเครดิต/ผูกบัตร → สร้าง API key → ตั้ง Spend limit (เช่น $20/เดือน)
2. บริษัทสมัคร **Google AI Studio** (aistudio.google.com) → สร้าง API key ในโปรเจกต์บริษัท → ตั้ง quota/budget alert
3. ตฤณ/Claude: อัปเดต Supabase Secrets `ANTHROPIC_API_KEY` และ `GEMINI_API_KEY` (Edge Functions → Secrets หรือผ่าน CLI) — มีผลทันที ไม่ต้อง deploy ใหม่
4. ยกเลิก key เดิมของตฤณหลังยืนยันว่าระบบทำงานปกติ

### 3.4 GitHub (ไม่เร่ง)
1. บริษัทสร้าง GitHub Organization → เชิญตฤณเป็น Owner
2. โอน repo `consertech-web` เข้า Org (Settings → Danger Zone → Transfer) — Vercel จะขอ re-link repo 1 ครั้ง (Vercel Project → Settings → Git)
- หรือคง repo ไว้ที่ตฤณก่อนก็ได้ โดยเพิ่มบัญชีบริษัทเป็น collaborator

---

## 4. Checklist หลังโอนครบ

- [ ] เปิดเว็บหน้าแรก / โซลูชัน / บทความ / ดาวน์โหลด — ปกติ
- [ ] Staff login → CRM, ปฏิทิน, ใบเสนอราคา, Master — โหลดข้อมูลได้
- [ ] สแกนนามบัตร 1 ใบ (edge function + Gemini/Claude key ใหม่)
- [ ] อัปโหลดรูป/ไฟล์ 1 ไฟล์ (storage)
- [ ] Client Portal ลิงก์เดิมยังเปิดได้
- [ ] `sitemap.xml` / `robots.txt` ชี้โดเมนบริษัทถูกต้อง
- [ ] ใบเสร็จ Vercel + Supabase + Anthropic + Google ออกในนามบริษัทเดือนถัดไป

---

## 5. เรื่องค้างที่ควรทำก่อน/หลังส่งมอบ (จาก Roadmap)

- **RLS policies** ปัจจุบันเป็น demo (`demo_all_*` เปิดหมด) — ก่อนใช้จริงเต็มรูปแบบควรผูกกับ auth และจำกัดสิทธิ์ต่อตาราง
- ล้างข้อมูลทดสอบด้วยปุ่ม 🧹 ในหน้าจัดการผู้ใช้ (ลบเฉพาะ `is_demo = true`)
- Google Calendar 2-way sync (OAuth) — เฟสถัดไป ปัจจุบันเป็นลิงก์ "+GCal" ต่อรายการ
- นโยบายความเป็นส่วนตัว (PDPA) ใน footer ยังเป็นร่าง
