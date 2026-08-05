"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useMockAuth } from "@/lib/mockAuth";

export default function LoginPage() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const { login } = useMockAuth();
  const router = useRouter();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    login(name || "สมาชิกทดลอง", email || "demo@example.com");
    router.push("/academy/dashboard");
  };

  return (
    <section className="section-pad bg-ice/40">
      <div className="container-site max-w-[440px]">
        <div className="card-white p-8">
          <div className="flex rounded-xl bg-ice p-1 mb-6">
            {(["login", "register"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`flex-1 py-2 rounded-lg text-[14px] font-semibold transition ${mode === m ? "bg-white text-navy shadow-sm" : "text-muted"}`}
              >
                {m === "login" ? "เข้าสู่ระบบ" : "สมัครสมาชิก"}
              </button>
            ))}
          </div>

          <h1 className="text-[22px] font-bold text-navy">
            {mode === "login" ? "ยินดีต้อนรับกลับ" : "สมัครสมาชิกฟรี"}
          </h1>
          <p className="text-[13px] text-muted mt-1">
            (เดโม — กรอกอะไรก็ได้ ระบบจะจำลองการเข้าสู่ระบบ)
          </p>

          <form onSubmit={submit} className="mt-5 space-y-4">
            {mode === "register" && (
              <div>
                <label className="block text-[13.5px] font-semibold text-navy mb-1">ชื่อ-นามสกุล</label>
                <input value={name} onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl border border-ice px-4 py-2.5 text-[15px] focus:outline-none focus:border-brand" />
              </div>
            )}
            <div>
              <label className="block text-[13.5px] font-semibold text-navy mb-1">อีเมล</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-ice px-4 py-2.5 text-[15px] focus:outline-none focus:border-brand" />
            </div>
            <div>
              <label className="block text-[13.5px] font-semibold text-navy mb-1">รหัสผ่าน</label>
              <input type="password"
                className="w-full rounded-xl border border-ice px-4 py-2.5 text-[15px] focus:outline-none focus:border-brand" />
            </div>
            <button type="submit" className="btn btn-primary w-full">
              {mode === "login" ? "เข้าสู่ระบบ" : "สมัครสมาชิก"}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
