import type { Metadata } from "next";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

export const metadata: Metadata = {
  title: "CorpuKU Academy | Pengembangan Kompetensi ASN",
  description: "Platform pembelajaran, webinar, learning path, dan sertifikasi pengembangan kompetensi ASN.",
};

import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "sonner";
import { SessionIdleTracker } from "@/components/SessionIdleTracker";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body
        className="font-sans bg-background text-foreground antialiased min-h-screen flex flex-col"
      >
        <ThemeProvider storageKey="corpuku-theme">
          <Toaster position="top-center" richColors />
          <SessionIdleTracker />
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
