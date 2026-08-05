// ─── CONSERTECH mock data ─────────────────────────────────────────────
// เนื้อหาจริงจาก website-copy-th-en.md (ชุด Marketing ที่อนุมัติแล้ว)
// ข้อมูลตัวเลข/KPI/คอร์ส เป็น dummy ตาม README handoff — ห้ามแสดงราคาสินค้า

export const company = {
  nameTh: "บริษัท คันเซอร์เทคช์ จำกัด",
  nameEn: "CONSERTECH CO., LTD.",
  tagline: "Consult · Service · Technology",
  address: "72, 49 หมู่ที่ 3 ถ.เลี่ยงเมืองปากเกร็ด ต.บางตลาด อ.ปากเกร็ด จ.นนทบุรี 11120",
  addressEn: "72, 49 Moo 3, Liang Mueang Pak Kret Rd., Bang Talat, Pak Kret, Nonthaburi 11120, Thailand",
  phone: "062-363-5395",
  email: "sale01@cs-th.com",
  mapsUrl: "https://maps.app.goo.gl/cDg9snyMGovX2cwG7",
  mapsEmbed:
    "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d684.6746560223728!2d100.5162158137758!3d13.892685074198672!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x30e285006e2f5a67%3A0xfe7607aaf5b28e09!2sCONSERTECH%20CO.%2CLTD!5e0!3m2!1sth!2sth!4v1785904600878!5m2!1sth!2sth",
  vision:
    "ขับเคลื่อนความสำเร็จของคุณผ่านคำปรึกษาและบริการวิศวกรรม เพื่อยกระดับการทำงานสู่ระบบอัตโนมัติที่ล้ำสมัยและยั่งยืน",
};

export const painPoints = [
  {
    title: "ขาดแคลนแรงงาน",
    desc: "หาแรงงานลำเลียงสินค้ายากขึ้น อัตราลาออกสูง ต้นทุนฝึกอบรมซ้ำซ้อน",
  },
  {
    title: "ต้นทุนเพิ่มทุกปี",
    desc: "ค่าแรงปรับขึ้นต่อเนื่อง แต่ราคาขายสินค้าแข่งขันรุนแรง กำไรถูกบีบ",
  },
  {
    title: "ความผิดพลาดและอุบัติเหตุ",
    desc: "ส่งของผิดจุด สินค้าเสียหาย อุบัติเหตุรถโฟล์คลิฟท์ในพื้นที่ทำงานร่วมกับคน",
  },
  {
    title: "ผลิตต้องไม่หยุด",
    desc: "สายการผลิตต้องการวัตถุดิบต่อเนื่อง 24 ชม. แรงงานคนทำไม่ไหว",
  },
];

export const solutions = [
  { title: "Warehouse Automation", desc: "ASRS, Smart Picking & Sorting, ติดตามสต็อก Real-time" },
  { title: "Production & Process", desc: "ระบบประกอบ-บรรจุอัตโนมัติ, Material Handling เชื่อมทั้งโรงงาน" },
  { title: "Intra-Logistic Automation", desc: "AGV / AMR รับ-ส่งสินค้าแทนคน, Smart Conveyor", highlight: true },
  { title: "Quality Insurance", desc: "AI Defect Inspection ตรวจตำหนิด้วย Vision สู่ Zero Defect" },
  { title: "Facility & Maintenance", desc: "Condition Monitoring ป้องกัน Downtime, Smart Utility" },
  { title: "Machine Safety", desc: "ระบบความปลอดภัยเครื่องจักรตามมาตรฐานสากล" },
];

