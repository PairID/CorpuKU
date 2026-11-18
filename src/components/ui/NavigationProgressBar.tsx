"use client";

import { useEffect, useState, Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";

function ProgressBarInner() {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [isNavigating, setIsNavigating] = useState(false);
    const [progress, setProgress] = useState(0);

    // Selesaikan progres saat rute selesai berubah
    useEffect(() => {
        if (isNavigating) {
            setProgress(100);
            const timer = setTimeout(() => {
                setIsNavigating(false);
                setProgress(0);
            }, 300);
            return () => clearTimeout(timer);
        }
    }, [pathname, searchParams]);

    // Deteksi klik pada semua tautan navigasi (menu, course card, tombol rute)
    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            // Ambil elemen anchor terdekat
            const target = (e.target as HTMLElement).closest("a");
            if (!target) return;

            const href = target.getAttribute("href");
            if (!href) return;

            // Abaikan tautan eksternal, tel/mailto, hash, download, tab baru, atau klik dengan tombol modifier
            if (
                href.startsWith("#") ||
                href.startsWith("mailto:") ||
                href.startsWith("tel:") ||
                href.startsWith("javascript:") ||
                target.target === "_blank" ||
                target.hasAttribute("download") ||
                e.ctrlKey ||
                e.metaKey ||
                e.shiftKey ||
                e.altKey ||
                e.button !== 0 // Hanya klik kiri
            ) {
                return;
            }

            // Abaikan jika menuju halaman yang sama persis
            const currentUrl = window.location.pathname + window.location.search;
            if (href === currentUrl || href === window.location.href) {
                return;
            }

            // Tampilkan progress bar responsif seketika
            if (href.startsWith("/") || href.startsWith(window.location.origin)) {
                setIsNavigating(true);
                setProgress(28);

                // Animasi bertahap agar user tau proses sedang berjalan
                setTimeout(() => setProgress((prev) => (prev > 0 && prev < 65 ? 65 : prev)), 120);
                setTimeout(() => setProgress((prev) => (prev > 0 && prev < 88 ? 88 : prev)), 350);
            }
        };

        const handleStartNav = () => {
            setIsNavigating(true);
            setProgress(30);
            setTimeout(() => setProgress((prev) => (prev > 0 && prev < 75 ? 75 : prev)), 150);
        };

        const handleEndNav = () => {
            setProgress(100);
            setTimeout(() => {
                setIsNavigating(false);
                setProgress(0);
            }, 300);
        };

        window.addEventListener("click", handleClick, { capture: true });
        window.addEventListener("app-nav-start", handleStartNav);
        window.addEventListener("app-nav-end", handleEndNav);

        return () => {
            window.removeEventListener("click", handleClick, { capture: true });
            window.removeEventListener("app-nav-start", handleStartNav);
            window.removeEventListener("app-nav-end", handleEndNav);
        };
    }, []);

    // Batas aman timeout (fallback jika jaringan lambat / navigasi batal)
    useEffect(() => {
        if (isNavigating) {
            const fallbackTimer = setTimeout(() => {
                setIsNavigating(false);
                setProgress(0);
            }, 8000);
            return () => clearTimeout(fallbackTimer);
        }
    }, [isNavigating]);

    if (!isNavigating && progress === 0) return null;

    return (
        <div
            role="progressbar"
            aria-label="Memuat Halaman"
            className="fixed top-0 left-0 right-0 z-[99999] pointer-events-none h-[3.5px] bg-transparent"
        >
            <div
                className="h-full bg-gradient-to-r from-gold-600 via-gold-400 to-amber-300 shadow-[0_0_14px_rgba(239,177,25,0.9)] relative"
                style={{
                    width: `${progress}%`,
                    opacity: progress === 100 ? 0 : 1,
                    transition: progress === 100 
                        ? "width 0.15s ease-out, opacity 0.25s ease-in" 
                        : "width 0.28s cubic-bezier(0.4, 0, 0.2, 1)",
                }}
            >
                {/* Efek kilau cahaya di ujung garis progress */}
                <div className="absolute top-0 right-0 bottom-0 w-28 bg-gradient-to-r from-transparent via-white/40 to-white/90 shadow-[0_0_16px_rgba(255,255,255,0.9)]" />
            </div>
        </div>
    );
}

export function NavigationProgressBar() {
    return (
        <Suspense fallback={null}>
            <ProgressBarInner />
        </Suspense>
    );
}
