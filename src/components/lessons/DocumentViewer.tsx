"use client";

import { useMemo, useState } from "react";
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

  return (
    <div
      className={
        isFullscreen
          ? "fixed inset-0 z-50 bg-black flex flex-col p-2 md:p-4 animate-in fade-in duration-200"
          : "w-full mb-8 rounded-2xl bg-white dark:bg-[#161B2A] border border-oxford-200 dark:border-oxford-700 shadow-sm overflow-hidden flex flex-col transition-all"
      }
    >
      {/* Header Toolbar */}
      <div className="px-4 py-3 bg-oxford-50 dark:bg-oxford-900/80 border-b border-oxford-200 dark:border-oxford-700 flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-2 rounded-xl bg-gold-500/15 text-gold-600 dark:text-gold-400 shrink-0">
            <FileText size={18} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-oxford-900 dark:text-white truncate">
                {title || "Materi Pembelajaran"}
              </span>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-oxford-200/70 dark:bg-oxford-800 text-oxford-700 dark:text-oxford-300 shrink-0">
                {badgeLabel}
              </span>
            </div>
            <p className="text-xs text-oxford-500 truncate">
              Pratinjau dokumen langsung di dalam kelas
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {parsed.sourceType === "pdf" && (
            <button
              type="button"
              onClick={() => setUseGoogleViewerFallback((prev) => !prev)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-oxford-200 dark:border-oxford-700 bg-white dark:bg-oxford-800 text-oxford-700 dark:text-white hover:bg-oxford-50 dark:hover:bg-oxford-700 transition-colors"
              title="Beralih antara mode viewer native & Google Docs viewer"
            >
              <RefreshCw size={12} />
              <span className="hidden sm:inline">
                {useGoogleViewerFallback ? "Viewer Native" : "Viewer Cadangan"}
              </span>
            </button>
          )}

          <a
            href={parsed.originalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border border-oxford-200 dark:border-oxford-700 bg-white dark:bg-oxford-800 text-oxford-900 dark:text-white hover:bg-oxford-100 dark:hover:bg-oxford-700 transition-colors shadow-xs"
            title="Buka file di tab baru"
          >
            <ExternalLink size={13} />
            <span>Tab Baru</span>
          </a>

          <a
            href={parsed.originalUrl}
            download
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-gold-500 hover:bg-gold-400 text-oxford-950 transition-colors shadow-xs"
            title="Unduh file ke perangkat"
          >
            <Download size={13} />
            <span>Unduh</span>
          </a>

          <button
            type="button"
            onClick={() => setIsFullscreen((prev) => !prev)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-oxford-900 hover:bg-oxford-800 dark:bg-oxford-800 dark:hover:bg-oxford-700 dark:border dark:border-oxford-600 text-white transition-colors"
            title={isFullscreen ? "Keluar layar penuh" : "Tampilkan layar penuh"}
          >
            {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
            <span className="hidden sm:inline">
              {isFullscreen ? "Keluar" : "Layar Penuh"}
            </span>
          </button>
        </div>
      </div>

      {/* Frame Container */}
      <div
        className={`relative w-full bg-oxford-100 dark:bg-black flex-1 min-h-[500px] ${
          isFullscreen ? "h-full" : "h-[560px] md:h-[720px]"
        }`}
      >
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
}