export const comparison = {
  headers: ["คุณสมบัติ", "AGV ดั้งเดิม", "LiDAR-Guided AGV", "AMR"],
  rows: [
    ["การนำทาง", "เทปแม่เหล็ก (ติดที่พื้น)", "เส้นทางเสมือนในซอฟต์แวร์", "สร้างแผนที่เอง (SLAM)"],
    ["ความยืดหยุ่น", "ต่ำ — รื้อเส้นทางเมื่อเปลี่ยนผัง", "สูง — แก้ในโปรแกรมได้ทันที", "สูงสุด"],
    ["ความแม่นยำ", "สูง", "สูงที่สุด (LiDAR + Virtual Path)", "ปานกลาง–สูง"],
    ["การติดตั้ง", "ช้า ต้องทำพื้น/ติดเทป", "เร็ว — สแกนพื้นที่แล้วจบ", "เร็วที่สุด"],
    ["งบประมาณ", "ต่ำสุด", "คุ้มค่าที่สุด (ปานกลาง)", "สูงสุด"],
  ],
};

export type Vehicle = {
  slug: string;
  name: string;
  short: string;
  desc: string;
  image: string; // รูปชั่วคราวจากเอกสาร Master — เปลี่ยนเป็นรูปที่ยืนยันลิขสิทธิ์ก่อนเผยแพร่จริง
  useCases: string[];
  specs: [string, string][];
};

export const vehicles: Vehicle[] = [
  {
    slug: "pallet-jack",
    image: "/images/pallet-jack.jpg",
    name: "Pallet Jack / Forklift",
    short: "ยกพาเลทจากพื้นหรือชั้นวาง",
    desc: "รถแบบมีงายกเหมือนฟอร์คลิฟท์ สามารถยกพาเลทจากพื้นหรือวางบนชั้นวางได้ เหมาะกับการรับ-ส่งสินค้าจำนวนมากที่จัดวางบนพาเลท",
    useCases: ["รับ-ส่งพาเลทระหว่างคลังและไลน์ผลิต", "งานที่ต้องยกขึ้น-ลงชั้นวาง", "เลือกโหมด Hybrid ให้พนักงานควบคุมเองได้เมื่อจำเป็น"],
    specs: [
      ["น้ำหนักที่รองรับ", "200 – 1,000+ กก. (ออกแบบตามหน้างาน)"],
      ["ระบบนำทาง", "LiDAR-Guided (Virtual Path)"],
      ["ระบบขับเคลื่อน", "Differential / Steering Drive"],
      ["โหมดการทำงาน", "Fully Automatic / Hybrid (Auto + Manual)"],
    ],
  },
  {
    slug: "tugger-towing",
    image: "/images/tugger-towing.png",
    name: "Tugger / Towing",
    short: "ลากจูงขบวนชั้นวางหลายคัน",
    desc: "ทำหน้าที่เป็นรถลาก จูงรถพ่วงหรือชั้นวางสินค้าต่อกันหลายคันเหมือนขบวนรถไฟ เหมาะกับการขนวัตถุดิบจำนวนมากในรอบเดียว",
    useCases: ["ส่งวัตถุดิบหลายจุดในรอบเดียว (Milk run)", "ขบวนชั้นวางลากพ่วงต่อกันหลายคัน", "เส้นทางประจำระหว่างคลังกับไลน์ผลิต"],
    specs: [
      ["น้ำหนักลากจูง", "200 – 1,000+ กก."],
      ["ระบบนำทาง", "LiDAR-Guided (Virtual Path)"],
      ["ระบบขับเคลื่อน", "Differential / Steering Drive"],
      ["โหมดการทำงาน", "Fully Automatic / Hybrid"],
    ],
  },
  {
    slug: "lifter-underride",
    image: "/images/lifter-underride.png",
    name: "Lifter / Underride",
    short: "มุดใต้ Rack ยกทั้งชุด",
    desc: "ตัวรถมุดเข้าใต้ชั้นวางสินค้า (Rack) หรือรถเข็น แล้วยกขึ้นเพื่อเคลื่อนย้ายไปทั้งชุด รุ่นแผงควบคุมด้านล่างสามารถลอดใต้ชั้นวางได้โดยตรง รองรับการส่งเข้าพื้นที่จัดเก็บแบบเรียงแถว",
    useCases: ["ยก Rack/รถเข็นทั้งชุดโดยไม่ต้องขนถ่ายสินค้า", "ส่งเข้าพื้นที่จัดเก็บแบบแบ่งชนิดสินค้า", "พื้นที่แคบที่รถใหญ่เข้าไม่ถึง"],
    specs: [
      ["น้ำหนักที่รองรับ", "200 – 1,000 กก."],
      ["ระบบนำทาง", "LiDAR-Guided (Virtual Path)"],
      ["ระบบขับเคลื่อน", "Differential / Quad Drive"],
      ["โหมดการทำงาน", "Fully Automatic"],
    ],
  },
  {
    slug: "conveyor-roller",
    image: "/images/conveyor-roller.jpg",
    name: "Conveyor / Roller",
    short: "รับ-ส่งเข้าสายพานอัตโนมัติ",
    desc: "บนตัวรถติดตั้งสายพานหรือลูกกลิ้ง รับ-ส่งสินค้ากับสายพานในโรงงานได้อัตโนมัติแบบไร้รอยต่อ เน้นการป้อนของเข้าสายการผลิต",
    useCases: ["เชื่อมสายพานสองจุดที่อยู่ห่างกัน", "ป้อนชิ้นงานเข้าไลน์ผลิตอัตโนมัติ 100%", "ลดการยกของโดยพนักงาน"],
    specs: [
      ["น้ำหนักที่รองรับ", "200 – 600 กก."],
      ["ระบบนำทาง", "LiDAR-Guided (Virtual Path)"],
      ["การเชื่อมต่อ", "สื่อสารกับ Conveyor / PLC หน้างาน"],
      ["โหมดการทำงาน", "Fully Automatic"],
    ],
  },
  {
    slug: "unit-load",
    image: "/images/unit-load.png",
    name: "Unit Load",
    short: "แท่นวางสินค้าบนตัวรถ",
    desc: "มีแท่นวางด้านบนเพื่อบรรทุกสินค้าโดยตรง เป็นพื้นฐานการออกแบบที่ปรับแต่งให้เหมาะกับสายการผลิตแต่ละแบบได้มากที่สุด",
    useCases: ["รับ-ส่งสินค้าแบบหนึ่งต่อหนึ่ง", "งานที่ต้องออกแบบแท่นวางเฉพาะ", "ฐานสำหรับต่อยอด Top module อื่นๆ"],
    specs: [
      ["น้ำหนักที่รองรับ", "200 – 1,000 กก. (ตัวอย่างการคำนวณ 4 และ 6 ล้อ)"],
      ["ระบบนำทาง", "LiDAR-Guided (Virtual Path)"],
      ["ระบบขับเคลื่อน", "Differential / Steering / Quad Drive"],
      ["โหมดการทำงาน", "Fully Automatic / Hybrid"],
    ],
  },
];

