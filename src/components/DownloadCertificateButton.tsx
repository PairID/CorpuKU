"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";

interface DownloadCertificateButtonProps {
  verificationToken: string;
  type: "Kursus" | "Webinar" | "course_certificate" | "webinar_certificate";
  participantName?: string;
  certificateNumber?: string;
  className?: string;
  label?: string;
  variant?: "button" | "link";
}

export function DownloadCertificateButton({
  verificationToken,
  type,
  participantName,
  certificateNumber,
  className = "",
  label = "Unduh PDF",
  variant = "link",
}: DownloadCertificateButtonProps) {
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isDownloading) return;

    setIsDownloading(true);
    try {
      const certType =
        type === "Kursus" || type === "course_certificate"
          ? "course_certificate"
          : "webinar_certificate";

      const res = await fetch("/api/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: certType,
          verificationToken,
        }),
      });

      if (!res.ok) {
        const errorJson = await res.json().catch(() => null);
        throw new Error(errorJson?.error || "Gagal mengunduh sertifikat.");
      }

      const blob = await res.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      const safeFilename = participantName && certificateNumber
        ? `${participantName}-${certificateNumber}.pdf`.replace(/[/\\?%*:|"<>]/g, "_")
        : `Sertifikat-${certificateNumber || verificationToken.slice(0, 8)}.pdf`;
      a.download = safeFilename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => window.URL.revokeObjectURL(blobUrl), 3000);
    } catch (err: unknown) {
      console.error(err);
      alert(err instanceof Error ? err.message : "Terjadi kesalahan saat mengunduh sertifikat.");
    } finally {
      setIsDownloading(false);
    }
  };

  if (variant === "button") {
    return (
      <button
        onClick={handleDownload}
        disabled={isDownloading}
        title="Cetak / Unduh PDF sertifikat resmi"
        className={`inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white transition-all hover:bg-emerald-700 disabled:opacity-50 ${className}`}
      >
        {isDownloading ? (
          <Loader2 size={13} className="animate-spin" />
        ) : (
          <Download size={13} />
        )}
        <span>{isDownloading ? "Mencetak..." : label}</span>
      </button>
    );
  }

  return (
    <button
      onClick={handleDownload}
      disabled={isDownloading}
      title="Cetak / Unduh PDF sertifikat resmi"
      className={`inline-flex items-center gap-1 text-xs font-bold text-emerald-600 hover:text-emerald-700 hover:underline disabled:opacity-50 ${className}`}
    >
      {isDownloading ? (
        <Loader2 size={13} className="animate-spin" />
      ) : (
        <Download size={13} />
      )}
      <span>{isDownloading ? "Mencetak..." : label}</span>
    </button>
  );
}
