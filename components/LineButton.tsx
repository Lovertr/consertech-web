// ปุ่มลอย Line OA — มุมขวาล่าง fixed ตามดีไซน์
// TODO: ใส่ลิงก์ Line OA จริงเมื่อได้ ID จากบริษัท
export default function LineButton() {
  return (
    <a
      href="#contact"
      aria-label="ติดต่อผ่าน Line"
      className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-full bg-[#06C755] text-white font-bold pl-3 pr-4 py-3 shadow-lg hover:brightness-95 transition"
    >
      <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor" aria-hidden>
        <path d="M12 2C6.48 2 2 5.64 2 10.13c0 4.03 3.58 7.4 8.41 8.04.33.07.77.22.89.5.1.26.07.66.03.92l-.14.87c-.04.26-.2 1.01.88.55 1.09-.46 5.87-3.46 8.01-5.92C21.66 13.5 22 11.88 22 10.13 22 5.64 17.52 2 12 2z" />
      </svg>
      <span className="text-sm">Line OA</span>
    </a>
  );
}