export const processSteps = [
  { n: 1, title: "สำรวจหน้างานฟรี", en: "Site Survey", desc: "วิเคราะห์ผังโรงงานและ Flow สินค้า — ไม่มีค่าใช้จ่าย" },
  { n: 2, title: "ออกแบบ + คำนวณ", en: "Design", desc: "เลือกรูปแบบรถ คำนวณโหลด มอเตอร์ แบตเตอรี่ ตามหลักวิศวกรรม" },
  { n: 3, title: "เสนอราคา + Scope", en: "Proposal", desc: "ใบเสนอราคาพร้อม Scope of Work ชัดเจนทุกรายการ" },
  { n: 4, title: "ติดตั้งระบบ", en: "Install", desc: "ติดตั้งรถ เครือข่าย และ FMS โดยทีมวิศวกรของเรา" },
  { n: 5, title: "ทดสอบยอมรับ", en: "Acceptance Test", desc: "ทดสอบร่วมกับลูกค้าตามเกณฑ์ที่ตกลง" },
  { n: 6, title: "รับประกัน + ดูแล", en: "Warranty", desc: "พร้อมบริการหลังการขายโดยทีมไทย" },
];

export const whyUs = [
  { title: "วิศวกรรมเชิงลึก ไม่ใช่แค่ขายกล่อง", desc: "คำนวณออกแบบเองทุกชั้น ตั้งแต่โครงสร้างรถ มอเตอร์ เซนเซอร์ จนถึงซอฟต์แวร์ FMS — ปรับแต่งได้ตรงหน้างานจริง" },
  { title: "เอกสารครบ มาตรฐานชัด", desc: "Scope of Work, Acceptance Test, เงื่อนไขแบ่งจ่าย และ Warranty ระบุชัดเจนก่อนเริ่มงานทุกโครงการ" },
  { title: "ทีมไทย ซัพพอร์ตไว", desc: "ปรึกษา ซ่อมบำรุง อะไหล่ภายในประเทศ ลด Downtime ให้เหลือน้อยที่สุด" },
  { title: "อุปกรณ์มาตรฐานสากล", desc: "SICK LiDAR, Oriental Motor, Mitsubishi PLC — เกรดอุตสาหกรรม หาอะไหล่ได้ยาวนาน" },
];

