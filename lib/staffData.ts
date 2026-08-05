// ─── Zone C Portal mock data ──────────────────────────────────────────
// ข้อมูลจำลองทั้งหมดสำหรับเดโม — ชื่อลูกค้า/ตัวเลข/ราคา เป็นข้อมูลสมมุติ
// รุ่นอุปกรณ์อ้างอิงจากเอกสาร Master จริง แต่ "ราคากลาง" เป็นตัวเลขสมมุติเพื่อเดโมเท่านั้น

import type { Department } from "./data";

// ── สิทธิ์ตามแผนก (ตาม Permission Matrix ใน Blueprint) ──
export type ModuleKey = "dashboard" | "crm" | "documents" | "projects" | "finance" | "master";
export type Access = "full" | "read" | "none";

export const modulesMeta: { key: ModuleKey; label: string; icon: string }[] = [
  { key: "dashboard", label: "ภาพรวม", icon: "📊" },
  { key: "crm", label: "CRM / ดีล", icon: "🤝" },
  { key: "documents", label: "เอกสารขาย", icon: "📄" },
  { key: "projects", label: "โปรเจกต์", icon: "🏗️" },
  { key: "finance", label: "การเงิน", icon: "💰" },
  { key: "master", label: "ข้อมูล Master", icon: "🗂️" },
];

export const permissions: Record<Department, Record<ModuleKey, Access>> = {
  sales:       { dashboard: "full", crm: "full", documents: "full", projects: "read", finance: "none", master: "read" },
  engineering: { dashboard: "full", crm: "read", documents: "read", projects: "full", finance: "none", master: "full" },
  pm:          { dashboard: "full", crm: "read", documents: "read", projects: "full", finance: "read", master: "read" },
  admin:       { dashboard: "full", crm: "read", documents: "read", projects: "read", finance: "full", master: "read" },
  management:  { dashboard: "full", crm: "read", documents: "full", projects: "read", finance: "read", master: "full" },
};

// ── CRM ──
export type DealStage = "lead" | "contacted" | "survey" | "quoted" | "negotiation" | "won";

export const dealStages: { key: DealStage; label: string }[] = [
  { key: "lead", label: "Lead ใหม่" },
  { key: "contacted", label: "ติดต่อแล้ว" },
  { key: "survey", label: "สำรวจหน้างาน" },
  { key: "quoted", label: "เสนอราคาแล้ว" },
  { key: "negotiation", label: "ต่อรอง" },
  { key: "won", label: "ปิดการขาย" },
];

export type Deal = {
  id: string;
  customer: string;
  industry: string;
  solution: string;
  stage: DealStage;
  value: "สูง" | "กลาง" | "เล็ก";
  owner: string;
  nextAction: string;
  activities: { date: string; type: string; note: string }[];
};

