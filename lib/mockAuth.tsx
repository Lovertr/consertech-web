"use client";

// Mock auth สำหรับเดโม Zone B — เก็บใน localStorage ฝั่ง client เท่านั้น
// Production: เปลี่ยนเป็น Supabase Auth / NextAuth + role guard ฝั่ง server

import { createContext, useContext, useEffect, useState, ReactNode } from "react";

export type MockUser = {
  name: string;
  email: string;
  tier: "free" | "premium";
  progress: Record<string, number>; // courseSlug -> %
};

const KEY = "consertech-mock-user";

const Ctx = createContext<{
  user: MockUser | null;
  login: (name: string, email: string) => void;
  logout: () => void;
  setProgress: (slug: string, pct: number) => void;
}>({ user: null, login: () => {}, logout: () => {}, setProgress: () => {} });

export function MockAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<MockUser | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setUser(JSON.parse(raw));
    } catch {}
  }, []);

  const persist = (u: MockUser | null) => {
    setUser(u);
    try {
      if (u) localStorage.setItem(KEY, JSON.stringify(u));
      else localStorage.removeItem(KEY);
    } catch {}
  };

  const login = (name: string, email: string) =>
    persist({ name, email, tier: "premium", progress: { "logistic-automation-basics": 60, "lidar-virtual-line": 25 } });

  const logout = () => persist(null);

  const setProgress = (slug: string, pct: number) => {
    if (!user) return;
    persist({ ...user, progress: { ...user.progress, [slug]: pct } });
  };

  return <Ctx.Provider value={{ user, login, logout, setProgress }}>{children}</Ctx.Provider>;
}

export const useMockAuth = () => useContext(Ctx);
