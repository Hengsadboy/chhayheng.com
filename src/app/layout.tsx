import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import AnimatedBackground from "@/components/AnimatedBackground";
import AmbientAudio from "@/components/AmbientAudio";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Chhayheng.online | Premium Software & Bot Shop",
  description: "Get custom Telegram bots, Discord bots, high-performance web applications, and security tools built by senior developers.",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark scroll-smooth" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} min-h-screen bg-[#04040d] text-slate-100 flex flex-col antialiased`} suppressHydrationWarning>
        <AnimatedBackground />
        <AmbientAudio />
        {/* Anti-copy protection removed by user request */}
        <Navbar />
        <main className="flex-grow pt-20">
          {children}
        </main>
        <footer className="border-t border-[#1a1a36] bg-[#050510] py-8 text-center text-sm text-slate-500">
          <p>© {new Date().getFullYear()} Chhayheng.online. All rights reserved. Crafting custom digital solutions.</p>
        </footer>
      </body>
    </html>
  );
}
