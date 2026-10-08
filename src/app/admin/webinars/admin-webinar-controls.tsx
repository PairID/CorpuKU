"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { deleteWebinar, toggleWebinarAttendance } from "@/app/actions/webinars";
import { toast } from "sonner";

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
          toast.error(res.error || "Gagal mengubah status presensi.");
        } else {
          toast.success(isAttendanceOpen ? "Presensi webinar ditutup." : "Presensi webinar dibuka (Live)!");
        }
      } catch {
        toast.error("Terjadi kesalahan koneksi.");
      }
    });
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={isPending}
      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 disabled:opacity-60 ${
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

  const handleDelete = () => {
    const confirmed = window.confirm(
      `Apakah Anda yakin ingin menghapus webinar "${webinarTitle}"?\n\nPERINGATAN: Tindakan ini permanen. Semua data pendaftaran dan presensi terkait akan ikut terhapus.`
    );
    if (!confirmed) return;

    startTransition(async () => {
      try {
        const res = await deleteWebinar(webinarId);
        if (res?.success === false) {
          toast.error(res.error || "Gagal menghapus webinar.");
        } else {
          toast.success("Webinar berhasil dihapus.");
        }
      } catch {
        toast.error("Terjadi kesalahan sistem saat menghapus webinar.");
      }
    });
  };

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={isPending}
      className="p-2 text-oxford-500 dark:text-oxford-400 hover:text-crimson-600 hover:bg-crimson-50 rounded-lg transition-colors disabled:opacity-50"
      title="Hapus Webinar"
    >
      <Trash2 size={18} className={isPending ? "animate-pulse" : ""} />
    </button>
  );
}
