// Tailwind v4 ใช้ CSS ใหม่ (@layer, oklch) ที่เบราว์เซอร์มือถือรุ่นเก่า (เช่น Mi Browser บางเวอร์ชัน) ยังไม่รองรับ
// → แปลง cascade layers และสี oklch ให้เป็นรูปแบบเก่าหลังจาก Tailwind สร้าง CSS แล้ว
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
    "@csstools/postcss-oklab-function": { preserve: true },
    "@csstools/postcss-cascade-layers": {},
  },
};

export default config;