export const fmsFeatures = [
  { title: "Traffic Control", desc: "ควบคุมจราจร ป้องกันรถกระจุกที่ทางแยก เหมือนสัญญาณไฟจราจรอัจฉริยะ" },
  { title: "Task Allocation", desc: "จ่ายงานให้รถคันที่ว่างและใกล้ที่สุดโดยอัตโนมัติ ใช้ทรัพยากรคุ้มค่าสูงสุด" },
  { title: "Status Monitoring", desc: "เฝ้าดูสถานะทุกคันแบบ Real-time แบตต่ำสั่งไปชาร์จเองอัตโนมัติ" },
];

export type BlogPost = { slug: string; title: string; excerpt: string; date: string; tag: string; body: string[] };

export const blogPosts: BlogPost[] = [
  {
    slug: "agv-vs-amr",
    title: "AGV vs AMR ต่างกันอย่างไร เลือกแบบไหนดี",
    excerpt: "AGV เหมือนรถไฟที่วิ่งตามราง ส่วน AMR เหมือนรถยนต์ที่มี GPS และ AI — แล้วทางสายกลางอย่าง LiDAR-Guided AGV อยู่ตรงไหน",
    date: "2026-08-01",
    tag: "ความรู้พื้นฐาน",
    body: [
      "AGV (Automated Guided Vehicle) ทำงานเหมือน \"รถไฟ\" คือวิ่งตามเส้นทางที่กำหนดไว้ล่วงหน้าอย่างเคร่งครัด ใช้แถบแม่เหล็ก เส้นสี หรือ 2D Code ในการนำทาง หากเจอสิ่งกีดขวางจะหยุดรอจนกว่าอุปสรรคถูกเคลื่อนย้ายออกไป",
      "AMR (Autonomous Mobile Robot) ทำงานเหมือน \"รถยนต์ที่มี GPS และ AI\" ใช้เซนเซอร์ LiDAR กล้อง 3D และซอฟต์แวร์สร้างแผนที่ (SLAM) ตัดสินใจเลือกเส้นทางเองได้ เจอสิ่งกีดขวางจะคำนวณเส้นทางใหม่และขับอ้อมทันที",
      "LiDAR-Guided AGV คือลูกผสมที่ลงตัว: ใช้ LiDAR นำทางแบบไม่ต้องติดเทปที่พื้น กำหนดเส้นทางเสมือน (Virtual Path) ในซอฟต์แวร์ ได้ความยืดหยุ่นเกือบเท่า AMR แต่คงความแม่นยำสูงสุดในการรับ-ส่งสินค้า ในงบประมาณระดับกลาง",
    ],
  },
  {
    slug: "5-signs-ready-for-agv",
    title: "5 สัญญาณว่าโรงงานคุณพร้อมใช้ AGV",
    excerpt: "หาแรงงานยาก โฟล์คลิฟท์เฉี่ยวชนบ่อย ไลน์หยุดรอของ — ถ้ามีครบ 3 ข้อ ถึงเวลาประเมินหน้างานแล้ว",
    date: "2026-08-08",
    tag: "การตัดสินใจ",
    body: [
      "1) หาแรงงานลำเลียงสินค้ายาก ลาออกบ่อย ต้องฝึกใหม่ซ้ำๆ 2) รถโฟล์คลิฟท์เฉี่ยวชนหรือเกือบชนคนเป็นประจำ 3) ส่งวัตถุดิบเข้าไลน์ไม่ทัน ไลน์หยุดรอของ 4) เส้นทางลำเลียงซ้ำเดิมทุกวัน วันละหลายสิบรอบ 5) อยากได้ข้อมูลการลำเลียงแบบ Real-time แต่ยังจดมือ",
      "หากมีครบ 3 ข้อขึ้นไป การให้วิศวกรเข้าประเมินหน้างาน (Site Survey) ฟรี คือก้าวแรกที่คุ้มที่สุด เพราะจะได้เห็น Flow จริง น้ำหนักจริง และระยะทางจริง ก่อนตัดสินใจลงทุน",
    ],
  },
  {
    slug: "no-magnetic-tape",
    title: "ทำไม LiDAR-Guided AGV ไม่ต้องติดเทปแม่เหล็ก",
    excerpt: "ภาพจำเดิมคือติดตั้ง AGV ต้องปิดไลน์ เจาะพื้น ติดเทปทั้งโรงงาน — เทคโนโลยีวันนี้เปลี่ยนไปแล้ว",
    date: "2026-08-15",
    tag: "เทคโนโลยี",
    body: [
      "LiDAR-Guided AGV ติดตั้งเซนเซอร์เลเซอร์ที่สแกนสภาพแวดล้อมรอบตัวเพื่อสร้างแผนที่ดิจิทัล แล้วระบุตำแหน่งตัวเอง (Localization) โดยเทียบข้อมูลปัจจุบันกับแผนที่ รถจะวิ่งตามเส้นทางเสมือนที่วาดไว้ในซอฟต์แวร์",
      "ผลคือ ติดตั้งเร็วกว่าเพราะไม่ต้องหยุดผลิตนาน หน้างานสะอาดไม่มีเทปให้ลอกซ่อม และเมื่อย้ายผังการผลิต ก็แก้เส้นทางในซอฟต์แวร์ได้ทันทีโดยไม่ต้องรื้อพื้น รวมถึงสั่งงานขั้นสูงอย่างการปรับความเร็ว เปลี่ยนพื้นที่ตรวจจับของ Laser Scanner หรือควบคุมทางแยก ได้จากซอฟต์แวร์ทั้งหมด",
    ],
  },
  {
    slug: "fleet-management-system",
    title: "Fleet Management System ทำงานอย่างไร",
    excerpt: "รถ AGV 10 คันวิ่งพร้อมกันทำไมไม่ชนกัน — รู้จัก \"หอบังคับการ\" ของฝูงรถ",
    date: "2026-08-22",
    tag: "เทคโนโลยี",
    body: [
      "Fleet Management System (FMS) คือซอฟต์แวร์บริหารจัดการฝูงรถตั้งแต่ 3 คันขึ้นไป ทำหน้าที่ 3 อย่างหลัก: Traffic Control จัดคิวทางแยกไม่ให้รถกระจุก, Task Allocation จ่ายงานให้คันที่ว่างและใกล้ที่สุด, และ Status Monitoring เฝ้าดูสถานะรวมถึงแบตเตอรี่ หากคันไหนแบตต่ำระบบจะสั่งไปชาร์จอัตโนมัติ",
      "เบื้องหลัง FMS ที่ดีคือโครงข่ายสื่อสารที่ออกแบบมาอย่างถูกต้อง ทั้ง Wi-Fi อุตสาหกรรมที่ครอบคลุมทั่วพื้นที่ (IEEE 802.11) การเชื่อมต่อ PLC / WMS / MES และการสื่อสารระหว่างรถ (V2V) เพื่อควบคุมทางร่วมทางแยกอย่างปลอดภัย — CONSERTECH ออกแบบครบทั้ง Ecosystem",
    ],
  },
];

