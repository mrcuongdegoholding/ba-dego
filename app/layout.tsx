import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { ToastProvider } from "@/components/Toast";
import TopNav from "@/components/TopNav";

export const metadata: Metadata = {
  title: "DX-BA Hub | DEGO Holding",
  description: "Hệ thống Quản lý Khảo sát & Phân tích Nghiệp vụ nội bộ",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body className="bg-slate-50 text-slate-900 min-h-screen">
        <AuthProvider>
          <ToastProvider>
            <TopNav />
            <div className="pt-14">
              {children}
            </div>
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
