"use client";

// Zone C — Staff Login (mock): เลือกแผนกเพื่อเข้าระบบ
// Production: เปลี่ยนเป็น auth จริง + role จากฐานข้อมูล และลบตัวเลือกแผนกออก

import { useRouter } from "next/navigation";
import { useState } from "react";
import { departments, type Department } from "@/lib/data";

export default function StaffLogin() {
  const [dept, setDept] = useState<Department>("sales");
  const router = useRouter();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      localStorage.setItem("consertech-staff-dept", dept);
    } catch {}
    router.push("/staff/dashboard");
  };

  return (
    <section className="section-pad bg-navy min-h-[70vh]">
      <div className="container-site max-w-[440px]">
        <div className="card-white p-8">
          <p className="text-[11px] font-bold tracking-widest text-sky uppercase">Staff Portal</p>
          <h1 className="mt-1 text-[22px] font-bold text-navy">เข้าสู่ระบบพนักงาน</h1>
          <p className="text-[13px] text-muted mt-1">(เดโม — เลือกแผนกเพื่อดู Dashboard ของแผนกนั้น)</p>

          <form onSubmit={submit} className="mt-6 space-y-4">
            <div>
              <label className="block text-[13.5px] font-semibold text-navy mb-1">อีเมลพนักงาน</label>
              <input type="email" placeholder="name@cs-th.com"
                className="w-full rounded-xl border border-ice px-4 py-2.5 text-[15px] focus:outline-none focus:border-brand" />
            </div>
            <div>
              <label className="block text-[13.5px] font-semibold text-navy mb-1">รหัสผ่าน</label>
              <input type="password"
                className="w-full rounded-xl border border-ice px-4 py-2.5 text-[15px] focus:outline-none focus:border-brand" />
            </div>
            <div>
              <label className="block text-[13.5px] font-semibold text-navy mb-1">แผนก</label>
              <select
                value={dept}
                onChange={(e) => setDept(e.target.value as Department)}
                className="w-full rounded-xl border border-ice px-4 py-2.5 text-[15px] bg-white focus:outline-none focus:border-brand"
              >
                {departments.map((d) => (
                  <option key={d.key} value={d.key}>{d.label}</option>
                ))}
              </select>
            </div>
            <button type="submit" className="btn btn-primary w-full">เข้าสู่ระบบ</button>
          </form>
        </div>
      </div>
    </section>
  );
}
