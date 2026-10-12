"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { toast } from "sonner";
import { LogOut, Clock, ShieldAlert } from "lucide-react";

// Waktu tidak aktif maksimal sebelum auto-logout (detik)
// Admin / Instruktur: 2 Jam (7200 detik)
const ADMIN_IDLE_TIMEOUT_MS = 2 * 60 * 60 * 1000;
// Peringatan sebelum logout: 3 menit sebelum timeout
const WARNING_BEFORE_TIMEOUT_MS = 3 * 60 * 1000;

export function SessionIdleTracker() {
  const { data: sessionData } = authClient.useSession();
  const router = useRouter();
  const user = sessionData?.user;
  const isAdminOrInstructor = user && (user.role === "admin" || user.role === "instructor");

  const lastActivityRef = useRef<number>(Date.now());
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [countdownSeconds, setCountdownSeconds] = useState(180);
  const isLoggingOutRef = useRef(false);

  // Catat waktu aktivitas terbaru pengguna
  const recordActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
    if (showWarningModal) {
      setShowWarningModal(false);
    }
  }, [showWarningModal]);

  const handleLogout = useCallback(async (reason: "idle" | "manual" = "idle") => {
    if (isLoggingOutRef.current) return;
    isLoggingOutRef.current = true;
    setShowWarningModal(false);

    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
    } catch {
      // Ignore network errors during logout
    }

    if (reason === "idle") {
      toast.warning("Sesi Anda telah berakhir demi keamanan karena tidak ada aktivitas selama 2 jam.", {
        duration: 8000,
      });
      router.push("/login?reason=timeout");
    } else {
      router.push("/login");
    }
  }, [router]);

  useEffect(() => {
    // Hanya aktif jika pengguna adalah Admin atau Instruktur
    if (!isAdminOrInstructor) return;

    lastActivityRef.current = Date.now();

    // Event listener untuk melacak aktivitas nyata pengguna
    const activityEvents = [
      "mousedown",
      "mousemove",
      "keydown",
      "scroll",
      "touchstart",
      "click",
    ];

    // Throttle event activity agar tidak membebani performa
    let lastThrottled = 0;
    const handleUserEvent = () => {
      const now = Date.now();
      if (now - lastThrottled > 2000) {
        lastThrottled = now;
        recordActivity();
      }
    };

    activityEvents.forEach((event) => {
      window.addEventListener(event, handleUserEvent, { passive: true });
    });

    // Interval pemeriksaan setiap 5 detik
    const timerInterval = setInterval(() => {
      const now = Date.now();
      const elapsed = now - lastActivityRef.current;

      // Cek apakah sudah melebihi 2 jam
      if (elapsed >= ADMIN_IDLE_TIMEOUT_MS) {
        clearInterval(timerInterval);
        handleLogout("idle");
        return;
      }

      // Cek apakah masuk fase peringatan (3 menit terakhir)
      const timeRemaining = ADMIN_IDLE_TIMEOUT_MS - elapsed;
      if (timeRemaining <= WARNING_BEFORE_TIMEOUT_MS) {
        setShowWarningModal(true);
        setCountdownSeconds(Math.max(1, Math.floor(timeRemaining / 1000)));
      } else {
        setShowWarningModal(false);
      }
    }, 5000);

    return () => {
      activityEvents.forEach((event) => {
        window.removeEventListener(event, handleUserEvent);
      });
      clearInterval(timerInterval);
    };
  }, [isAdminOrInstructor, recordActivity, handleLogout]);

  if (!showWarningModal || !isAdminOrInstructor) {
    return null;
  }

  const minutesLeft = Math.floor(countdownSeconds / 60);
  const secondsLeft = countdownSeconds % 60;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#161B2A] border border-amber-300 dark:border-amber-700/50 rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-2xl text-center">
        <div className="w-14 h-14 bg-amber-100 dark:bg-amber-950/60 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4 border border-amber-200 dark:border-amber-800">
          <ShieldAlert size={28} />
        </div>

        <h3 className="text-xl font-bold text-oxford-900 dark:text-white mb-2">
          Peringatan Waktu Sesi Admin
        </h3>
        <p className="text-sm text-oxford-600 dark:text-oxford-300 mb-6 leading-relaxed">
          Tidak ada aktivitas terdeteksi. Demi keamanan akses Super Admin, sesi Anda akan otomatis keluar dalam:
        </p>

        <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-200 rounded-xl font-mono text-xl font-bold mb-6">
          <Clock size={20} className="animate-spin text-amber-600" />
          <span>
            {String(minutesLeft).padStart(2, "0")}:{String(secondsLeft).padStart(2, "0")}
          </span>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => handleLogout("manual")}
            className="flex-1 py-3 px-4 rounded-xl border border-oxford-200 dark:border-oxford-700 text-oxford-700 dark:text-oxford-300 hover:bg-oxford-100 dark:hover:bg-oxford-800 font-semibold text-sm transition-all"
          >
            Keluar Sekarang
          </button>
          <button
            type="button"
            onClick={recordActivity}
            className="flex-1 py-3 px-4 rounded-xl bg-gold-500 hover:bg-gold-600 text-oxford-950 font-bold text-sm shadow-md transition-all"
          >
            Lanjutkan Sesi
          </button>
        </div>
      </div>
    </div>
  );
}
