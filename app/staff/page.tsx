"use client";

// Zone C — เข้าสู่ระบบพนักงาน (Supabase Auth จริง)

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function StaffLogin() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // ล็อกอินค้างอยู่แล้ว → เข้า Portal เลย
  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.replace("/staff/dashboard");
    });
  }, [router]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) { router.push("/staff/dashboard"); return; }
    setBusy(true);
    setError(null);
    const { error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (err) {
      setError(err.message === "Invalid login credentials" ? "อีเมลหรือรหัสผ่านไม่ถูกต้อง" : err.message);
      return;
    }
    router.push("/staff/dashboard");
  };

  return (
    <section className="section-pad bg-navy min-h-[70vh]">
      <div className="container-site max-w-[440px]">
        <div className="card-white p-6 min-[600px]:p-8">
          <p className="text-[11px] font-bold tracking-widest text-sky uppercase">Staff Portal</p>
          <h1 className="mt-1 text-[22px] font-bold text-navy">เข้าสู่ระบบพนักงาน</h1>
          <p className="text-[13px] text-muted mt-1">ใช้บัญชีที่แอดมินสร้างให้ — ล็อกอินครั้งแรกระบบจะให้ตั้งรหัสผ่านใหม่</p>

          <form onSubmit={submit} className="mt-6 space-y-4">
            <div>
              <label className="block text-[13.5px] font-semibold text-navy mb-1">อีเมลพนักงาน</label>
              <input
                type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="name@cs-th.com" autoComplete="username"
                className="w-full rounded-xl border border-ice px-4 py-2.5 text-[15px] focus:outline-none focus:border-brand"
              />
            </div>
            <div>
              <label className="block text-[13.5px] font-semibold text-navy mb-1">รหัสผ่าน</label>
              <input
                type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                className="w-full rounded-xl border border-ice px-4 py-2.5 text-[15px] focus:outline-none focus:border-brand"
              />
            </div>
            {error && (
              <p className="text-[13px] font-semibold text-white bg-[#D94141] rounded-lg px-3 py-2">⚠ {error}</p>
            )}
            <button type="submit" disabled={busy} className="btn btn-primary w-full disabled:opacity-60">
              {busy ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
            </button>
          </form>

          <p className="mt-5 text-[11.5px] text-muted/80 leading-relaxed bg-ice/50 rounded-lg px-3 py-2">
            ลืมรหัสผ่าน? แจ้งแอดมินให้รีเซ็ตรหัสได้ที่หน้า &ldquo;จัดการผู้ใช้&rdquo;
          </p>
        </div>
      </div>
    </section>
  );
}
