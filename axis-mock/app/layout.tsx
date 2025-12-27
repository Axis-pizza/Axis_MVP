import type { Metadata, Viewport } from "next";
import "./globals.css";
// 先ほど作ったProvidersをインポート
import { Providers } from "@/components/providers/Providers";
import { BottomNav } from "@/components/layout/BottomNav";
import { BugReportWidget } from "@/components/layout/BugReportWidget";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#000000",
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "Axis",
  description: "The Next Gen ETF Protocol on Solana",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="font-serif antialiased min-h-screen bg-black text-white">
        {/* ★すべてをProvidersでラップする */}
        <Providers>
          
          <main className="pt-24 px-4 md:px-8 max-w-7xl mx-auto pb-32">
            {children}
          </main>

          {/* ★これらがProvidersの内側にあることが超重要です */}
          <BottomNav />
          <BugReportWidget />
          
        </Providers>
      </body>
    </html>
  );
}