export const deals: Deal[] = [
  {
    id: "D-001", customer: "โรงงานชิ้นส่วนยานยนต์ A", industry: "ยานยนต์", solution: "Lifter AGV x3 + FMS",
    stage: "quoted", value: "สูง", owner: "ทีมขาย 1", nextAction: "Follow-up ใบเสนอราคา (พฤหัสนี้)",
    activities: [
      { date: "28 ก.ค.", type: "Lead", note: "ทักจากฟอร์มเว็บ — ลำเลียงชิ้นส่วนเข้าไลน์ประกอบ" },
      { date: "30 ก.ค.", type: "โทร", note: "คุยกับผู้จัดการโรงงาน สนใจ Lifter มุดใต้ Rack" },
      { date: "2 ส.ค.", type: "Survey", note: "สำรวจหน้างาน — ระยะทางวิ่ง 120 ม. น้ำหนัก 450 กก." },
      { date: "4 ส.ค.", type: "เอกสาร", note: "ส่งใบเสนอราคา QT-2569-014" },
    ],
  },
  {
    id: "D-002", customer: "คลังสินค้า 3PL B", industry: "โลจิสติกส์", solution: "Tugger AGV x2",
    stage: "survey", value: "กลาง", owner: "ทีมขาย 2", nextAction: "นัดสำรวจ 8 ส.ค. 10:00 (ลงปฏิทินแล้ว)",
    activities: [
      { date: "1 ส.ค.", type: "Lead", note: "ลูกค้าเดิมแนะนำต่อ" },
      { date: "3 ส.ค.", type: "Line", note: "ส่งโบรชัวร์ + วิดีโอสาธิต" },
    ],
  },
  {
    id: "D-003", customer: "โรงงานอาหาร C", industry: "อาหารและเครื่องดื่ม", solution: "Conveyor AGV",
    stage: "negotiation", value: "กลาง", owner: "ทีมขาย 1", nextAction: "เตรียมข้อเสนอแบ่งจ่าย 4 งวด",
    activities: [
      { date: "15 ก.ค.", type: "Survey", note: "พื้นที่ต้องการมาตรฐานสุขอนามัย เลือกวัสดุสแตนเลส" },
      { date: "25 ก.ค.", type: "เอกสาร", note: "ส่ง Proposal PR-2569-006 + ใบเสนอราคา" },
      { date: "3 ส.ค.", type: "ประชุม", note: "ลูกค้าขอต่อรองเงื่อนไขชำระเงิน" },
    ],
  },
  {
    id: "D-004", customer: "อิเล็กทรอนิกส์ D", industry: "อิเล็กทรอนิกส์", solution: "Unit Load x4 + FMS",
    stage: "quoted", value: "สูง", owner: "ทีมขาย 2", nextAction: "รอฝ่ายจัดซื้อลูกค้าพิจารณา (นัดถามผล 15 ส.ค.)",
    activities: [
      { date: "20 ก.ค.", type: "Survey", note: "คลีนรูม Class 10000 — สเปกล้อพิเศษ" },
      { date: "1 ส.ค.", type: "เอกสาร", note: "ส่งใบเสนอราคา QT-2569-013 + Proposal" },
    ],
  },
  {
    id: "D-005", customer: "โรงงานบรรจุภัณฑ์ E", industry: "บรรจุภัณฑ์", solution: "Pallet Jack AGV x2",
    stage: "contacted", value: "กลาง", owner: "ทีมขาย 1", nextAction: "โทรคัดกรองความต้องการ",
    activities: [{ date: "4 ส.ค.", type: "Lead", note: "สแกน QR จากงานแฟร์" }],
  },
  {
    id: "D-006", customer: "โรงงานเคมีภัณฑ์ F", industry: "เคมี", solution: "ยังไม่ระบุ",
    stage: "lead", value: "เล็ก", owner: "-", nextAction: "AI คัดกรองแล้ว: แนะนำติดต่อภายใน 24 ชม.",
    activities: [{ date: "5 ส.ค.", type: "Lead", note: "ฟอร์มเว็บ — สนใจระบบลำเลียงถังสารเคมี 200 กก." }],
  },
  {
    id: "D-007", customer: "ศูนย์กระจายสินค้า G", industry: "ค้าปลีก", solution: "Tugger + FMS (เฟส 2)",
    stage: "won", value: "สูง", owner: "ทีมขาย 2", nextAction: "ส่งมอบเฟส 1 แล้ว → เปิดโปรเจกต์ PJ-2569-03",
    activities: [{ date: "10 มิ.ย.", type: "ปิดดีล", note: "เซ็นใบสั่งขาย SO-2569-005" }],
  },
];

// ── ข้อมูล Master: สินค้า/อุปกรณ์ (รุ่นจริงจากเอกสาร Master, ราคาสมมุติ) ──
export type Product = {
  code: string;
  name: string;
  category: string;
  unit: string;
  price: number; // ราคากลางสมมุติ (เดโม)
  stock?: number;
};

export const products: Product[] = [
  { code: "SEN-001", name: "LiDAR Sensor TIM320", category: "เซนเซอร์", unit: "ตัว", price: 45000, stock: 4 },
  { code: "SEN-002", name: "PICOSCAN LOC (Localization)", category: "เซนเซอร์", unit: "ตัว", price: 120000, stock: 2 },
  { code: "SEN-003", name: "RFID Reader RFH620", category: "เซนเซอร์", unit: "ตัว", price: 32000, stock: 5 },
  { code: "SEN-004", name: "Magnetic Line Sensor MLSE-0200", category: "เซนเซอร์", unit: "ตัว", price: 18000, stock: 6 },
  { code: "MOT-001", name: "มอเตอร์ Oriental BLV-R 400W + Driver", category: "ขับเคลื่อน", unit: "ชุด", price: 38000, stock: 8 },
  { code: "MOT-002", name: "ชุดล้อขับ Differential Sub-frame", category: "ขับเคลื่อน", unit: "ชุด", price: 55000, stock: 3 },
  { code: "NET-001", name: "Wireless M360-X (AP/Station)", category: "เครือข่าย", unit: "ตัว", price: 21000, stock: 10 },
  { code: "NET-002", name: "Industrial Switch IGS-C1080", category: "เครือข่าย", unit: "ตัว", price: 8500, stock: 7 },
  { code: "PWR-001", name: "แบตเตอรี่ SWCM-500-24-LFP", category: "พลังงาน", unit: "ก้อน", price: 42000, stock: 6 },
  { code: "PLC-001", name: "PLC Mitsubishi FX5U-64MT/D", category: "ควบคุม", unit: "ตัว", price: 28000, stock: 4 },
  { code: "SAF-001", name: "Safety Laser Scanner + Bumper Set", category: "ความปลอดภัย", unit: "ชุด", price: 65000, stock: 3 },
  { code: "SVC-001", name: "ค่าออกแบบและติดตั้งระบบ (ต่อคัน)", category: "บริการ", unit: "งาน", price: 150000 },
  { code: "SVC-002", name: "ติดตั้งระบบ FMS + เครือข่าย", category: "บริการ", unit: "ระบบ", price: 250000 },
  { code: "SVC-003", name: "อบรมการใช้งาน + เอกสารคู่มือ", category: "บริการ", unit: "ครั้ง", price: 25000 },
];

