"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { showToast } from "@/lib/toast";

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

  const certType =
    type === "Kursus" || type === "course_certificate"
      ? "course_certificate"
      : "webinar_certificate";

  const downloadUrl = `/api/pdf?type=${certType}&verificationToken=${encodeURIComponent(verificationToken)}`;
  const cleanParticipant = (participantName || "").replace(/[/\\?%*:|"<>,\n\r\t]/g, "").trim().replace(/\s+/g, "_");
  const cleanNumber = (certificateNumber || verificationToken.slice(0, 8)).replace(/[/\\?%*:|"<>,\n\r\t]/g, "_").trim();
  const safeFilename = cleanParticipant
    ? `Sertifikat_${cleanParticipant}_${cleanNumber}.pdf`
    : `Sertifikat_${cleanNumber}.pdf`;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDownloading(true);
    showToast.success("Unduhan Dimulai", "Sertifikat sedang diunduh ke perangkat Anda.");
    setTimeout(() => setIsDownloading(false), 3000);
  };

  if (variant === "button") {
    return (
      <a
        href={downloadUrl}
        download={safeFilename}
        onClick={handleClick}
        title="Cetak / Unduh PDF sertifikat resmi"
        className={`inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white transition-all hover:bg-emerald-700 cursor-pointer ${className}`}
      >
        {isDownloading ? (
          <Loader2 size={13} className="animate-spin" />
        ) : (
          <Download size={13} />
        )}
        <span>{isDownloading ? "Mengunduh..." : label}</span>
      </a>
    );
  }

  return (
    <a
      href={downloadUrl}
      download={safeFilename}
      onClick={handleClick}
      title="Cetak / Unduh PDF sertifikat resmi"
      className={`inline-flex items-center gap-1 text-xs font-bold text-emerald-600 hover:text-emerald-700 hover:underline cursor-pointer ${className}`}
    >
      {isDownloading ? (
        <Loader2 size={13} className="animate-spin" />
      ) : (
        <Download size={13} />
      )}
      <span>{isDownloading ? "Mengunduh..." : label}</span>
    </a>
  );
}
