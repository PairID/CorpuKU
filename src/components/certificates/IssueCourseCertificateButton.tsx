"use client";

import { useState } from "react";
import { Award, Loader2 } from "lucide-react";
import { showToast } from "@/lib/toast";
import { issueCourseCertificateManualAction } from "@/app/actions/course-certificates";
import { useRouter } from "next/navigation";

interface IssueCourseCertificateButtonProps {
  courseId: string;
  userId: string;
  participantName: string;
}

export function IssueCourseCertificateButton({
  courseId,
  userId,
  participantName,
}: IssueCourseCertificateButtonProps) {
  const [isPending, setIsPending] = useState(false);
  const router = useRouter();

  const handleIssue = async () => {
    setIsPending(true);
    try {
      const res = await issueCourseCertificateManualAction(courseId, userId);
      if (res.success) {
        showToast.success(
          "Sertifikat Berhasil Diterbitkan",
          res.message || `Sertifikat untuk ${participantName} telah berhasil diterbitkan.`
        );
        router.refresh();
      } else {
        showToast.error(
          "Gagal Menerbitkan Sertifikat",
          res.error || "Terjadi kesalahan saat memproses penerbitan sertifikat."
        );
      }
    } catch (err: any) {
      showToast.error("Gagal Menerbitkan Sertifikat", err.message || "Terjadi kendala jaringan/sistem.");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleIssue}
      disabled={isPending}
      className="inline-flex items-center gap-1.5 rounded-lg bg-oxford-900 dark:bg-gold-500 hover:bg-oxford-800 dark:hover:bg-gold-400 px-3 py-2 text-xs font-bold text-white dark:text-oxford-950 transition-all shadow-sm hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
      title={`Terbitkan sertifikat resmi untuk ${participantName}`}
    >
      {isPending ? (
        <>
          <Loader2 size={13} className="animate-spin text-white dark:text-oxford-950" />
          <span>Menerbitkan...</span>
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
