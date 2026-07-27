import type { Metadata } from "next";
import { Ubuntu } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

const ubuntu = Ubuntu({
  variable: "--font-ubuntu",
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
});

export const metadata: Metadata = {
  title: "CorpuKU Academy | Pengembangan Kompetensi ASN",
  description: "Platform pembelajaran, webinar, learning path, dan sertifikasi pengembangan kompetensi ASN.",
};

import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "sonner";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body
        className={`${ubuntu.variable} font-sans bg-background text-foreground antialiased min-h-screen flex flex-col`}
      >
        <ThemeProvider storageKey="corpuku-theme">
          <Toaster position="top-center" richColors />
          <Header />
          <main className="flex-1 flex flex-col pt-0">
            {children}
          </main>
          <Footer />
        </ThemeProvider>
      </body>
    </html>
  );
}
