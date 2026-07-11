import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { NavBar } from "@/components/NavBar";
import { NotificationProvider } from "@/components/NotificationProvider";

export const metadata: Metadata = {
  title: "TrendBlog — 트렌드 블로그 자동화",
  description: "Google Trends 기반 블로그 초안 자동 생성 및 승인 대시보드",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="min-h-screen bg-[#0a0a0a] text-neutral-300 antialiased">
        <NotificationProvider>
          <NavBar />
          <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
        </NotificationProvider>
      </body>
    </html>
  );
}
