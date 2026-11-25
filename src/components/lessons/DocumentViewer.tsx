"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  Download,
  ExternalLink,
  Eye,
  FileText,
  Maximize2,
  Minimize2,
  RefreshCw,
} from "lucide-react";

interface DocumentViewerProps {
  url: string;
  title: string;
}

interface ParsedDoc {
  embedUrl: string;
  originalUrl: string;
  sourceType: "gdrive" | "gdocs" | "pdf" | "other";
  canEmbed: boolean;
}

function parseDocumentUrl(rawUrl: string): ParsedDoc {
  if (!rawUrl || typeof rawUrl !== "string") {
    return { embedUrl: "", originalUrl: "", sourceType: "other", canEmbed: false };
  }
  const url = rawUrl.trim().replace(/&amp;/g, '&');

  // 1. Google Drive direct file link: drive.google.com/file/d/{id}/...
  const driveFileMatch = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (driveFileMatch && driveFileMatch[1]) {
    return {
      embedUrl: `https://drive.google.com/file/d/${driveFileMatch[1]}/preview`,
      originalUrl: url,
      sourceType: "gdrive",
      canEmbed: true,
    };
  }

  // Google Drive link with ?id=, uc?id=, open?id=
  const driveIdMatch = url.match(/drive\.google\.com\/[^\s"'<>]*[?&]id=([a-zA-Z0-9_-]+)/);
  if (driveIdMatch && driveIdMatch[1]) {
    return {
      embedUrl: `https://drive.google.com/file/d/${driveIdMatch[1]}/preview`,
      originalUrl: url,
      sourceType: "gdrive",
      canEmbed: true,
    };
  }

  // 2. Google Docs / Sheets / Slides
  if (/docs\.google\.com\/(document|presentation|spreadsheets)\/d\/([a-zA-Z0-9_-]+)/.test(url)) {
    const previewUrl = url
      .replace(/\/edit(\?.*)?$/, "/preview")
      .replace(/\/view(\?.*)?$/, "/preview");
    return {
      embedUrl: previewUrl.includes("/preview") ? previewUrl : `${previewUrl}/preview`,
      originalUrl: url,
      sourceType: "gdocs",
      canEmbed: true,
    };
  }

  // 3. Cloudinary or Direct PDF link
  const isPdf = /\.pdf($|\?)/i.test(url) || url.includes("/image/upload/") || url.includes("/raw/upload/");
  if (isPdf) {
    return {
      embedUrl: url,
      originalUrl: url,
      sourceType: "pdf",
      canEmbed: true,
    };
  }

  // 4. Default web link
  return {
    embedUrl: url,
    originalUrl: url,
    sourceType: "other",
    canEmbed: true,
  };
}

export default function DocumentViewer({ url, title }: DocumentViewerProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [useGoogleViewerFallback, setUseGoogleViewerFallback] = useState(false);

  const parsed = useMemo(() => parseDocumentUrl(url), [url]);

  const activeSrc = useMemo(() => {
    if (!parsed.canEmbed) return "";
    if (parsed.sourceType === "pdf" && useGoogleViewerFallback) {
      return `https://docs.google.com/viewer?url=${encodeURIComponent(parsed.embedUrl)}&embedded=true`;
    }
    return parsed.embedUrl;
  }, [parsed, useGoogleViewerFallback]);

  if (!parsed.originalUrl) {
    return (
      <div className="p-8 bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-200 rounded-2xl border border-amber-200 dark:border-amber-800 text-center text-sm">
        Tautan file materi belum tersedia atau rusak.
      </div>
    );
  }

  const badgeLabel =
    parsed.sourceType === "gdrive"
      ? "Google Drive"
      : parsed.sourceType === "gdocs"
      ? "Google Docs / Slides"
      : parsed.sourceType === "pdf"
      ? "Dokumen PDF"
      : "Dokumen Materi";

  useEffect(() => {
    if (!isFullscreen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsFullscreen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isFullscreen]);

  const viewerContent = (
    <div
      className={
        isFullscreen
          ? "fixed inset-0 z-[9999] w-screen h-screen bg-black flex flex-col p-2 md:p-4 animate-in fade-in duration-200"
          : "w-full rounded-xl bg-white dark:bg-[#161B2A] border border-oxford-200 dark:border-oxford-700 shadow-sm overflow-hidden flex flex-col transition-all"
      }
    >
      {/* Frame Container + Floating Icon Controls di Kanan Atas */}
      <div
        className={`relative w-full bg-oxford-100 dark:bg-black ${
          isFullscreen ? "flex-1 min-h-0 h-full" : "h-[170px] md:h-[360px]"
        }`}
      >
        <div className="absolute top-2.5 right-2.5 z-20 flex items-center gap-1.5">
          {parsed.sourceType === "pdf" && (
            <button
              type="button"
              onClick={() => setUseGoogleViewerFallback((prev) => !prev)}
              className="p-2 rounded-lg bg-oxford-950/80 hover:bg-oxford-950 text-white backdrop-blur-sm shadow-md shadow-black/25 transition-colors"
              title={useGoogleViewerFallback ? "Beralih ke Viewer Native" : "Beralih ke Viewer Cadangan"}
              aria-label={useGoogleViewerFallback ? "Viewer Native" : "Viewer Cadangan"}
            >
              <RefreshCw size={14} />
            </button>
          )}

          <a
            href={parsed.originalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-lg bg-oxford-950/80 hover:bg-oxford-950 text-white backdrop-blur-sm shadow-md shadow-black/25 transition-colors"
            title="Buka di Tab Baru"
            aria-label="Buka di Tab Baru"
          >
            <ExternalLink size={14} />
          </a>

          <a
            href={parsed.originalUrl}
            download
            className="p-2 rounded-lg bg-gold-500/95 hover:bg-gold-400 text-oxford-950 shadow-md shadow-black/25 transition-colors"
            title="Unduh Dokumen"
            aria-label="Unduh Dokumen"
          >
            <Download size={14} />
          </a>

          <button
            type="button"
            onClick={() => setIsFullscreen((prev) => !prev)}
            className="p-2 rounded-lg bg-oxford-950/80 hover:bg-oxford-950 text-white backdrop-blur-sm shadow-md shadow-black/25 transition-colors"
            title={isFullscreen ? "Keluar Layar Penuh" : "Layar Penuh"}
            aria-label={isFullscreen ? "Keluar Layar Penuh" : "Layar Penuh"}
          >
            {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
        </div>

        <iframe
          key={`${activeSrc}-${reloadKey}`}
          src={activeSrc}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          className="w-full h-full border-0"
        />
      </div>
    </div>
  );

  if (isFullscreen && typeof document !== "undefined") {
    return createPortal(viewerContent, document.body);
  }

  return viewerContent;
}
