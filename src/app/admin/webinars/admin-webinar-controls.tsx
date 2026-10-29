"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { deleteWebinar, toggleWebinarAttendance } from "@/app/actions/webinars";
import { showToast } from "@/lib/toast";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

export function AttendanceToggleButton({
  webinarId,
  isAttendanceOpen,
}: {
  webinarId: string;
  isAttendanceOpen: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  const handleToggle = () => {
    startTransition(async () => {
      try {
        const res = await toggleWebinarAttendance(webinarId, !isAttendanceOpen);
        if (res?.success === false) {
          showToast.error("Gagal Mengubah Presensi", res.error || "Gagal mengubah status presensi.");
        } else {
          showToast.success(
            isAttendanceOpen ? "Presensi Ditutup" : "Presensi Dibuka",
            isAttendanceOpen ? "Presensi peserta webinar telah ditutup." : "Presensi webinar sekarang aktif dan dibuka untuk peserta."
          );
        }
      } catch {
        showToast.error("Terjadi Kesalahan", "Gagal menghubungi server untuk mengubah status presensi.");
      }
    });
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={isPending}
      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 disabled:opacity-60 cursor-pointer ${
        isAttendanceOpen
          ? "bg-emerald-500 text-white shadow-sm hover:bg-emerald-600"
          : "bg-oxford-100 dark:bg-oxford-800 text-oxford-600 dark:text-oxford-400 hover:bg-oxford-200"
      }`}
    >
      <span className={`w-2 h-2 rounded-full ${isPending ? "bg-amber-300 animate-ping" : isAttendanceOpen ? "bg-white animate-pulse" : "bg-gray-400"}`} />
      {isPending ? "Memproses..." : isAttendanceOpen ? "Buka (Live)" : "Tutup"}
    </button>
  );
}

export function DeleteWebinarButton({
  webinarId,
  webinarTitle,
}: {
  webinarId: string;
  webinarTitle: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const handleConfirmDelete = async () => {
    startTransition(async () => {
      try {
        const res = await deleteWebinar(webinarId);
        if (res?.success === false) {
          showToast.error("Gagal Menghapus Webinar", res.error || "Terjadi kesalahan saat menghapus data.");
        } else {
          showToast.success("Webinar Berhasil Dihapus", `"${webinarTitle}" telah dihapus secara permanen dari sistem.`);
          setShowConfirmModal(false);
        }
      } catch {
        showToast.error("Kesalahan Sistem", "Terjadi kesalahan saat memproses penghapusan webinar.");
      }
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setShowConfirmModal(true)}
        disabled={isPending}
        className="p-2 text-oxford-500 dark:text-oxford-400 hover:text-crimson-600 hover:bg-crimson-50 dark:hover:bg-crimson-950/40 rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
        title="Hapus Webinar"
      >
        <Trash2 size={18} className={isPending ? "animate-pulse" : ""} />
      </button>

      <ConfirmDialog
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={handleConfirmDelete}
        title="Hapus Webinar?"
        description="Apakah Anda yakin ingin menghapus webinar berikut dari sistem?"
        itemName={webinarTitle}
        warningText="PERINGATAN: Tindakan ini permanen. Semua data pendaftaran dan presensi terkait akan ikut terhapus."
        confirmText="Hapus Webinar"
        cancelText="Batal"
        variant="danger"
        isLoading={isPending}
      />
    </>
  );
}
