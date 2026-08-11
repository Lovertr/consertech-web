"use client";

// โครงหน้า Portal ภายใน — เมนูเปลี่ยนตาม "สิทธิ์รายคน" = ค่าเริ่มต้นของแผนก + ที่แอดมินปรับรายคน (หน้าจัดการผู้ใช้)
// user switcher มีไว้เดโมเท่านั้น — production ผูกบัญชีจริงจาก Supabase Auth และลบออก

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, createContext, useContext, ReactNode } from "react";
import { departments, type Department } from "@/lib/data";
import { permissions, modulesMeta, employees, type ModuleKey, type Access } from "@/lib/staffData";
import { supabase } from "@/lib/supabase";

export type AccessOverrides = Record<string, Partial<Record<ModuleKey, Access>>>;
export const OVERRIDES_KEY = "consertech-access-overrides";
export const EMP_KEY = "consertech-staff-emp";
export const PERMS_EVENT = "consertech-perms-updated";

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
  expenses: "/staff/expenses",
  leave: "/staff/leave",
  kpi: "/staff/kpi",
  finance: "/staff/finance",
  master: "/staff/master",
  users: "/staff/users",
};

export default function StaffShell({ children, title }: { children: ReactNode; title?: string }) {
  const [empId, setEmpId] = useState(employees[0].id);
  const [overrides, setOverrides] = useState<AccessOverrides>({});
  const [ready, setReady] = useState(false); // รอโหลดค่าจาก localStorage ก่อนค่อยเช็กสิทธิ์ redirect
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const loadOverrides = async () => {
      // ฐานข้อมูลจริงก่อน → fallback localStorage
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
    try {
      const savedEmp = localStorage.getItem(EMP_KEY);
      if (savedEmp && employees.some((e) => e.id === savedEmp)) {
        setEmpId(savedEmp);
      } else {
        // ย้ายจากระบบเดิมที่จำเป็นรายแผนก → เลือกพนักงานคนแรกของแผนกนั้น
        const savedDept = localStorage.getItem("consertech-staff-dept") as Department | null;
        const emp = savedDept ? employees.find((e) => e.dept === savedDept) : null;
        if (emp) setEmpId(emp.id);
      }
    } catch {}
    loadOverrides();
    setReady(true);
    // อัปเดตทันทีเมื่อหน้าจัดการผู้ใช้กดบันทึกสิทธิ์
    window.addEventListener(PERMS_EVENT, loadOverrides);
    window.addEventListener("storage", loadOverrides);
    return () => {
      window.removeEventListener(PERMS_EVENT, loadOverrides);
      window.removeEventListener("storage", loadOverrides);
    };
  }, []);

  const emp = employees.find((e) => e.id === empId) ?? employees[0];
  const dept = emp.dept;
  const deptLabel = departments.find((d) => d.key === dept)?.label;
  // สิทธิ์รายคน: ค่าที่แอดมินปรับรายคน > ค่าเริ่มต้นตามแผนก
  const access = (m: ModuleKey): Access => overrides[emp.id]?.[m] ?? permissions[dept][m];

  // ถ้าผู้ใช้คนนี้ไม่มีสิทธิ์หน้าปัจจุบัน ให้เด้งกลับภาพรวม
  useEffect(() => {
    if (!ready) return;
    const current = (Object.entries(routes) as [ModuleKey, string][]).find(([, r]) => pathname.startsWith(r));
    if (current && access(current[0]) === "none") router.replace("/staff/dashboard");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, empId, overrides, pathname, router]);

  return (
    <DeptCtx.Provider value={{ dept, empId: emp.id, access }}>
      <div className="min-h-[85vh] bg-ice/40">
        <div className="container-site py-4 min-[820px]:py-6 grid gap-4 min-[820px]:gap-6 min-[820px]:grid-cols-[230px_1fr] items-start">
          {/* Sidebar — มือถือ: แถบชิปเลื่อนแนวนอน / จอใหญ่: เมนูแนวตั้ง */}
          <aside className="min-w-0 max-w-full card-white p-2.5 min-[820px]:p-4 min-[820px]:sticky min-[820px]:top-24">
            <p className="hidden min-[820px]:block text-[11px] font-bold tracking-widest text-sky uppercase px-2">
              Portal — {deptLabel}
            </p>
            <p className="hidden min-[820px]:block text-[12px] font-bold text-navy px-2 mt-0.5">👤 {emp.name}</p>
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
              <p className="hidden min-[820px]:block text-[10.5px] text-muted/70 mb-1">สลับผู้ใช้ (เดโม):</p>
              <select
                value={emp.id}
                onChange={(e) => {
                  setEmpId(e.target.value);
                  try { localStorage.setItem(EMP_KEY, e.target.value); } catch {}
                }}
                className="flex-1 min-[820px]:flex-none min-w-0 min-[820px]:w-full text-[12.5px] min-[820px]:text-[13px] rounded-lg border border-ice px-2 py-1.5 bg-white"
                aria-label="สลับผู้ใช้ (เดโม)"
              >
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name} — {departments.find((d) => d.key === e.dept)?.label}
                  </option>
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
            <p className="text-[12px] text-muted mb-4">
              {supabase
                ? "🟢 ลงเวลา · จัดการผู้ใช้ · สิทธิ์เข้าถึง — เชื่อมฐานข้อมูลจริงแล้ว | โมดูลอื่นยังเป็นข้อมูลจำลอง (ทยอยเชื่อมตาม Roadmap)"
                : "ข้อมูลจำลองสำหรับเดโม (Mockup) — ยังไม่เชื่อมต่อฐานข้อมูลจริง"}
            </p>
            {children}
          </div>
        </div>
      </div>
    </DeptCtx.Provider>
  );
}
