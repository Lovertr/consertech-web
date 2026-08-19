// ไดอะแกรม SVG สำหรับหน้า Fleet Management — วาดเองตามโครงสร้าง 3 ส่วนในเอกสาร Master (ไม่ใช้รูปของบุคคลที่สาม)
const C = { brand: "#15659E", navy: "#0E3A5C", sky: "#5B9BD5", ice: "#EAF2F9", amber: "#F0A030", green: "#3CB878", red: "#E5484D", muted: "#5B6B7A" };

function Agv({ x, y, label, batt = 80, busy = true }: { x: number; y: number; label: string; batt?: number; busy?: boolean }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <rect x="0" y="6" width="56" height="26" rx="6" fill={C.sky} />
      <rect x="6" y="0" width="44" height="14" rx="4" fill={busy ? C.amber : "#B7C7D6"} />
      <circle cx="12" cy="34" r="5" fill={C.navy} />
      <circle cx="44" cy="34" r="5" fill={C.navy} />
      <circle cx="28" cy="20" r="3" fill="white" />
      {/* แบตเตอรี่ */}
      <rect x="0" y="44" width="56" height="6" rx="3" fill="#D8E4EE" />
      <rect x="0" y="44" width={56 * batt / 100} height="6" rx="3" fill={batt < 30 ? C.red : C.green} />
      <text x="28" y="64" textAnchor="middle" fontSize="11" fill={C.navy} fontWeight="700">{label}</text>
      {/* คลื่น Wi-Fi */}
      <path d="M40 -4 a10 10 0 0 1 12 0" stroke={C.brand} strokeWidth="1.6" fill="none" />
      <path d="M43 -1 a6 6 0 0 1 6 0" stroke={C.brand} strokeWidth="1.6" fill="none" />
    </g>
  );
}

function Box({ x, y, w, h, title, sub, fill = "white", stroke = C.brand, tc = C.navy }: { x: number; y: number; w: number; h: number; title: string; sub?: string; fill?: string; stroke?: string; tc?: string }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx="10" fill={fill} stroke={stroke} strokeWidth="1.5" />
      <text x={x + w / 2} y={y + (sub ? h / 2 - 3 : h / 2 + 4)} textAnchor="middle" fontSize="12.5" fontWeight="700" fill={tc}>{title}</text>
      {sub && <text x={x + w / 2} y={y + h / 2 + 13} textAnchor="middle" fontSize="10.5" fill={tc === "white" ? "#D7E6F3" : C.muted}>{sub}</text>}
    </g>
  );
}

