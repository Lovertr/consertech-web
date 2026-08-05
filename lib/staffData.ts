// ─── Zone C Portal mock data ──────────────────────────────────────────
// ข้อมูลจำลองทั้งหมดสำหรับเดโม — ชื่อลูกค้า/ตัวเลข/ราคา เป็นข้อมูลสมมุติ
// รุ่นอุปกรณ์อ้างอิงจากเอกสาร Master จริง แต่ "ราคากลาง" เป็นตัวเลขสมมุติเพื่อเดโมเท่านั้น

import type { Department } from "./data";

// ── สิทธิ์ตามแผนก (ตาม Permission Matrix ใน Blueprint) ──
export type ModuleKey =
  | "dashboard" | "crm" | "documents" | "clients" | "projects" | "tasks"
  | "meetings" | "expenses" | "leave" | "kpi" | "finance" | "master";
export type Access = "full" | "read" | "none";

export const modulesMeta: { key: ModuleKey; label: string; icon: string }[] = [
  { key: "dashboard", label: "ภาพรวม", icon: "📊" },
  { key: "crm", label: "CRM / ดีล", icon: "🤝" },
  { key: "documents", label: "เอกสารขาย", icon: "📄" },
  { key: "clients", label: "สื่อสารลูกค้า", icon: "💬" },
  { key: "projects", label: "โปรเจกต์", icon: "🏗️" },
  { key: "tasks", label: "งานของทีม", icon: "✅" },
  { key: "meetings", label: "ประชุม / บันทึกเสียง", icon: "🎙️" },
  { key: "expenses", label: "เบิกค่าใช้จ่าย", icon: "🚗" },
  { key: "leave", label: "การลา", icon: "🌴" },
  { key: "kpi", label: "KPI / ประเมินผล", icon: "🎯" },
  { key: "finance", label: "การเงิน", icon: "💰" },
  { key: "master", label: "ข้อมูล Master", icon: "🗂️" },
];

