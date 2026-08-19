"use client";

// โครงหน้า Portal ภายใน — ระบุตัวตนจากบัญชีล็อกอินจริง (Supabase Auth)
// สิทธิ์รายคน = ค่าเริ่มต้นของแผนก + ที่แอดมินปรับรายคน (หน้าจัดการผู้ใช้)
// ล็อกอินครั้งแรก (หรือหลังแอดมินรีเซ็ตรหัส) → บังคับตั้งรหัสผ่านใหม่ก่อนใช้งาน

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, createContext, useContext, ReactNode } from "react";
import { departments, type Department } from "@/lib/data";
import { permissions, modulesMeta, employees as mockEmployees, type ModuleKey, type Access } from "@/lib/staffData";
import { supabase } from "@/lib/supabase";

export type AccessOverrides = Record<string, Partial<Record<ModuleKey, Access>>>;
export const OVERRIDES_KEY = "consertech-access-overrides";
export const PERMS_EVENT = "consertech-perms-updated";

type EmpInfo = { id: string; name: string; dept: Department; email: string; mustChange: boolean; avatar?: string | null; nickname?: string | null };

const DeptCtx = createContext<{ dept: Department; empId: string; access: (m: ModuleKey) => Access }>({
  dept: "sales",
  empId: "EMP-001",
  access: () => "none",
});
export const useDept = () => useContext(DeptCtx);

const routes: Record<ModuleKey, string> = {
  dashboard: "/staff/dashboard",
  crm: "/staff/crm",
  documents: "/staff/documents",
  clients: "/staff/clients",
  projects: "/staff/projects",
  tasks: "/staff/tasks",
  meetings: "/staff/meetings",
  calendar: "/staff/calendar",
  content: "/staff/content",
  learn: "/staff/learn",
  expenses: "/staff/expenses",
  leave: "/staff/leave",
  kpi: "/staff/kpi",
  finance: "/staff/finance",
  master: "/staff/master",
  users: "/staff/users",
};

