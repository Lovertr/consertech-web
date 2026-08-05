# CONSERTECH Website (Mockup — Frontend Only)

เว็บไซต์ บริษัท คันเซอร์เทคช์ จำกัด (CONSERTECH CO., LTD.) สร้างตาม design handoff จาก Claude Design
— **เวอร์ชันนี้เป็น mockup สำหรับนำเสนอ: ข้อมูลทั้งหมดเป็น mock/dummy ยังไม่เชื่อมต่อฐานข้อมูลหรือ backend ใดๆ**

## โครงสร้าง 3 โซน

| โซน | เส้นทาง | เนื้อหา |
|---|---|---|
| A — Public | `/`, `/solution`, `/vehicles`, `/fleet-management`, `/blog`, `/about` | เว็บบริษัท, รถ AGV 5 รูปแบบ, บทความ, ฟอร์มติดต่อ |
| B — Academy | `/academy`, `/academy/login`, `/academy/courses`, `/academy/dashboard` | สมาชิก 3 ระดับ, คอร์ส 6 คอร์ส, หน้าเรียน + progress, ใบประกาศ |
| C — Staff | `/staff`, `/staff/dashboard` | Login ตามแผนก, Dashboard KPI 5 แผนก (dummy) |

## เริ่มต้นใช้งาน

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # ทดสอบ production build
```

## Stack

- Next.js (App Router) + TypeScript + Tailwind CSS v4
- ฟอนต์ Sarabun (Google Fonts) — Design tokens ทั้งหมดอยู่ใน `app/globals.css`
- ข้อมูล mock รวมไว้ที่ `lib/data.ts` ที่เดียว (แก้เนื้อหาเว็บที่ไฟล์นี้)
- Mock auth (Zone B/C) ใช้ localStorage — ดู `lib/mockAuth.tsx`

## สิ่งที่ตั้งใจให้เป็น mock (รอเฟสถัดไป)

- **รูปภาพ**: ทุกจุดใช้ `components/Placeholder.tsx` เพราะรูป AGV ชุดเดิมยังไม่ยืนยันลิขสิทธิ์
  — เมื่อได้รูปจริง วางไฟล์ใน `public/images/` แล้วเปลี่ยน `<Placeholder>` เป็น `next/image`
- **ฟอร์มติดต่อ / Login**: UI เท่านั้น ยังไม่ต่อ backend/validation
- **i18n**: สลับ TH/EN ได้เฉพาะเมนู + hero (`lib/i18n.tsx`) — รอคำแปลเต็มแล้วย้ายไป next-intl
- **KPI Zone C**: dummy ทั้งหมด + มี department switcher ไว้เดโม (production ต้องผูก role จริงและลบ switcher)
- **ราคาคอร์ส Premium**: placeholder ("เร็วๆ นี้") ตามการตัดสินใจที่ยังค้างอยู่
- **ห้ามเพิ่ม**: ราคาสินค้า/ใบเสนอราคาจากเอกสารภายใน

## แผนเฟสถัดไป (เมื่อมีเซิร์ฟเวอร์/คลาวด์)

1. Supabase: Auth (member + staff แยก role), ตาราง courses/lessons/progress/certificates, CMS blog & vehicles
2. Contact form → อีเมล/CRM + แจ้งเตือน Line
3. i18n เต็มรูปแบบ + คำแปล EN ที่ผ่านการรีวิว
4. เปลี่ยนรูป placeholder เป็นรูปจริงที่มีสิทธิ์ใช้งาน
5. Deploy บน Vercel + โดเมนจริง + Analytics
