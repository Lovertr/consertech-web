import Image from "next/image";

// รูปสินค้า AGV — ตอนนี้ใช้รูปชั่วคราวจากเอกสาร Master (ยังไม่เผยแพร่สาธารณะ)
// TODO: เปลี่ยนเป็นรูปที่บริษัทยืนยันลิขสิทธิ์แล้วก่อนเปิดตัวเว็บจริง
export default function AgvImage({
  src,
  alt,
  ratio = "1/1",
  className = "",
  sizes = "(max-width: 900px) 50vw, 25vw",
}: {
  src: string;
  alt: string;
  ratio?: string;
  className?: string;
  sizes?: string;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-xl bg-white border border-ice ${className}`}
      style={{ aspectRatio: ratio }}
    >
      <Image src={src} alt={alt} fill sizes={sizes} className="object-contain p-3" />
    </div>
  );
}
