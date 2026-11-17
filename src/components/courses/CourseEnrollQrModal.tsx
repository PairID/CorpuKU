"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Copy, Download, QrCode, X } from "lucide-react";
import { showToast } from "@/lib/toast";

interface CourseEnrollQrModalProps {
  courseId: string;
  courseTitle: string;
  onClose: () => void;
}

export default function CourseEnrollQrModal({
  courseId,
  courseTitle,
  onClose,
}: CourseEnrollQrModalProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const enrollUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/courses/${courseId}`
      : `/courses/${courseId}`;

  useEffect(() => {
    QRCode.toDataURL(enrollUrl, {
      width: 320,
      margin: 2,
      color: { dark: "#0F172A", light: "#FFFFFF" },
    })
      .then(setQrDataUrl)
      .catch(() => {});
  }, [enrollUrl]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(enrollUrl);
      showToast.success("Tautan Disalin", "Link pendaftaran kelas siap dibagikan.");
    } catch {
      showToast.error("Gagal Menyalin", "Silakan salin tautan secara manual.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#161B2A] border border-oxford-200 dark:border-oxford-700 rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-oxford-500 hover:bg-oxford-100 dark:hover:bg-oxford-800"
        >
          <X size={18} />
        </button>

        <div className="flex items-center gap-2.5 mb-2">
          <div className="w-9 h-9 rounded-xl bg-gold-500/15 text-gold-600 dark:text-gold-400 flex items-center justify-center">
            <QrCode size={20} />
          </div>
          <div>
            <h3 className="text-base font-bold text-oxford-950 dark:text-white">
              QR Code Pendaftaran Kelas
            </h3>
            <p className="text-xs text-oxford-500 dark:text-oxford-400 line-clamp-1">
              {courseTitle}
            </p>
          </div>
        </div>

        <p className="text-xs text-oxford-600 dark:text-oxford-300 mt-2 mb-4">
          Peserta cukup scan QR ini dengan kamera HP untuk langsung membuka halaman kelas dan klik <strong>Daftar / Mulai Belajar</strong>. Pastikan status kursus sudah <strong>Active (Terbit)</strong>.
        </p>

        <div className="bg-white p-4 rounded-xl border border-oxford-200 flex items-center justify-center mb-4">
          {qrDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={qrDataUrl}
              alt={`QR Pendaftaran ${courseTitle}`}
              className="w-56 h-56 object-contain"
            />
          ) : (
            <div className="w-56 h-56 flex items-center justify-center text-xs text-oxford-400">
              Menyiapkan QR Code...
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 mb-4">
          <input
            type="text"
            readOnly
            value={enrollUrl}
            className="flex-1 px-3 py-2 bg-oxford-50 dark:bg-oxford-900 border border-oxford-200 dark:border-oxford-700 rounded-xl text-xs font-mono text-oxford-800 dark:text-oxford-200"
          />
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-oxford-100 dark:bg-oxford-800 text-xs font-bold text-oxford-800 dark:text-oxford-100 hover:bg-oxford-200 dark:hover:bg-oxford-700"
          >
            <Copy size={14} /> Salin
          </button>
        </div>

        {qrDataUrl && (
          <a
            href={qrDataUrl}
            download={`QR_Pendaftaran_${courseId}.png`}
            className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gold-500 hover:bg-gold-400 text-oxford-950 font-bold text-xs shadow-sm transition-colors"
          >
            <Download size={15} /> Unduh QR Pendaftaran (PNG)
          </a>
        )}
      </div>
    </div>
  );
}
