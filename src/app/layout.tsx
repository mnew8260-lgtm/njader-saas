import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "NJADDER SaaS — تسجيل دخول تيليجرام",
  description: "منصة SaaS لإدارة حسابات تيليجرام. تسجيل دخول آمن بخطوات بسيطة مع API pool تلقائي.",
  keywords: ["NJADDER", "Telegram", "GramJS", "SaaS", "Next.js"],
  authors: [{ name: "NMDDER" }],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
