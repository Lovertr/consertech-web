import Image from "next/image";

// รูปรถ AGV — ภาพ mockup 3D โทนเทาที่เรนเดอร์เอง (public/images/vehicles) ไม่ติดลิขสิทธิ์บุคคลที่สาม
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
