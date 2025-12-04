import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
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
  title: "Valorant Pro Analytics",
  description: "Professional match analytics for Valorant",
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
          <nav className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm">
            <div className="container mx-auto px-4 py-4">
              <Link
                href="/"
                className="inline-block text-xl font-bold bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text text-transparent hover:from-red-400 hover:to-orange-400 transition-all cursor-pointer"
              >
                VALORANT Pro Analytics
              </Link>
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
