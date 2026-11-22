"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import Link from "next/link";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const msg = error?.message || "";
  const isChunkOrDeploymentError =
    msg.includes("ChunkLoadError") ||
    msg.includes("Loading chunk") ||
    msg.includes("Failed to fetch dynamically imported module") ||
    msg.includes("Failed to find Server Action");

  useEffect(() => {
    // Check if error is due to stale deployment chunks
    if (isChunkOrDeploymentError) {
      // Automatic reload to fetch fresh deployment assets
      const reloadKey = "chunk_reload_" + window.location.pathname;
      const lastReload = sessionStorage.getItem(reloadKey);
      if (!lastReload || Date.now() - Number(lastReload) > 10000) {
        sessionStorage.setItem(reloadKey, String(Date.now()));
        window.location.reload();
      }
    }
    console.error("Client error caught by ErrorBoundary:", error);
  }, [error, isChunkOrDeploymentError]);

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-4">
        <AlertTriangle size={32} />
      </div>
      <h2 className="text-2xl font-bold text-oxford-900 dark:text-white mb-2">
        {isChunkOrDeploymentError ? "Pembaruan Versi Diperlukan" : "Terjadi Kendala Teknis"}
      </h2>
      <p className="text-sm text-oxford-500 dark:text-oxford-400 max-w-md mb-6 leading-relaxed">
        {isChunkOrDeploymentError
          ? "Sistem baru saja diperbarui atau sesi peramban Anda perlu disegarkan. Silakan muat ulang halaman untuk memperbarui ke versi terbaru."
          : (msg || "Terjadi kesalahan saat memproses permintaan. Silakan coba kembali beberapa saat lagi.")}
      </p>
      <div className="flex flex-wrap gap-3 justify-center">
        <button
          onClick={() => {
            sessionStorage.clear();
            window.location.reload();
          }}
          className="px-6 py-2.5 bg-gold-500 text-oxford-950 font-bold rounded-xl hover:bg-gold-400 transition-all flex items-center gap-2 shadow-sm"
        >
          <RefreshCw size={16} /> Muat Ulang Halaman
        </button>
        <button
          onClick={() => reset()}
          className="px-5 py-2.5 bg-oxford-100 dark:bg-oxford-800 text-oxford-900 dark:text-white font-bold rounded-xl hover:bg-oxford-200 dark:hover:bg-oxford-700 transition-colors"
        >
          Coba Lagi
        </button>
        <Link
          href="/"
          className="px-5 py-2.5 border border-oxford-200 dark:border-oxford-700 text-oxford-700 dark:text-oxford-300 font-bold rounded-xl hover:bg-oxford-100 dark:hover:bg-oxford-800 transition-colors flex items-center gap-2"
        >
          <Home size={16} /> Ke Beranda
        </Link>
      </div>
    </div>
  );
}