export const agvModels = [
  { code: "AGV-PJ", name: "Pallet Jack / Forklift", load: "200–1,000+ กก.", drive: "Differential / Steering", status: "พร้อมขาย" },
  { code: "AGV-TG", name: "Tugger / Towing", load: "200–1,000+ กก.", drive: "Differential / Steering", status: "พร้อมขาย" },
  { code: "AGV-LU", name: "Lifter / Underride", load: "200–1,000 กก.", drive: "Differential / Quad", status: "พร้อมขาย" },
  { code: "AGV-CR", name: "Conveyor / Roller", load: "200–600 กก.", drive: "Differential", status: "พร้อมขาย" },
  { code: "AGV-UL", name: "Unit Load", load: "200–1,000 กก.", drive: "ทุกแบบ", status: "พร้อมขาย" },
];

export const docTemplates = [
  { name: "ใบเสนอราคา (Quotation)", code: "TPL-QT", updated: "ก.ค. 2569", owner: "ฝ่ายขาย" },
  { name: "Proposal เต็มรูป (เอกสารนำเสนอโครงการ)", code: "TPL-PR", updated: "ก.ค. 2569", owner: "ฝ่ายขาย" },
  { name: "Scope of Work (SOW)", code: "TPL-SOW", updated: "มิ.ย. 2569", owner: "วิศวกรรม" },
  { name: "Acceptance Test Checklist", code: "TPL-AT", updated: "มิ.ย. 2569", owner: "วิศวกรรม" },
  { name: "ใบสั่งขาย (Sales Order)", code: "TPL-SO", updated: "ก.ค. 2569", owner: "บัญชี" },
  { name: "เงื่อนไขรับประกันและบริการ", code: "TPL-WR", updated: "พ.ค. 2569", owner: "วิศวกรรม" },
];

export const knowledgeBase = [
  { topic: "AGV vs AMR และ LiDAR-Guided", source: "Master doc บทที่ 2", aiReady: true },
  { topic: "การตั้งค่า LiDAR / PICOSCAN / Virtual Line", source: "Master doc บทที่ 4.3–4.6", aiReady: true },
  { topic: "การออกแบบ Wi-Fi อุตสาหกรรม (IEEE 802.11)", source: "Master doc บทที่ 2.10", aiReady: true },
  { topic: "การคำนวณออกแบบโครงสร้างรถ 200–1,000 กก.", source: "Master doc บทที่ 6", aiReady: true },
  { topic: "โครงสร้างรหัสคำสั่งรถ + FMS", source: "Master doc บทที่ 5", aiReady: false },
];

// ── เอกสารขาย ──
export const quotations = [
  { no: "QT-2569-014", customer: "โรงงานชิ้นส่วนยานยนต์ A", total: 1985000, status: "รอลูกค้าตอบ", date: "4 ส.ค. 69", deal: "D-001" },
  { no: "QT-2569-013", customer: "อิเล็กทรอนิกส์ D", total: 3120000, status: "รอลูกค้าตอบ", date: "1 ส.ค. 69", deal: "D-004" },
  { no: "QT-2569-012", customer: "โรงงานอาหาร C", total: 890000, status: "ต่อรอง", date: "25 ก.ค. 69", deal: "D-003" },
  { no: "QT-2569-011", customer: "ศูนย์กระจายสินค้า G", total: 2450000, status: "อนุมัติ → SO-2569-005", date: "5 มิ.ย. 69", deal: "D-007" },
];

export const proposals = [
  { no: "PR-2569-007", customer: "อิเล็กทรอนิกส์ D", title: "ระบบ Unit Load AGV + FMS สำหรับคลีนรูม", status: "ส่งแล้ว", date: "1 ส.ค. 69" },
  { no: "PR-2569-006", customer: "โรงงานอาหาร C", title: "ระบบ Conveyor AGV มาตรฐานสุขอนามัย", status: "ส่งแล้ว", date: "25 ก.ค. 69" },
];

// ── โปรเจกต์ ──
export type Project = {
  code: string;
  name: string;
  customer: string;
  pm: string;
  progress: number;
  status: "ติดตั้ง" | "ทดสอบ" | "ออกแบบ" | "ส่งมอบแล้ว";
  milestones: { name: string; pct: number; done: boolean; invoice?: string }[];
  acceptance: { item: string; done: boolean }[];
};

