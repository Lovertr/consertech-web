"use client";

// โครงหน้า Portal ภายใน — sidebar เมนูเปลี่ยนตามสิทธิ์แผนก (Permission Matrix ใน Blueprint)
// department switcher มีไว้เดโมเท่านั้น — production ผูก role จริงจาก Supabase Auth และลบออก

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, createContext, useContext, ReactNode } from "react";
import { departments, type Department } from "@/lib/data";
import { permissions, modulesMeta, type ModuleKey, type Access } from "@/lib/staffData";

const DeptCtx = createContext<{ dept: Department; access: (m: ModuleKey) => Access }>({
  dept: "sales",
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
  expenses: "/staff/expenses",
  leave: "/staff/leave",
  kpi: "/staff/kpi",
  finance: "/staff/finance",
  master: "/staff/master",
  users: "/staff/users",
};

export default function StaffShell({ children, title }: { children: ReactNode; title?: string }) {
  const [dept, setDept] = useState<Department>("sales");
  const [ready, setReady] = useState(false); // รอโหลดแผนกจาก localStorage ก่อนค่อยเช็กสิทธิ์ redirect
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    try {
      const saved = localStorage.getItem("consertech-staff-dept") as Department | null;
      if (saved && permissions[saved]) setDept(saved);
    } catch {}
    setReady(true);
  }, []);

  const access = (m: ModuleKey) => permissions[dept][m];
  const deptLabel = departments.find((d) => d.key === dept)?.label;

  // ถ้าแผนกไม่มีสิทธิ์หน้าปัจจุบัน ให้เด้งกลับภาพรวม
  useEffect(() => {
    if (!ready) return;
    const current = (Object.entries(routes) as [ModuleKey, string][]).find(([, r]) => pathname.startsWith(r));
    if (current && permissions[dept][current[0]] === "none") router.replace("/staff/dashboard");
  }, [ready, dept, pathname, router]);

  return (
    <DeptCtx.Provider value={{ dept, access }}>
      <div className="min-h-[85vh] bg-ice/40">
        <div className="container-site py-4 min-[820px]:py-6 grid gap-4 min-[820px]:gap-6 min-[820px]:grid-cols-[230px_1fr] items-start">
          {/* Sidebar — มือถือ: แถบชิปเลื่อนแนวนอน / จอใหญ่: เมนูแนวตั้ง */}
          <aside className="min-w-0 max-w-full card-white p-2.5 min-[820px]:p-4 min-[820px]:sticky min-[820px]:top-24">
            <p className="hidden min-[820px]:block text-[11px] font-bold tracking-widest text-sky uppercase px-2">
              Portal — {deptLabel}
            </p>
            <nav className="min-[820px]:mt-2 flex min-[820px]:flex-col gap-1 overflow-x-auto max-w-full pb-1 min-[820px]:pb-0 [-webkit-overflow-scrolling:touch]">
              {modulesMeta.map((m) => {
                const acc = permissions[dept][m.key];
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
              <p className="hidden min-[820px]:block text-[10.5px] text-muted/70 mb-1">สลับแผนก (เดโม):</p>
              <select
                value={dept}
                onChange={(e) => {
                  const d = e.target.value as Department;
                  setDept(d);
                  try { localStorage.setItem("consertech-staff-dept", d); } catch {}
                }}
                className="flex-1 min-[820px]:flex-none min-w-0 min-[820px]:w-full text-[12.5px] min-[820px]:text-[13px] rounded-lg border border-ice px-2 py-1.5 bg-white"
                aria-label="สลับแผนก (เดโม)"
              >
                {departments.map((d) => (
                  <option key={d.key} value={d.key}>{d.label}</option>
                ))}
              </select>
              <Link href="/staff" className="shrink-0 min-[820px]:block min-[820px]:mt-3 text-[12.5px] min-[820px]:text-[13px] text-sky font-semibold hover:text-brand whitespace-nowrap">
                ← ออกจากระบบ
              </Link>
            </div>
          </aside>

          {/* Content */}
          <div className="min-w-0 max-w-full">
            {title && <h1 className="text-[22px] min-[900px]:text-[28px] font-bold mb-1">{title}</h1>}
            <p className="text-[12px] text-muted mb-4">ข้อมูลจำลองสำหรับเดโม (Mockup) — ยังไม่เชื่อมต่อฐานข้อมูลจริง</p>
            {children}
          </div>
        </div>
      </div>
    </DeptCtx.Provider>
  );
}
