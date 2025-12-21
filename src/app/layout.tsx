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
              <div className="flex items-center gap-4">
                <a
                  href="/scrim-log.zip"
                  download
                  className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" x2="12" y1="15" y2="3" />
                  </svg>
                  ツールDL
                </a>
                <UserNav />
              </div>
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