export const projects: Project[] = [
  {
    code: "PJ-2569-01", name: "ติดตั้ง Lifter AGV x3 + FMS", customer: "โรงงาน A (ไซต์บางปะอิน)", pm: "PM 1", progress: 70, status: "ติดตั้ง",
    milestones: [
      { name: "เซ็นสัญญา + มัดจำ 30%", pct: 30, done: true, invoice: "INV-2569-021" },
      { name: "ออกแบบอนุมัติ + สั่งอุปกรณ์ 30%", pct: 30, done: true, invoice: "INV-2569-024" },
      { name: "ติดตั้งเสร็จ 30%", pct: 30, done: false },
      { name: "ผ่าน Acceptance Test 10%", pct: 10, done: false },
    ],
    acceptance: [
      { item: "รถวิ่งตามเส้นทางครบทุกจุดจอด ±10 มม.", done: true },
      { item: "ทดสอบหยุดฉุกเฉิน + Protective Field", done: true },
      { item: "FMS จ่ายงานอัตโนมัติ 3 คันพร้อมกัน", done: false },
      { item: "ทดสอบต่อเนื่อง 8 ชม. ไม่มี fault", done: false },
    ],
  },
  {
    code: "PJ-2569-02", name: "ระบบ FMS + เครือข่าย Wi-Fi", customer: "คลัง B (ไซต์แหลมฉบัง)", pm: "PM 2", progress: 85, status: "ทดสอบ",
    milestones: [
      { name: "เซ็นสัญญา + มัดจำ 40%", pct: 40, done: true, invoice: "INV-2569-019" },
      { name: "ติดตั้งเสร็จ 40%", pct: 40, done: true, invoice: "INV-2569-025" },
      { name: "ผ่าน Acceptance Test 20%", pct: 20, done: false },
    ],
    acceptance: [
      { item: "Wi-Fi ครอบคลุม 100% พื้นที่วิ่ง (site survey ยืนยัน)", done: true },
      { item: "Roaming ไม่หลุดการเชื่อมต่อขณะวิ่ง", done: true },
      { item: "ทดสอบ Failover Access Point", done: false },
    ],
  },
  {
    code: "PJ-2569-03", name: "Tugger + FMS เฟส 2", customer: "ศูนย์กระจายสินค้า G", pm: "PM 1", progress: 15, status: "ออกแบบ",
    milestones: [
      { name: "เซ็นสัญญา + มัดจำ 30%", pct: 30, done: true, invoice: "INV-2569-026" },
      { name: "ออกแบบ + สั่งอุปกรณ์ 30%", pct: 30, done: false },
      { name: "ติดตั้ง 30%", pct: 30, done: false },
      { name: "Acceptance 10%", pct: 10, done: false },
    ],
    acceptance: [{ item: "รอกำหนดร่วมกับลูกค้าในขั้นออกแบบ", done: false }],
  },
];

export const tickets = [
  { no: "TK-118", site: "ไซต์ C (ส่งมอบปีก่อน)", issue: "แก้พารามิเตอร์ LiDAR หลังลูกค้าย้ายชั้นวาง", assignee: "ทีมบริการ", due: "วันนี้", status: "กำลังทำ" },
  { no: "TK-117", site: "ไซต์ G เฟส 1", issue: "เปลี่ยนแบตเตอรี่ตามรอบ PM", assignee: "ทีมบริการ", due: "ศุกร์นี้", status: "นัดแล้ว" },
  { no: "TK-116", site: "ไซต์ B", issue: "อัปเดตเฟิร์มแวร์ M360-X", assignee: "ทีมระบบ", due: "เสร็จแล้ว", status: "ปิด" },
];

// ── การเงิน ──
export const invoices = [
  { no: "INV-2569-026", customer: "ศูนย์กระจายสินค้า G", project: "PJ-2569-03", amount: 735000, status: "ชำระแล้ว", due: "-" },
  { no: "INV-2569-025", customer: "คลัง B", project: "PJ-2569-02", amount: 980000, status: "รอชำระ", due: "8 ส.ค. 69" },
  { no: "INV-2569-024", customer: "โรงงาน A", project: "PJ-2569-01", amount: 595500, status: "ชำระแล้ว", due: "-" },
  { no: "INV-2569-021", customer: "โรงงาน A", project: "PJ-2569-01", amount: 595500, status: "ชำระแล้ว", due: "-" },
];

export const financeSummary = {
  arOutstanding: "980,000฿",
  arOverdue: "0฿",
  invoicedThisMonth: "1,715,500฿",
  nextMilestoneBilling: "PJ-2569-01 งวด 3 (รอติดตั้งเสร็จ)",
};
