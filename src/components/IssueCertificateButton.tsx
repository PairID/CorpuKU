"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Award, Loader2 } from "lucide-react";
import { issueSingleCourseCertificate } from "@/app/actions/course-certificates";
import { showToast } from "@/lib/toast";

interface IssueCertificateButtonProps {
  courseId: string;
  userId: string;
  participantName: string;
  isEligible: boolean;
  disabledReason?: string;
}

export function IssueCertificateButton({
  courseId,
  userId,
  participantName,
  isEligible,
  disabledReason,
}: IssueCertificateButtonProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleIssue = async () => {
    if (!isEligible || loading) return;

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("courseId", courseId);
      formData.append("userId", userId);

      const result = await issueSingleCourseCertificate(formData);
      if (result && result.success) {
        showToast.success(
          "Sertifikat Berhasil Diterbitkan",
          result.message || `Sertifikat untuk ${participantName} telah aktif.`
        );
        router.refresh();
      } else {
        showToast.error(
          "Penerbitan Gagal",
          result?.message || "Persyaratan kelulusan peserta belum terpenuhi."
        );
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan saat memproses sertifikat.";
      showToast.error("Kesalahan Sistem", msg);
    } finally {
      setLoading(false);
    }
  };

  if (!isEligible) {
    return (
      <span
        className="inline-flex items-center gap-1 text-xs text-oxford-400 dark:text-oxford-500 bg-oxford-100 dark:bg-oxford-900 px-2.5 py-1.5 rounded-lg"
        title={disabledReason || "Syarat kelulusan belum terpenuhi"}
      >
        Belum memenuhi syarat
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={handleIssue}
      disabled={loading}
      className="inline-flex items-center gap-1.5 rounded-lg bg-oxford-900 dark:bg-gold-500 hover:bg-oxford-800 dark:hover:bg-gold-400 px-3 py-1.5 text-xs font-bold text-white dark:text-oxford-950 transition-all disabled:opacity-50 shadow-sm active:scale-95"
      title={`Terbitkan sertifikat resmi untuk ${participantName}`}
    >
      {loading ? (
        <>
          <Loader2 size={13} className="animate-spin" />
          <span>Memproses...</span>
        </>
      ) : (
        <>
          <Award size={13} />
          <span>Terbitkan</span>
        </>
      )}
    </button>
  );
}