export const permissions: Record<Department, Record<ModuleKey, Access>> = {
  sales:       { dashboard: "full", crm: "full", documents: "full", clients: "full", projects: "read", tasks: "full", meetings: "full", expenses: "full", leave: "full", kpi: "full", finance: "none", master: "read" },
  engineering: { dashboard: "full", crm: "read", documents: "read", clients: "read", projects: "full", tasks: "full", meetings: "full", expenses: "full", leave: "full", kpi: "full", finance: "none", master: "full" },
  pm:          { dashboard: "full", crm: "read", documents: "read", clients: "full", projects: "full", tasks: "full", meetings: "full", expenses: "full", leave: "full", kpi: "full", finance: "read", master: "read" },
  admin:       { dashboard: "full", crm: "read", documents: "read", clients: "none", projects: "read", tasks: "full", meetings: "full", expenses: "full", leave: "full", kpi: "full", finance: "full", master: "read" },
  management:  { dashboard: "full", crm: "read", documents: "full", clients: "read", projects: "read", tasks: "full", meetings: "full", expenses: "full", leave: "full", kpi: "full", finance: "read", master: "full" },
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

// ── เบิกค่าใช้จ่าย/เดินทาง (ดัดแปลงจาก personal-vehicle-requests ของ tomas-tech-pm) ──
// CONSERTECH ใช้รถส่วนตัว ยังไม่มีรถบริษัท → เบิกตามกิโลเมตร
export const expensePolicy = {
  kmRate: 5, // บาท/กม. สำหรับรถส่วนตัว (ตัวเลขสมมุติ — บริษัทกำหนดจริงภายหลัง)
  note: "บริษัทยังไม่มีรถส่วนกลาง — พนักงานใช้รถส่วนตัวเบิกตามระยะทางจริง + ค่าทางด่วน/ที่จอดตามใบเสร็จ",
  categories: ["ค่าเดินทาง (รถส่วนตัว/กม.)", "ค่าทางด่วน", "ค่าที่จอดรถ", "ค่าที่พัก (ค้างคืนหน้างาน)", "ค่าเบี้ยเลี้ยง", "อื่นๆ"],
};

export type ExpenseClaim = {
  no: string;
  employee: string;
  dept: string;
  purpose: string;
  ref: string; // ดีล/โปรเจกต์อ้างอิง
  date: string;
  km?: number;
  items: { label: string; amount: number }[];
  status: "ร่าง" | "รออนุมัติ" | "อนุมัติแล้ว" | "จ่ายแล้ว";
};

export const expenseClaims: ExpenseClaim[] = [
  {
    no: "EXP-2569-042", employee: "ทีมขาย 1", dept: "Sales", purpose: "Site Survey โรงงานชิ้นส่วนยานยนต์ A (บางปะอิน)",
    ref: "D-001", date: "2 ส.ค. 69", km: 142,
    items: [{ label: "รถส่วนตัว 142 กม. × 5฿", amount: 710 }, { label: "ค่าทางด่วน", amount: 190 }],
    status: "รออนุมัติ",
  },
  {
    no: "EXP-2569-041", employee: "ทีมวิศวกร 2", dept: "Engineering", purpose: "ติดตั้งระบบไซต์คลัง B (แหลมฉบัง) 2 วัน",
    ref: "PJ-2569-02", date: "30–31 ก.ค. 69", km: 296,
    items: [{ label: "รถส่วนตัว 296 กม. × 5฿", amount: 1480 }, { label: "ค่าทางด่วน", amount: 240 }, { label: "ที่พัก 1 คืน", amount: 850 }, { label: "เบี้ยเลี้ยง 2 วัน", amount: 600 }],
    status: "อนุมัติแล้ว",
  },
  {
    no: "EXP-2569-040", employee: "PM 1", dept: "PM", purpose: "ประชุม Kickoff ศูนย์กระจายสินค้า G",
    ref: "PJ-2569-03", date: "25 ก.ค. 69", km: 68,
    items: [{ label: "รถส่วนตัว 68 กม. × 5฿", amount: 340 }, { label: "ค่าที่จอดรถ", amount: 60 }],
    status: "จ่ายแล้ว",
  },
  {
    no: "EXP-2569-039", employee: "ทีมบริการ", dept: "Engineering", purpose: "งานซ่อมบำรุง TK-118 ไซต์ C",
    ref: "TK-118", date: "22 ก.ค. 69", km: 84,
    items: [{ label: "รถส่วนตัว 84 กม. × 5฿", amount: 420 }],
    status: "จ่ายแล้ว",
  },
];

// ── สื่อสารลูกค้า (ดัดแปลงจาก client-portal ของ tomas-tech-pm) ──
export type ClientLink = {
  project: string;
  customer: string;
  contact: string;
  status: "ใช้งานอยู่" | "หมดอายุ";
  lastSeen: string;
  unread: number;
};

export const clientLinks: ClientLink[] = [
  { project: "PJ-2569-01 — Lifter AGV x3 + FMS", customer: "โรงงาน A", contact: "คุณสมชาย (ผจก.โรงงาน)", status: "ใช้งานอยู่", lastSeen: "วันนี้ 09:12", unread: 2 },
  { project: "PJ-2569-02 — FMS + Wi-Fi", customer: "คลัง B", contact: "คุณวิภา (Supply Chain)", status: "ใช้งานอยู่", lastSeen: "เมื่อวาน", unread: 0 },
  { project: "PJ-2569-03 — Tugger เฟส 2", customer: "ศูนย์กระจายสินค้า G", contact: "คุณอนันต์ (Ops Director)", status: "ใช้งานอยู่", lastSeen: "3 วันก่อน", unread: 1 },
];

export const clientThread = [
  { from: "client", name: "คุณสมชาย (โรงงาน A)", time: "วันนี้ 09:10", text: "รบกวนสอบถามครับ งวดติดตั้งจะเสร็จตามกำหนดสิ้นเดือนนี้ไหมครับ ทางเราต้องเตรียมพื้นที่เพิ่มไหม" },
  { from: "client", name: "คุณสมชาย (โรงงาน A)", time: "วันนี้ 09:12", text: "แล้วก็ขอไฟล์ Layout เส้นทางวิ่งเวอร์ชันล่าสุดด้วยครับ" },
  { from: "staff", name: "PM 1 (CONSERTECH)", time: "—", text: "(ร่างตอบโดย AI รอตรวจ): เรียนคุณสมชาย งานติดตั้งคืบหน้า 70% เป็นไปตามแผนครับ ทีมจะเข้าหน้างานสัปดาห์หน้า ขอให้เคลียร์พื้นที่โซน B ตามแนบ ส่วนไฟล์ Layout ล่าสุดแนบมาพร้อมนี้ครับ" },
];

export const clientRequests = [
  { from: "โรงงาน A", type: "ขอเอกสาร", detail: "Layout เส้นทางวิ่งเวอร์ชันล่าสุด", status: "รอตอบ", time: "วันนี้" },
  { from: "ศูนย์กระจายสินค้า G", type: "แจ้งปัญหา", detail: "รถเฟส 1 เสียงเตือนดังผิดปกติช่วงเข้าโค้ง", status: "เปิด Ticket TK-119 แล้ว", time: "3 วันก่อน" },
  { from: "คลัง B", type: "นัดประชุม", detail: "ขอนัดรีวิวก่อน Acceptance Test", status: "ลงปฏิทินแล้ว (ศุกร์ 10:00)", time: "เมื่อวาน" },
];

// ── งานของทีม (ดัดแปลงจาก tasks/board ของ tomas-tech-pm) ──
export type TaskCard = { id: string; title: string; assignee: string; project: string; due: string; priority: "สูง" | "กลาง" | "ต่ำ" };
export const taskBoard: { column: string; tasks: TaskCard[] }[] = [
  {
    column: "ต้องทำ",
    tasks: [
      { id: "T-201", title: "เตรียมเอกสาร Acceptance Test ไซต์ B", assignee: "PM 2", project: "PJ-2569-02", due: "ศุกร์นี้", priority: "สูง" },
      { id: "T-202", title: "สั่งอุปกรณ์ล็อต 2 (PICOSCAN x2)", assignee: "ทีมจัดซื้อ", project: "PJ-2569-03", due: "อังคารหน้า", priority: "กลาง" },
      { id: "T-203", title: "ร่างโพสต์บทความ FMS ลง LinkedIn", assignee: "ทีมขาย 2", project: "Marketing", due: "สัปดาห์หน้า", priority: "ต่ำ" },
    ],
  },
  {
    column: "กำลังทำ",
    tasks: [
      { id: "T-198", title: "ตั้งค่า Virtual Path โซน B ไซต์โรงงาน A", assignee: "ทีมวิศวกร 1", project: "PJ-2569-01", due: "พุธนี้", priority: "สูง" },
      { id: "T-199", title: "ทดสอบ Failover AP ไซต์คลัง B", assignee: "ทีมระบบ", project: "PJ-2569-02", due: "พฤหัสนี้", priority: "สูง" },
    ],
  },
  {
    column: "รอตรวจ",
    tasks: [
      { id: "T-196", title: "แบบโครงสร้าง Tugger 800 กก. (คำนวณโหลด)", assignee: "ทีมเครื่องกล", project: "PJ-2569-03", due: "รอรีวิว", priority: "กลาง" },
    ],
  },
  {
    column: "เสร็จแล้ว",
    tasks: [
      { id: "T-195", title: "Survey โรงงานชิ้นส่วนยานยนต์ A", assignee: "ทีมขาย 1", project: "D-001", due: "-", priority: "กลาง" },
      { id: "T-194", title: "อัปเดตเฟิร์มแวร์ M360-X ไซต์ B", assignee: "ทีมระบบ", project: "TK-116", due: "-", priority: "ต่ำ" },
    ],
  },
];

// ── ประชุม / บันทึกเสียง (จาก meeting-notes + ai/transcribe + ai/extract-meeting) ──
export const meetingNotes = [
  {
    id: "MT-031", title: "ประชุมความคืบหน้าไซต์โรงงาน A (สัปดาห์ที่ 6)", date: "4 ส.ค. 69 · 45 นาที",
    attendees: "PM 1, ทีมวิศวกร 1, คุณสมชาย (ลูกค้า)", source: "🎙️ อัดเสียง → AI ถอดความแล้ว", ref: "PJ-2569-01",
    hasAI: true,
  },
  { id: "MT-030", title: "Sales Weekly — รีวิว Pipeline", date: "4 ส.ค. 69 · 30 นาที", attendees: "ทีมขายทั้งหมด, ผู้บริหาร", source: "🎙️ อัดเสียง → AI ถอดความแล้ว", ref: "CRM", hasAI: true },
  { id: "MT-029", title: "Kickoff Tugger เฟส 2 — ศูนย์กระจายสินค้า G", date: "25 ก.ค. 69 · 60 นาที", attendees: "PM 1, ทีมออกแบบ, ลูกค้า 3 ท่าน", source: "พิมพ์บันทึกเอง", ref: "PJ-2569-03", hasAI: false },
];

export const meetingAISummary = {
  summary: "งานติดตั้งไซต์โรงงาน A คืบหน้า 70% เป็นไปตามแผน ลูกค้ากังวลเรื่องพื้นที่โซน B ที่ยังมีชั้นวางเก่าขวางแนววิ่ง ทีมยืนยันเข้าติดตั้งรอบถัดไปวันจันทร์หน้า และจะส่ง Layout เวอร์ชันล่าสุดให้ภายในวันนี้ ลูกค้าขอเพิ่มจุดจอดรับสินค้า 1 จุดใกล้ไลน์ประกอบ — ทีมรับไปประเมินผลกระทบต่อ Virtual Path และราคา (อาจเป็น Change Request)",
  actions: [
    { task: "ส่งไฟล์ Layout ล่าสุดให้ลูกค้า", owner: "PM 1", due: "วันนี้", linked: "สร้างเป็นงาน T-204 แล้ว" },
    { task: "แจ้งลูกค้าเคลียร์ชั้นวางโซน B ก่อนจันทร์หน้า", owner: "PM 1", due: "พรุ่งนี้", linked: "แจ้งผ่านสื่อสารลูกค้าแล้ว" },
    { task: "ประเมินเพิ่มจุดจอดใหม่ (ผลกระทบ + ราคา)", owner: "ทีมวิศวกร 1", due: "พุธหน้า", linked: "สร้างเป็นงาน T-205 แล้ว" },
  ],
};

// ── KPI / ประเมินผล (จาก personal-kpis + performance-reviews + skills) ──
export const personalKpis = [
  { metric: "ดีลที่ดูแล (Active)", value: "4", target: "5", pct: 80, auto: "นับจาก CRM อัตโนมัติ" },
  { metric: "ใบเสนอราคาออกเดือนนี้", value: "3", target: "4", pct: 75, auto: "นับจากเอกสารขายอัตโนมัติ" },
  { metric: "ตอบ Lead ภายใน 24 ชม.", value: "92%", target: "90%", pct: 100, auto: "วัดจากเวลาตอบใน CRM" },
  { metric: "งานเสร็จตามกำหนด", value: "8/10", target: "9/10", pct: 80, auto: "นับจากโมดูลงานของทีม" },
];

export const reviewCycle = {
  period: "รอบครึ่งปีหลัง 2569 (ก.ค.–ธ.ค.)", status: "เปิดประเมินตนเอง", due: "15 ส.ค. 69",
  steps: [
    { name: "ประเมินตนเอง", done: false, current: true },
    { name: "หัวหน้าประเมิน", done: false, current: false },
    { name: "นัดคุย 1:1", done: false, current: false },
    { name: "สรุปผล + แผนพัฒนา", done: false, current: false },
  ],
};

export const teamReviews = [
  { employee: "ทีมขาย 1", dept: "Sales", self: "ส่งแล้ว", manager: "รอประเมิน", score: "-" },
  { employee: "ทีมวิศวกร 1", dept: "Engineering", self: "ส่งแล้ว", manager: "เสร็จแล้ว", score: "4.2/5" },
  { employee: "ทีมวิศวกร 2", dept: "Engineering", self: "ยังไม่ส่ง", manager: "-", score: "-" },
  { employee: "PM 1", dept: "PM", self: "ส่งแล้ว", manager: "เสร็จแล้ว", score: "4.5/5" },
];

// ── Gantt (จาก gantt ของ tomas-tech-pm) — ช่วง มิ.ย.–ต.ค. 69 ──
export const ganttMonths = ["มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค."];
export const ganttRows: { label: string; project: string; start: number; span: number; pct: number; color?: "brand" | "amber" | "sky" }[] = [
  { label: "ออกแบบ + สั่งอุปกรณ์", project: "PJ-2569-01", start: 0, span: 1.5, pct: 100, color: "sky" },
  { label: "ติดตั้ง Lifter x3 + FMS", project: "PJ-2569-01", start: 1.5, span: 1.5, pct: 70, color: "brand" },
  { label: "Acceptance + ส่งมอบ", project: "PJ-2569-01", start: 3, span: 0.8, pct: 0, color: "amber" },
  { label: "ติดตั้ง FMS + Wi-Fi", project: "PJ-2569-02", start: 0.5, span: 2, pct: 100, color: "sky" },
  { label: "ทดสอบ + Acceptance", project: "PJ-2569-02", start: 2.5, span: 1, pct: 60, color: "brand" },
  { label: "ออกแบบ Tugger เฟส 2", project: "PJ-2569-03", start: 2, span: 1.5, pct: 15, color: "brand" },
  { label: "ติดตั้ง + ทดสอบ", project: "PJ-2569-03", start: 3.5, span: 1.5, pct: 0, color: "amber" },
];

// ── การลา (ดัดแปลงจาก leave ของ tomas-tech-pm) ──
export const leaveBalance = { annual: { used: 3, total: 10 }, sick: { used: 1, total: 30 }, personal: { used: 1, total: 6 } };
export const leaveRequests = [
  { no: "LV-088", employee: "ทีมวิศวกร 2", type: "ลาพักร้อน", range: "14–15 ส.ค. 69 (2 วัน)", note: "ธุระครอบครัว", status: "รออนุมัติ" },
  { no: "LV-087", employee: "ทีมขาย 1", type: "ลากิจ", range: "8 ส.ค. 69 (ครึ่งวันบ่าย)", note: "ติดต่อราชการ", status: "อนุมัติแล้ว" },
  { no: "LV-086", employee: "PM 1", type: "ลาป่วย", range: "1 ส.ค. 69 (1 วัน)", note: "มีใบรับรองแพทย์", status: "อนุมัติแล้ว" },
];
