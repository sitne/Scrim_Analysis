import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { UserNav } from "@/components/UserNav";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Scrim Analyzer",
  description: "Professional match analytics for VALORANT scrims",
};

import { fetchValorantData } from "@/lib/valorant-api";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Fetch data from Valorant API (cached in memory)
  await fetchValorantData();

  return (
    <html lang="ja" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-950 text-gray-100`}
      >
        <div className="min-h-screen">
          <nav className="border-b border-white/10 bg-[#0f1923]/90 backdrop-blur-md">
            <div className="container mx-auto px-4 py-4 flex justify-between items-center">
              <Link
                href="/"
                className="inline-block text-xl font-bold bg-gradient-to-r from-purple-500 to-purple-500 bg-clip-text text-transparent hover:from-purple-400 hover:to-blue-400 transition-all cursor-pointer"
              >
                Scrim Analyzer
              </Link>
              <UserNav />
            </div>
          </nav>
          <main className="container mx-auto px-4 py-8">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
