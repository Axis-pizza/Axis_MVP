import type { Metadata, Viewport } from "next";
import "./globals.css";

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
      <body className="min-h-screen bg-black font-serif text-white antialiased">
        <Providers>
          <main className="mx-auto max-w-7xl px-4 pt-24 pb-32 md:px-8">{children}</main>

          <BottomNav />
          <BugReportWidget />
        </Providers>
      </body>
    </html>
  );
}
