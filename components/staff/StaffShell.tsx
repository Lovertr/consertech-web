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
};

export default function StaffShell({ children, title }: { children: ReactNode; title?: string }) {
  const [dept, setDept] = useState<Department>("sales");
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    try {
      const saved = localStorage.getItem("consertech-staff-dept") as Department | null;
      if (saved && permissions[saved]) setDept(saved);
    } catch {}
  }, []);

  const access = (m: ModuleKey) => permissions[dept][m];
  const deptLabel = departments.find((d) => d.key === dept)?.label;

  // ถ้าแผนกไม่มีสิทธิ์หน้าปัจจุบัน ให้เด้งกลับภาพรวม
  useEffect(() => {
    const current = (Object.entries(routes) as [ModuleKey, string][]).find(([, r]) => pathname.startsWith(r));
    if (current && permissions[dept][current[0]] === "none") router.replace("/staff/dashboard");
  }, [dept, pathname, router]);

  return (
    <DeptCtx.Provider value={{ dept, access }}>
      <div className="min-h-[85vh] bg-ice/40">
        <div className="container-site py-6 grid gap-6 min-[820px]:grid-cols-[230px_1fr] items-start">
          {/* Sidebar */}
          <aside className="card-white p-4 min-[820px]:sticky min-[820px]:top-24">
            <p className="text-[11px] font-bold tracking-widest text-sky uppercase px-2">Portal — {deptLabel}</p>
            <nav className="mt-2 flex min-[820px]:flex-col gap-1 overflow-x-auto">
              {modulesMeta.map((m) => {
                const acc = permissions[dept][m.key];
                if (acc === "none") return null;
                const active = pathname.startsWith(routes[m.key]);
                return (
                  <Link
                    key={m.key}
                    href={routes[m.key]}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-[14px] whitespace-nowrap transition ${
                      active ? "bg-brand text-white font-bold" : "text-muted hover:bg-ice"
                    }`}
                  >
                    <span>{m.icon}</span>
                    <span className="flex-1">{m.label}</span>
                    {acc === "read" && (
                      <span className={`text-[9.5px] font-bold rounded px-1.5 py-0.5 ${active ? "bg-white/20 text-white" : "bg-ice text-sky"}`}>
                        ดูเท่านั้น
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>

            <div className="mt-4 border-t border-ice pt-3 px-2">
              <p className="text-[10.5px] text-muted/70 mb-1">สลับแผนก (เดโม):</p>
              <select
                value={dept}
                onChange={(e) => {
                  const d = e.target.value as Department;
                  setDept(d);
                  try { localStorage.setItem("consertech-staff-dept", d); } catch {}
                }}
                className="w-full text-[13px] rounded-lg border border-ice px-2 py-1.5 bg-white"
              >
                {departments.map((d) => (
                  <option key={d.key} value={d.key}>{d.label}</option>
                ))}
              </select>
              <Link href="/staff" className="block mt-3 text-[13px] text-sky font-semibold hover:text-brand">← ออกจากระบบ</Link>
            </div>
          </aside>

          {/* Content */}
          <div>
            {title && <h1 className="text-[24px] min-[900px]:text-[28px] font-bold mb-1">{title}</h1>}
            <p className="text-[12px] text-muted mb-4">ข้อมูลจำลองสำหรับเดโม (Mockup) — ยังไม่เชื่อมต่อฐานข้อมูลจริง</p>
            {children}
          </div>
        </div>
      </div>
    </DeptCtx.Provider>
  );
}