/** สถาปัตยกรรม 3 ชั้น: รถ/เครื่องจักร ↔ โครงข่ายสื่อสาร ↔ FMS ส่วนกลาง */
export function FmsArchitecture() {
  return (
    <svg viewBox="0 0 760 436" className="w-full h-auto" role="img" aria-label="สถาปัตยกรรมระบบ Fleet Management System 3 ส่วน">
      <defs>
        <marker id="arw" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill={C.brand} /></marker>
        <linearGradient id="fmsg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={C.navy} /><stop offset="1" stopColor={C.brand} /></linearGradient>
      </defs>
      {/* แถบชั้น */}
      <rect x="10" y="10" width="740" height="118" rx="14" fill={C.ice} />
      <rect x="10" y="146" width="740" height="118" rx="14" fill="#F4F7FA" />
      <rect x="10" y="282" width="740" height="146" rx="14" fill={C.ice} />
      <text x="24" y="32" fontSize="11" fontWeight="800" fill={C.brand} letterSpacing="1">ส่วนที่ 3 · ส่วนควบคุมกลาง (FMS)</text>
      <text x="24" y="168" fontSize="11" fontWeight="800" fill={C.brand} letterSpacing="1">ส่วนที่ 2 · โครงข่ายสื่อสาร (Network)</text>
      <text x="24" y="304" fontSize="11" fontWeight="800" fill={C.brand} letterSpacing="1">ส่วนที่ 1 · รถและเครื่องจักร</text>

      {/* ชั้น FMS */}
      <rect x="290" y="44" width="180" height="70" rx="12" fill="url(#fmsg)" />
      <text x="380" y="72" textAnchor="middle" fontSize="15" fontWeight="800" fill="white">FMS Server</text>
      <text x="380" y="92" textAnchor="middle" fontSize="10.5" fill="#D7E6F3">Traffic · Task · Monitoring</text>
      <Box x={60} y={52} w={170} h={54} title="WMS / ERP / MES" sub="คำสั่งงาน · แผนผลิต" />
      <Box x={530} y={52} w={170} h={54} title="User Dashboard" sub="สถานะ Real-time · แผนที่" />
      <line x1="230" y1="79" x2="290" y2="79" stroke={C.brand} strokeWidth="2" markerEnd="url(#arw)" />
      <line x1="290" y1="86" x2="230" y2="86" stroke={C.brand} strokeWidth="2" markerEnd="url(#arw)" />
      <line x1="470" y1="79" x2="530" y2="79" stroke={C.brand} strokeWidth="2" markerEnd="url(#arw)" />

      {/* ชั้น Network */}
      <Box x={290} y={182} w={180} h={54} title="Core Switch (L2/L3)" sub="Gigabit · VLAN แยกวงหุ่นยนต์" fill="white" />
      <line x1="380" y1="114" x2="380" y2="182" stroke={C.brand} strokeWidth="2.5" />
      {[110, 380, 650].map((x, i) => (
        <g key={x}>
          <line x1={i === 1 ? 380 : x} y1={i === 1 ? 236 : 209} x2={x} y2={i === 1 ? 236 : 209} stroke={C.brand} strokeWidth="2" />
          {i !== 1 && <line x1={x < 380 ? 290 : 470} y1="209" x2={x} y2="209" stroke={C.brand} strokeWidth="2" />}
          <line x1={x} y1="209" x2={x} y2="248" stroke={C.brand} strokeWidth="2" />
          {/* AP */}
          <rect x={x - 26} y="240" width="52" height="16" rx="8" fill={C.brand} />
          <text x={x} y="252" textAnchor="middle" fontSize="9.5" fontWeight="700" fill="white">AP {i + 1}</text>
          <path d={`M${x - 14} 236 a14 14 0 0 1 28 0`} stroke={C.sky} strokeWidth="1.5" fill="none" />
        </g>
      ))}
      <text x="560" y="200" fontSize="10.5" fill={C.muted}>Wi-Fi 6 · Fast Roaming (802.11r/k/v)</text>
      <text x="90" y="200" fontSize="10.5" fill={C.muted}>Wired LAN → PLC / เครื่องจักรอยู่กับที่</text>

      {/* ชั้นรถ */}
      <Agv x={60} y={330} label="AGV-01" batt={85} />
      <Agv x={160} y={330} label="AGV-02" batt={22} busy={false} />
      <Agv x={260} y={330} label="AGV-03" batt={64} />
      <Agv x={360} y={330} label="AMR-04" batt={95} />
      <Box x={470} y={324} w={110} h={54} title="PLC" sub="เครื่องจักร / สายพาน" />
      <Box x={600} y={324} w={120} h={54} title="Charging" sub="สถานีชาร์จอัตโนมัติ" />
      {/* เส้นสถานะ */}
      <text x="300" y="421" fontSize="9.5" fill={C.red} fontWeight="700">AGV-02 แบตต่ำ → FMS สั่งไปชาร์จอัตโนมัติ</text>
      <path d="M188 400 C 220 418, 260 418, 290 418 L 560 418 C 620 418, 650 400, 660 382" stroke={C.red} strokeWidth="1.5" strokeDasharray="4 3" fill="none" markerEnd="url(#arw)" />
      <line x1="525" y1="324" x2="525" y2="256" stroke={C.brand} strokeWidth="1.5" strokeDasharray="4 3" />
      <text x="530" y="300" fontSize="9.5" fill={C.muted}>Wired</text>
    </svg>
  );
}