export type Course = {
  slug: string;
  title: string;
  level: "free" | "premium";
  lessons: string[];
  duration: string;
  desc: string;
};

export const courses: Course[] = [
  {
    slug: "logistic-automation-basics",
    title: "พื้นฐาน Logistic Automation: AGV vs AMR vs LiDAR-Guided",
    level: "free",
    duration: "1.5 ชม.",
    desc: "ปูพื้นฐานระบบลำเลียงอัตโนมัติ เข้าใจความต่างของเทคโนโลยีนำทางแต่ละแบบ และวิธีเลือกให้เหมาะกับโรงงาน",
    lessons: ["Logistic Automation คืออะไร", "AGV vs AMR — หลักการนำทาง", "LiDAR-Guided AGV ทางสายกลาง", "เลือกเทคโนโลยีอย่างไรให้เหมาะ", "แบบทดสอบท้ายคอร์ส"],
  },
  {
    slug: "agv-structure-design",
    title: "การออกแบบและคำนวณโครงสร้างรถ AGV (200–1,000 กก.)",
    level: "premium",
    duration: "4 ชม.",
    desc: "เจาะลึกกฎการออกแบบโครงสร้าง สูตรคำนวณโหลด การเลือกล้อ มอเตอร์ และตัวอย่างคำนวณจริงแบบ 4 และ 6 ล้อ",
    lessons: ["กฎ 3 ข้อหลักในการออกแบบโครงสร้าง", "สูตรคำนวณและ Travel Calculation", "การเลือกวัสดุล้อ", "มอเตอร์ BLV-R และการเลือกขนาด", "ตัวอย่าง Unit Load 200–1,000 กก.", "ตัวอย่าง Towing Truck", "Workshop คำนวณจากโจทย์จริง"],
  },
  {
    slug: "lidar-virtual-line",
    title: "การตั้งค่า LiDAR Sensor และ Virtual Line",
    level: "premium",
    duration: "3 ชม.",
    desc: "ตั้งค่า LiDAR ตั้งแต่ IP Address, พื้นที่ตรวจจับ, Virtual Line Sensor, Virtual Code Reader จนถึงการบันทึกและแก้ไขแผนที่",
    lessons: ["รู้จักอุปกรณ์และการเดินสาย", "ตั้งค่า IP และระยะตรวจวัด", "Field Set และพื้นที่ตรวจจับ", "Virtual Line / Virtual Code Reader", "บันทึกและแก้ไขแผนที่เส้นทาง"],
  },
  {
    slug: "industrial-wifi-design",
    title: "ออกแบบเครือข่าย Wi-Fi อุตสาหกรรมสำหรับ AGV",
    level: "premium",
    duration: "2.5 ชม.",
    desc: "หลักการวาง Access Point ให้ครอบคลุม มาตรฐาน IEEE 802.11 การเลือก Switch และจุดที่ทำให้ AGV หลุดการเชื่อมต่อ",
    lessons: ["หลักการออกแบบ Wi-Fi โรงงาน", "มาตรฐาน IEEE 802.11 ที่ควรรู้", "Unmanaged / L2 / L3 Switch", "Fast Ethernet vs Gigabit", "เช็กลิสต์ก่อนติดตั้งจริง"],
  },
  {
    slug: "fms-plc-integration",
    title: "Fleet Management System และการเชื่อมต่อ PLC/WMS",
    level: "premium",
    duration: "3 ชม.",
    desc: "โครงสร้าง FMS การสื่อสาร V2V การควบคุมทางแยก และการเชื่อมต่อกับ PLC / WMS / MES ในสายการผลิตจริง",
    lessons: ["FMS ต่างจาก WMS อย่างไร", "โครงสร้างรหัสคำสั่งรถ", "การควบคุมทางร่วมทางแยก", "เชื่อมต่อ PLC Mitsubishi", "กรณีศึกษาระบบจริง"],
  },
  {
    slug: "machine-safety-field",
    title: "ความปลอดภัยเครื่องจักรและ Protective Field",
    level: "free",
    duration: "1 ชม.",
    desc: "ระยะปลอดภัยของอุปกรณ์ตรวจจับ การตั้ง Protective Field รอบรถ และมาตรฐานความปลอดภัยที่เกี่ยวข้อง",
    lessons: ["แนวคิด Machine Safety", "Protective Field คืออะไร", "ระยะปลอดภัยและวิถีโค้ง", "แบบทดสอบท้ายคอร์ส"],
  },
];

