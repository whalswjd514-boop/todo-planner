import type { Metadata } from "next";
import { Suspense } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import Nav from "@/components/Nav";
import UserMenu from "@/components/UserMenu";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "할 일 + 계획",
  description: "할 일, 주간 계획, 1년 목표를 하나로 연결해 관리합니다",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full bg-black text-zinc-100">
        <Suspense fallback={<aside className="w-40 shrink-0 border-r border-zinc-800 bg-zinc-950 md:w-56" />}>
          <Nav
            footer={
              <Suspense fallback={null}>
                <UserMenu />
              </Suspense>
            }
          />
        </Suspense>
        <main className="mx-auto min-w-0 w-full max-w-6xl flex-1 p-4 md:p-6">{children}</main>
      </body>
    </html>
  );
}