/** เปรียบเทียบ V2V (คุยกันเอง) กับ FMS (หอบังคับการ) ที่ทางแยก */
export function TrafficControlDiagram() {
  return (
    <svg viewBox="0 0 520 260" className="w-full h-auto" role="img" aria-label="FMS ควบคุมจราจรที่ทางแยก">
      <defs><marker id="arw2" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill={C.sky} /></marker></defs>
      {/* ทางเดิน */}
      <rect x="0" y="100" width="520" height="60" fill={C.ice} />
      <rect x="230" y="0" width="60" height="260" fill={C.ice} />
      <rect x="230" y="100" width="60" height="60" fill="#DCE8F2" />
      <line x1="0" y1="130" x2="520" y2="130" stroke="white" strokeWidth="2" strokeDasharray="8 6" />
      <line x1="260" y1="0" x2="260" y2="260" stroke="white" strokeWidth="2" strokeDasharray="8 6" />
      {/* หอบังคับการ */}
      <rect x="380" y="18" width="120" height="50" rx="10" fill={C.navy} />
      <text x="440" y="39" textAnchor="middle" fontSize="12" fontWeight="800" fill="white">FMS</text>
      <text x="440" y="56" textAnchor="middle" fontSize="9.5" fill="#D7E6F3">จองทางแยก · จัดคิว</text>
      {/* รถ */}
      <g transform="translate(120,112)"><rect width="60" height="36" rx="8" fill={C.sky} /><text x="30" y="23" textAnchor="middle" fontSize="11" fontWeight="700" fill="white">AGV-01</text></g>
      <g transform="translate(242,190)"><rect width="36" height="56" rx="8" fill={C.amber} /><text x="18" y="33" textAnchor="middle" fontSize="10" fontWeight="700" fill="white">02</text></g>
      <line x1="185" y1="130" x2="225" y2="130" stroke={C.sky} strokeWidth="2.5" markerEnd="url(#arw2)" />
      {/* สัญญาณ */}
      <circle cx="205" cy="92" r="7" fill={C.green} /><text x="205" y="80" textAnchor="middle" fontSize="9.5" fill={C.green} fontWeight="700">GO</text>
      <circle cx="305" cy="180" r="7" fill={C.red} /><text x="322" y="184" fontSize="9.5" fill={C.red} fontWeight="700">WAIT</text>
      {/* เส้นสื่อสาร */}
      <path d="M150 112 C 200 40, 330 40, 380 40" stroke={C.brand} strokeWidth="1.5" strokeDasharray="4 3" fill="none" />
      <path d="M262 190 C 300 90, 360 70, 385 66" stroke={C.brand} strokeWidth="1.5" strokeDasharray="4 3" fill="none" />
      <text x="20" y="30" fontSize="11" fill={C.muted}>รหัส 15: ขอเข้าทางร่วม</text>
      <text x="20" y="46" fontSize="11" fill={C.muted}>รหัส 16: แจ้งออกทางร่วม</text>
      <text x="20" y="245" fontSize="10.5" fill={C.muted}>ทุกคันคุยผ่าน FMS — ไม่ตัดสินใจกันเอง จึงไม่กระจุกและไม่ชนที่ทางแยก</text>
    </svg>
  );
}

/** ผังการวาง Access Point แบบสลับฟันปลา (staggered) ระยะ 25–30 ม. */
export function WifiLayoutDiagram() {
  const aps: [number, number][] = [[90, 70], [230, 70], [370, 70], [160, 165], [300, 165], [440, 165], [90, 260], [230, 260], [370, 260]];
  return (
    <svg viewBox="0 0 520 330" className="w-full h-auto" role="img" aria-label="ผังการติดตั้ง Access Point แบบสลับฟันปลา">
      <rect x="10" y="10" width="500" height="310" rx="12" fill="#F4F7FA" stroke={C.ice} />
      {/* ชั้นวาง */}
      {[40, 120, 200, 280, 360, 440].map((x) => <rect key={x} x={x} y="30" width="30" height="270" rx="4" fill="#DCE8F2" />)}
      {aps.map(([x, y], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r="62" fill={i % 2 ? C.sky : C.brand} opacity="0.13" />
          <circle cx={x} cy={y} r="62" fill="none" stroke={i % 2 ? C.sky : C.brand} strokeWidth="1" strokeDasharray="3 3" opacity="0.6" />
          <circle cx={x} cy={y} r="7" fill={C.navy} />
          <text x={x} y={y - 12} textAnchor="middle" fontSize="9.5" fontWeight="700" fill={C.navy}>AP{i + 1} · ch{[1, 6, 11][i % 3]}</text>
        </g>
      ))}
      {/* ระยะ */}
      <line x1="90" y1="300" x2="230" y2="300" stroke={C.amber} strokeWidth="2" />
      <text x="160" y="316" textAnchor="middle" fontSize="10.5" fontWeight="700" fill={C.amber}>25–30 ม.</text>
      {/* เส้นทางรถ */}
      <path d="M30 118 H490 M30 212 H490" stroke={C.green} strokeWidth="2" strokeDasharray="6 4" fill="none" />
      <text x="470" y="110" fontSize="9.5" fill={C.green} fontWeight="700">เส้นทาง AGV</text>
    </svg>
  );
}
