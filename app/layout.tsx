import type { Metadata } from "next";
import { Sarabun } from "next/font/google";
import "./globals.css";
import { LangProvider } from "@/lib/i18n";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import LineButton from "@/components/LineButton";

const sarabun = Sarabun({
  subsets: ["thai", "latin"],
  weight: ["400", "600", "700"],
  variable: "--font-sarabun",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "CONSERTECH — Industrial Automation: Consult · Service · Technology",
    template: "%s | CONSERTECH",
  },
  description:
    "บริษัท คันเซอร์เทคช์ จำกัด — ที่ปรึกษาและผู้ให้บริการระบบอัตโนมัติอุตสาหกรรมครบวงจร: คลังสินค้า สายการผลิต AGV/AMR ตรวจสอบด้วย AI และความปลอดภัยเครื่องจักร",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <body className={`${sarabun.variable} font-sans antialiased flex min-h-screen flex-col`}>
        <LangProvider>
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
          <LineButton />
        </LangProvider>
      </body>
    </html>
  );
}
