// ภาพ placeholder — รูป AGV จริงรอยืนยันลิขสิทธิ์/รอไฟล์จาก CEO
// เมื่อได้รูปแล้ว: วางไฟล์ใน public/images/ แล้วเปลี่ยน <Placeholder> เป็น <Image>

export default function Placeholder({
  label = "รอรูปจริง",
  ratio = "1/1",
  className = "",
}: {
  label?: string;
  ratio?: string;
  className?: string;
}) {
  return (
    <div
      className={`relative flex items-center justify-center overflow-hidden rounded-xl bg-white border border-ice ${className}`}
      style={{ aspectRatio: ratio }}
      role="img"
      aria-label={label}
    >
      <svg viewBox="0 0 200 140" className="w-3/5 text-sky/60" fill="none" stroke="currentColor" strokeWidth="4">
        {/* โครงร่างรถ AGV อย่างง่าย */}
        <rect x="30" y="55" width="140" height="45" rx="8" />
        <rect x="45" y="38" width="60" height="17" rx="4" />
        <circle cx="60" cy="108" r="12" />
        <circle cx="140" cy="108" r="12" />
        <path d="M150 46 l14 -14 M158 54 l14 -14 M166 62 l10 -10" strokeWidth="3" />
        <circle cx="148" cy="48" r="3" fill="currentColor" stroke="none" />
      </svg>
      <span className="absolute bottom-2 right-3 text-[11px] text-muted/70">{label}</span>
    </div>
  );
}
