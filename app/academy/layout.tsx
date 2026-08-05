import type { Metadata } from "next";
import { MockAuthProvider } from "@/lib/mockAuth";
import AcademyNav from "@/components/AcademyNav";

export const metadata: Metadata = {
  title: { default: "CONSERTECH Academy", template: "%s | CONSERTECH Academy" },
  description: "คอร์สเรียนรู้เทคโนโลยี AGV และ Factory Automation โดยทีมวิศวกร CONSERTECH",
};

export default function AcademyLayout({ children }: { children: React.ReactNode }) {
  return (
    <MockAuthProvider>
      <AcademyNav />
      {children}
    </MockAuthProvider>
  );
}
