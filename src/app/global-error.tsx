"use client";

import { useEffect } from "react";
import { RefreshCw } from "lucide-react";

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    const msg = error?.message || "";
    if (
      msg.includes("ChunkLoadError") ||
      msg.includes("Loading chunk") ||
      msg.includes("Failed to load chunk") ||
      msg.includes("Failed to fetch dynamically imported module")
    ) {
      if (typeof window !== "undefined") {
        window.location.reload();
      }
    }
    console.error("Global error caught:", error);
  }, [error]);

  return (
    <html lang="id">
      <body className="bg-[#0B0F19] text-white min-h-screen flex items-center justify-center p-6 font-sans">
        <div className="max-w-md w-full bg-white/5 border border-white/10 rounded-3xl p-8 text-center backdrop-blur-md">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto mb-4">
            <RefreshCw size={28} />
          </div>
          <h2 className="text-2xl font-bold mb-2">Pembaruan Sistem Tersedia</h2>
          <p className="text-sm text-gray-300 mb-6">
            Versi terbaru CorpuKU Academy telah terbit. Silakan klik tombol di bawah untuk menyinkronkan data terbaru.
          </p>
          <button
            onClick={() => {
              if (typeof window !== "undefined") {
                window.location.reload();
              }
            }}
            className="w-full py-3 bg-[#E5A823] text-black font-bold rounded-xl hover:bg-[#d69818] transition-colors flex items-center justify-center gap-2"
          >
            <RefreshCw size={18} /> Muat Ulang Aplikasi
          </button>
        </div>
      </body>
    </html>
  );
}
