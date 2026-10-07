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
  title: "njadder — منصة تيليجرام الاحترافية",
  description: "njadder — أداة تيليجرام الموحدة. تسجيل دخول آمن، إدارة حسابات، سحب وإضافة أعضاء، 143+ أمر.",
  keywords: ["njadder", "Telegram", "GramJS", "SaaS", "Next.js", "NMDDER"],
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
