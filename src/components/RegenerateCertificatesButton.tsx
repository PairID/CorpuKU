"use client";

import { useState } from "react";
import { RefreshCw, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { regenerateCourseCertificatesAction } from "@/app/actions/course-certificates";

interface RegenerateCertificatesButtonProps {
  courseId: string;
  issuedCount: number;
  courseJp: number;
}

export function RegenerateCertificatesButton({
  courseId,
  issuedCount,
  courseJp,
}: RegenerateCertificatesButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  if (issuedCount === 0) return null;

  const handleRegenerate = async () => {
    const ok = confirm(
      `Terbitkan ulang / sinkronkan ${issuedCount} sertifikat terbit menggunakan data kursus terbaru (${courseJp} JP)?\n\nNomor sertifikat resmi dan QR verifikasi yang sudah ada tetap dipertahankan.`
    );
    if (!ok) return;

    setIsLoading(true);
    try {
      const res = await regenerateCourseCertificatesAction(courseId);
      if (res.success) {
        toast.success(res.message);
        router.refresh();
      } else {
        toast.error(res.message);
      }
    } catch {
      toast.error("Terjadi kesalahan saat memperbarui sertifikat.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleRegenerate}
      disabled={isLoading}
      className="inline-flex items-center gap-2 rounded-xl bg-gold-500 hover:bg-gold-400 text-oxford-950 px-4 py-2.5 text-sm font-bold shadow-sm transition-all active:scale-95 disabled:opacity-60"
    >
      {isLoading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
      <span>
        {isLoading
          ? "Memperbarui Sertifikat..."
          : `Regenerate Semua Sertifikat (${issuedCount})`}
      </span>
    </button>
  );
}