export const tiers = [
  {
    name: "Free Member",
    desc: "เริ่มต้นเรียนรู้ระบบอัตโนมัติ",
    features: ["อ่านบทความพิเศษทั้งหมด", "คอร์สพื้นฐานฟรี 2 คอร์ส", "ดาวน์โหลดเอกสารเบื้องต้น", "รับข่าวสารเทคโนโลยี"],
    cta: "สมัครฟรี",
    highlight: false,
  },
  {
    name: "Premium",
    desc: "สำหรับวิศวกรที่ต้องการเชี่ยวชาญจริง",
    features: ["คอร์สวิดีโอเชิงลึกทั้งหมด 6 คอร์ส", "ใบประกาศนียบัตรเมื่อเรียนจบ", "ถาม-ตอบกับวิศวกร CONSERTECH", "เอกสารประกอบดาวน์โหลดได้"],
    cta: "เร็วๆ นี้",
    highlight: true,
  },
  {
    name: "Corporate",
    desc: "เหมาองค์กร พนักงานเรียนได้หลายคน",
    features: ["ทุกอย่างใน Premium", "จัดการที่นั่งเรียนสำหรับทีม", "Workshop ที่หน้างานของคุณ", "รายงานความคืบหน้ารายทีม"],
    cta: "ติดต่อฝ่ายขาย",
    highlight: false,
  },
];