// ── ฟอร์มบังคับตั้งรหัสผ่านใหม่ (ล็อกอินครั้งแรก/หลังรีเซ็ต) ──
function ForcePasswordChange({ email, onDone }: { email: string; onDone: () => void }) {
  const [pw1, setPw1] = useState("");
  const [pw2, setPw2] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pw1.length < 6) { setErr("รหัสผ่านใหม่ต้องยาวอย่างน้อย 6 ตัวอักษร"); return; }
    if (pw1 !== pw2) { setErr("รหัสผ่านทั้งสองช่องไม่ตรงกัน"); return; }
    if (!supabase) return;
    setBusy(true);
    setErr(null);
    const { error } = await supabase.auth.updateUser({ password: pw1 });
    if (error) { setErr(error.message); setBusy(false); return; }
    await supabase.rpc("clear_my_must_change");
    setBusy(false);
    onDone();
  };

  return (
    <div className="min-h-[70vh] bg-ice/40 flex items-start justify-center pt-10 px-4">
      <div className="card-white p-6 min-[600px]:p-8 w-full max-w-[440px]">
        <p className="text-[11px] font-bold tracking-widest text-amber uppercase">First Login</p>
        <h1 className="mt-1 text-[20px] font-bold text-navy">ตั้งรหัสผ่านใหม่ก่อนเริ่มใช้งาน</h1>
        <p className="text-[13px] text-muted mt-1">
          บัญชี <strong className="text-navy">{email}</strong> ยังใช้รหัสเริ่มต้นอยู่ — เพื่อความปลอดภัย กรุณาตั้งรหัสผ่านของคุณเอง (อย่างน้อย 6 ตัวอักษร)
        </p>
        <form onSubmit={submit} className="mt-5 space-y-3.5">
          <div>
            <label className="block text-[13.5px] font-semibold text-navy mb-1">รหัสผ่านใหม่</label>
            <input type="password" required value={pw1} onChange={(e) => setPw1(e.target.value)} autoComplete="new-password"
              className="w-full rounded-xl border border-ice px-4 py-2.5 text-[15px] focus:outline-none focus:border-brand" />
          </div>
          <div>
            <label className="block text-[13.5px] font-semibold text-navy mb-1">ยืนยันรหัสผ่านใหม่</label>
            <input type="password" required value={pw2} onChange={(e) => setPw2(e.target.value)} autoComplete="new-password"
              className="w-full rounded-xl border border-ice px-4 py-2.5 text-[15px] focus:outline-none focus:border-brand" />
          </div>
          {err && <p className="text-[13px] font-semibold text-white bg-[#D94141] rounded-lg px-3 py-2">⚠ {err}</p>}
          <button type="submit" disabled={busy} className="btn btn-primary w-full disabled:opacity-60">
            {busy ? "กำลังบันทึก..." : "บันทึกรหัสผ่านใหม่และเข้าใช้งาน"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function StaffShell({ children, title }: { children: ReactNode; title?: string }) {
  // undefined = กำลังโหลด, null = ไม่มี
  const [sessionEmail, setSessionEmail] = useState<string | null | undefined>(undefined);
  const [empInfo, setEmpInfo] = useState<EmpInfo | null | undefined>(undefined);
  const [overrides, setOverrides] = useState<AccessOverrides>({});
  const pathname = usePathname();
  const router = useRouter();

  // สถานะล็อกอิน
  useEffect(() => {
    if (!supabase) { setSessionEmail(null); return; }
    supabase.auth.getSession().then(({ data }) => setSessionEmail(data.session?.user?.email ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSessionEmail(s?.user?.email ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);

  // หาข้อมูลพนักงานจากอีเมลที่ล็อกอิน
  useEffect(() => {
    if (sessionEmail === undefined) return;
    if (sessionEmail === null) {
      if (!supabase) {
        // โหมดเดโม (ไม่มีการเชื่อมต่อ): ใช้พนักงานตัวอย่างคนแรก
        const m = mockEmployees[0];
        setEmpInfo({ id: m.id, name: m.name, dept: m.dept, email: "demo", mustChange: false });
      } else {
        router.replace("/staff"); // ยังไม่ล็อกอิน → ไปหน้า Login
      }
      return;
    }
    (async () => {
      const { data } = await supabase!
        .from("employees").select("id,name,dept,email,must_change_password,avatar_url,nickname")
        .eq("email", sessionEmail).single();
      if (data) {
        setEmpInfo({ id: data.id, name: data.name, dept: data.dept as Department, email: data.email, mustChange: data.must_change_password, avatar: data.avatar_url ?? null, nickname: data.nickname ?? null });
      } else {
        setEmpInfo(null); // มีบัญชีแต่ไม่ผูกกับพนักงาน
      }
    })();
  }, [sessionEmail, router]);

  // สิทธิ์รายคนจากฐานข้อมูล
  useEffect(() => {
    const loadOverrides = async () => {
      if (supabase) {
        const { data, error } = await supabase.from("access_overrides").select("emp_id,module,access");
        if (!error && data) {
          const o: AccessOverrides = {};
          for (const r of data) (o[r.emp_id] ??= {})[r.module as ModuleKey] = r.access as Access;
          setOverrides(o);
          return;
        }
      }
      try { setOverrides(JSON.parse(localStorage.getItem(OVERRIDES_KEY) ?? "{}")); } catch {}
    };
    loadOverrides();
    window.addEventListener(PERMS_EVENT, loadOverrides);
    return () => window.removeEventListener(PERMS_EVENT, loadOverrides);
  }, []);

  const dept = empInfo?.dept ?? "sales";
  const empId = empInfo?.id ?? "";
  const deptLabel = departments.find((d) => d.key === dept)?.label;
  const access = (m: ModuleKey): Access => (empInfo ? overrides[empInfo.id]?.[m] ?? permissions[dept][m] : "none");

  // ไม่มีสิทธิ์หน้าปัจจุบัน → เด้งกลับภาพรวม
  useEffect(() => {
    if (!empInfo) return;
    const current = (Object.entries(routes) as [ModuleKey, string][]).find(([, r]) => pathname.startsWith(r));
    if (current && access(current[0]) === "none") router.replace("/staff/dashboard");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empInfo, overrides, pathname, router]);

  const logout = async () => {
    if (supabase) await supabase.auth.signOut();
    router.replace("/staff");
  };

  // ── สถานะกลาง ──
  if (sessionEmail === undefined || (sessionEmail !== null && empInfo === undefined)) {
    return <div className="min-h-[60vh] bg-ice/40 flex items-center justify-center text-[14px] text-muted">⏳ กำลังตรวจสอบสิทธิ์...</div>;
  }
  if (sessionEmail !== null && empInfo === null) {
    return (
      <div className="min-h-[60vh] bg-ice/40 flex items-center justify-center px-4">
        <div className="card-white p-6 max-w-[420px] text-center">
          <p className="text-[15px] font-bold text-navy">บัญชี {sessionEmail} ยังไม่ผูกกับข้อมูลพนักงาน</p>
          <p className="text-[13px] text-muted mt-1.5">แจ้งแอดมินให้ผูกบัญชีนี้กับพนักงานที่หน้า &ldquo;จัดการผู้ใช้&rdquo;</p>
          <button onClick={logout} className="btn btn-outline mt-4 text-[13px]">← ออกจากระบบ</button>
        </div>
      </div>
    );
  }
  if (empInfo?.mustChange && sessionEmail) {
    return <ForcePasswordChange email={empInfo.email} onDone={() => setEmpInfo({ ...empInfo, mustChange: false })} />;
  }

  return (
    <DeptCtx.Provider value={{ dept, empId, access }}>
      <div className="min-h-[85vh] bg-ice/40 overflow-x-hidden [overflow-wrap:anywhere]">
        <div className="container-site py-4 min-[820px]:py-6 grid gap-4 min-[820px]:gap-6 min-[820px]:grid-cols-[230px_1fr] items-start">
          {/* Sidebar — มือถือ: แถบชิปเลื่อนแนวนอน / จอใหญ่: เมนูแนวตั้ง */}
          <aside className="min-w-0 max-w-full card-white p-2.5 min-[820px]:p-4 min-[820px]:sticky min-[820px]:top-24">
            <p className="hidden min-[820px]:block text-[11px] font-bold tracking-widest text-sky uppercase px-2">
              Portal — {deptLabel}
            </p>
            <p className="hidden min-[820px]:flex items-center gap-1.5 text-[12px] font-bold text-navy px-2 mt-0.5 truncate">
              {empInfo?.avatar
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={empInfo.avatar} alt="" className="w-6 h-6 rounded-full object-cover border border-ice shrink-0" />
                : <span>👤</span>}
              <span className="truncate">{empInfo?.name}{empInfo?.nickname ? ` (${empInfo.nickname})` : ""}</span>
            </p>
            {empInfo?.email !== "demo" && (
              <p className="hidden min-[820px]:block text-[10.5px] text-muted px-2 truncate">{empInfo?.email}</p>
            )}
            <nav className="min-[820px]:mt-2 flex min-[820px]:flex-col gap-1 overflow-x-auto max-w-full pb-1 min-[820px]:pb-0 [-webkit-overflow-scrolling:touch]">
              {modulesMeta.map((m) => {
                const acc = access(m.key);
                if (acc === "none") return null;
                const active = pathname.startsWith(routes[m.key]);
                return (
                  <Link
                    key={m.key}
                    href={routes[m.key]}
                    className={`flex items-center gap-1.5 min-[820px]:gap-2 px-2.5 min-[820px]:px-3 py-2 min-[820px]:py-2.5 rounded-lg text-[13px] min-[820px]:text-[14px] whitespace-nowrap shrink-0 transition ${
                      active ? "bg-brand text-white font-bold" : "text-muted hover:bg-ice bg-ice/40 min-[820px]:bg-transparent"
                    }`}
                  >
                    <span>{m.icon}</span>
                    <span className="min-[820px]:flex-1">{m.label}</span>
                    {acc === "read" && (
                      <span className={`hidden min-[820px]:inline text-[9.5px] font-bold rounded px-1.5 py-0.5 ${active ? "bg-white/20 text-white" : "bg-ice text-sky"}`}>
                        ดูเท่านั้น
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>

            <div className="mt-2 min-[820px]:mt-4 border-t border-ice pt-2 min-[820px]:pt-3 min-[820px]:px-2 flex min-[820px]:flex-col items-center min-[820px]:items-stretch gap-2 min-[820px]:gap-0">
              <button onClick={logout} className="shrink-0 min-[820px]:block text-left text-[12.5px] min-[820px]:text-[13px] text-sky font-semibold hover:text-brand whitespace-nowrap">
                ← ออกจากระบบ
              </button>
            </div>
          </aside>

          {/* Content */}
          <div className="min-w-0 max-w-full">
            {title && <h1 className="text-[22px] min-[900px]:text-[28px] font-bold mb-1">{title}</h1>}
            <p className="text-[12px] text-muted mb-4">
              {supabase
                ? "🟢 บัญชีผู้ใช้ · ลงเวลา · จัดการผู้ใช้ · สิทธิ์เข้าถึง — เชื่อมฐานข้อมูลจริงแล้ว | โมดูลอื่นยังเป็นข้อมูลจำลอง (ทยอยเชื่อมตาม Roadmap)"
                : "ข้อมูลจำลองสำหรับเดโม (Mockup) — ยังไม่เชื่อมต่อฐานข้อมูลจริง"}
            </p>
            {children}
          </div>
        </div>
      </div>
    </DeptCtx.Provider>
  );
}
