import type { Metadata } from "next";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { NavigationProgressBar } from "@/components/ui/NavigationProgressBar";

export const metadata: Metadata = {
  title: "CorpuKU Academy | Pengembangan Kompetensi ASN",
  description: "Platform pembelajaran, webinar, learning path, dan sertifikasi pengembangan kompetensi ASN.",
};

import { ThemeProvider } from "@/components/theme-provider";
import { AppToaster } from "@/components/ui/AppToaster";
import { SessionIdleTracker } from "@/components/SessionIdleTracker";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.addEventListener('error', function(e) {
                var msg = e && (e.message || (e.error && e.error.message)) || '';
                if (msg.indexOf('ChunkLoadError') !== -1 || msg.indexOf('Loading chunk') !== -1) {
                  var k = 'last_chunk_reload';
                  var last = sessionStorage.getItem(k);
                  var now = Date.now();
                  if (!last || now - Number(last) > 15000) {
                    sessionStorage.setItem(k, String(now));
                    window.location.reload();
                  }
                }
              });
            `,
          }}
        />
      </head>
      <body
        className="font-sans bg-background text-foreground antialiased min-h-screen flex flex-col"
      >
        <ThemeProvider defaultTheme="light" storageKey="corpuku-theme">
          <NavigationProgressBar />
          <AppToaster />
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