// ─── Zone C: Staff (dummy ทั้งหมด — รอ data source จริงจากแต่ละแผนก) ───

export type Department = "sales" | "engineering" | "pm" | "admin" | "management";

export const departments: { key: Department; label: string }[] = [
  { key: "sales", label: "Sales" },
  { key: "engineering", label: "Engineering" },
  { key: "pm", label: "Project Management" },
  { key: "admin", label: "Admin & Finance" },
  { key: "management", label: "Management" },
];

export const staffDashboards: Record<
  Department,
  {
    kpis: { label: string; value: string; delta?: string }[];
    tableTitle: string;
    tableHead: string[];
    tableRows: string[][];
    highlight: string;
  }
> = {
  sales: {
    kpis: [
      { label: "Lead ใหม่เดือนนี้", value: "18", delta: "+5" },
      { label: "ใบเสนอราคาที่เปิดอยู่", value: "7" },
      { label: "นัด Site Survey", value: "4", delta: "+2" },
      { label: "Win Rate ไตรมาส", value: "32%" },
    ],
    tableTitle: "ดีลที่กำลังดำเนินการ",
    tableHead: ["ลูกค้า", "โซลูชัน", "สถานะ", "มูลค่า (ระดับ)"],
    tableRows: [
      ["โรงงานชิ้นส่วนยานยนต์ A", "Lifter AGV x3 + FMS", "รอตอบใบเสนอราคา", "สูง"],
      ["คลังสินค้า 3PL B", "Tugger AGV x2", "นัดสำรวจหน้างาน", "กลาง"],
      ["โรงงานอาหาร C", "Conveyor AGV", "เจรจาต่อรอง", "กลาง"],
      ["อิเล็กทรอนิกส์ D", "Unit Load x4 + FMS", "เสนอราคาแล้ว", "สูง"],
    ],
    highlight: "โฟกัสสัปดาห์นี้: ตามใบเสนอราคาโรงงาน A ครบกำหนด follow-up วันพฤหัส",
  },
  engineering: {
    kpis: [
      { label: "โปรเจกต์ที่ออกแบบอยู่", value: "3" },
      { label: "Site Survey รอสรุปผล", value: "2" },
      { label: "Ticket ซัพพอร์ต", value: "5", delta: "-2" },
      { label: "แบบรอรีวิว", value: "4" },
    ],
    tableTitle: "งานออกแบบและซัพพอร์ต",
    tableHead: ["งาน", "ประเภท", "ผู้รับผิดชอบ", "กำหนดส่ง"],
    tableRows: [
      ["คำนวณโหลด Lifter 600 กก.", "Design", "ทีมเครื่องกล", "ศุกร์นี้"],
      ["ผัง Wi-Fi โรงงาน B", "Network", "ทีมระบบ", "สัปดาห์หน้า"],
      ["แก้พารามิเตอร์ LiDAR ไซต์ C", "Support", "ทีมบริการ", "วันนี้"],
      ["ทดสอบ FMS เวอร์ชันใหม่", "R&D", "ทีมซอฟต์แวร์", "สิ้นเดือน"],
    ],
    highlight: "แจ้งเตือน: อะไหล่มอเตอร์ BLV-R ล็อตใหม่เข้าคลังแล้ว",
  },
  pm: {
    kpis: [
      { label: "โครงการกำลังติดตั้ง", value: "2" },
      { label: "ตรงตามแผน", value: "2/2" },
      { label: "Acceptance Test เดือนนี้", value: "1" },
      { label: "Milestone ค้างชำระ", value: "1" },
    ],
    tableTitle: "สถานะโครงการ",
    tableHead: ["โครงการ", "เฟสปัจจุบัน", "ความคืบหน้า", "กำหนดส่งมอบ"],
    tableRows: [
      ["ไซต์โรงงาน A — Lifter x3", "ติดตั้งระบบ", "70%", "ปลายเดือนนี้"],
      ["ไซต์คลัง B — FMS", "ทดสอบภายใน", "85%", "ต้นเดือนหน้า"],
    ],
    highlight: "เตรียมเอกสาร Acceptance Test ไซต์ B ภายในศุกร์นี้",
  },
  admin: {
    kpis: [
      { label: "ใบแจ้งหนี้รอเก็บ", value: "3" },
      { label: "PO รอเปิด", value: "2" },
      { label: "ครบกำหนดสัปดาห์นี้", value: "1" },
      { label: "เคลมประกันเปิดอยู่", value: "0" },
    ],
    tableTitle: "รายการการเงินที่ต้องติดตาม",
    tableHead: ["รายการ", "คู่ค้า/ลูกค้า", "สถานะ", "ครบกำหนด"],
    tableRows: [
      ["Invoice งวดติดตั้ง ไซต์ A", "โรงงาน A", "ส่งแล้ว รอชำระ", "ศุกร์นี้"],
      ["PO เซนเซอร์ SICK", "ตัวแทนจำหน่าย", "รออนุมัติ", "-"],
      ["Invoice งวดออกแบบ ไซต์ B", "คลัง B", "ชำระแล้ว", "เสร็จสิ้น"],
    ],
    highlight: "PDPA: เอกสารนโยบายความเป็นส่วนตัวรอผู้บริหารรีวิว",
  },
  management: {
    kpis: [
      { label: "Pipeline รวม (ระดับ)", value: "สูง", delta: "▲" },
      { label: "โครงการส่งมอบปีนี้", value: "5" },
      { label: "Utilization ทีมวิศวกร", value: "78%" },
      { label: "คะแนนความพึงพอใจ", value: "4.6/5" },
    ],
    tableTitle: "ภาพรวมธุรกิจ",
    tableHead: ["หัวข้อ", "เดือนนี้", "เดือนก่อน", "แนวโน้ม"],
    tableRows: [
      ["Lead ใหม่", "18", "13", "▲"],
      ["ใบเสนอราคา", "7", "6", "▲"],
      ["โครงการติดตั้ง", "2", "3", "▼"],
      ["Ticket ซัพพอร์ต", "5", "7", "▼"],
    ],
    highlight: "วาระประชุมผู้บริหาร: อนุมัติราคาคอร์ส Academy และรีวิวนโยบาย PDPA",
  },
};
