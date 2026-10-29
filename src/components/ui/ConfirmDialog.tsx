"use client";

import React, { useEffect, useCallback } from "react";
import { AlertTriangle, Trash2, Info, X, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  description?: string;
  itemName?: string;
  warningText?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "warning" | "info";
  isLoading?: boolean;
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  itemName,
  warningText,
  confirmText = "Konfirmasi",
  cancelText = "Batal",
  variant = "danger",
  isLoading = false,
}: ConfirmDialogProps) {
  // Handle ESC key to cancel
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isLoading) {
        onClose();
      }
    },
    [onClose, isLoading]
  );

  useEffect(() => {
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
      // Prevent background scrolling while modal is open
      const originalStyle = window.getComputedStyle(document.body).overflow;
      document.body.style.overflow = "hidden";
      return () => {
        window.removeEventListener("keydown", handleKeyDown);
        document.body.style.overflow = originalStyle;
      };
    }
  }, [isOpen, handleKeyDown]);

  const variantStyles = {
    danger: {
      badgeBg: "bg-crimson-100 dark:bg-crimson-950/60",
      badgeBorder: "border-crimson-200 dark:border-crimson-800",
      badgeText: "text-crimson-600 dark:text-crimson-400",
      icon: Trash2,
      confirmBtn:
        "bg-crimson-600 hover:bg-crimson-700 text-white shadow-sm focus:ring-crimson-500",
      accentBorder: "border-crimson-200 dark:border-crimson-900/60",
    },
    warning: {
      badgeBg: "bg-amber-100 dark:bg-amber-950/60",
      badgeBorder: "border-amber-200 dark:border-amber-800",
      badgeText: "text-amber-600 dark:text-amber-400",
      icon: AlertTriangle,
      confirmBtn:
        "bg-amber-500 hover:bg-amber-600 text-oxford-950 shadow-sm focus:ring-amber-500 font-bold",
      accentBorder: "border-amber-200 dark:border-amber-900/60",
    },
    info: {
      badgeBg: "bg-oxford-100 dark:bg-oxford-800",
      badgeBorder: "border-oxford-200 dark:border-oxford-700",
      badgeText: "text-oxford-700 dark:text-oxford-300",
      icon: Info,
      confirmBtn:
        "bg-oxford-900 hover:bg-oxford-800 text-white shadow-sm focus:ring-oxford-500",
      accentBorder: "border-oxford-200 dark:border-oxford-700",
    },
  };

  const currentVariant = variantStyles[variant];
  const IconComponent = currentVariant.icon;

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-dialog-title"
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={() => !isLoading && onClose()}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Dialog Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="relative bg-white dark:bg-[#161B2A] border border-oxford-200 dark:border-oxford-700 rounded-2xl shadow-2xl max-w-lg w-full p-6 md:p-7 overflow-hidden z-10"
          >
            {/* Close button */}
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="absolute top-5 right-5 p-1.5 text-oxford-400 hover:text-oxford-700 dark:hover:text-oxford-200 hover:bg-oxford-100 dark:hover:bg-oxford-800 rounded-lg transition-colors disabled:opacity-40 cursor-pointer"
              title="Tutup dialog"
            >
              <X size={18} />
            </button>

            {/* Content Header with Icon Badge */}
            <div className="flex items-start gap-4">
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border ${currentVariant.badgeBg} ${currentVariant.badgeBorder} ${currentVariant.badgeText}`}
              >
                <IconComponent size={24} />
              </div>

              <div className="flex-1 pr-6">
                <h3
                  id="confirm-dialog-title"
                  className="text-lg font-bold text-oxford-900 dark:text-white leading-snug"
                >
                  {title}
                </h3>
                {description && (
                  <p className="text-sm text-oxford-600 dark:text-oxford-300 mt-1.5 leading-relaxed">
                    {description}
                  </p>
                )}
              </div>
            </div>

            {/* Quoted item name if provided */}
            {itemName && (
              <div className="mt-4 p-3.5 rounded-xl bg-oxford-50 dark:bg-oxford-950 border border-oxford-200 dark:border-oxford-800">
                <p className="text-xs font-semibold text-oxford-500 dark:text-oxford-400 mb-0.5">
                  Item yang dipilih:
                </p>
                <p className="text-sm font-bold text-oxford-900 dark:text-white line-clamp-2">
                  &ldquo;{itemName}&rdquo;
                </p>
              </div>
            )}

            {/* Warning callout */}
            {warningText && (
              <div className="mt-3.5 p-3 rounded-xl bg-crimson-50/70 dark:bg-crimson-950/40 border border-crimson-200 dark:border-crimson-800/60 text-xs text-crimson-800 dark:text-crimson-200 flex items-start gap-2 leading-relaxed">
                <AlertTriangle size={15} className="shrink-0 mt-0.5 text-crimson-600 dark:text-crimson-400" />
                <span>{warningText}</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="mt-6 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 pt-4 border-t border-oxford-100 dark:border-oxford-800">
              <button
                type="button"
                onClick={onClose}
                disabled={isLoading}
                className="px-4 py-2.5 text-sm font-semibold text-oxford-700 dark:text-oxford-300 hover:text-oxford-900 dark:hover:text-white hover:bg-oxford-100 dark:hover:bg-oxford-800 rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
              >
                {cancelText}
              </button>
              <button
                type="button"
                onClick={async () => {
                  await onConfirm();
                }}
                disabled={isLoading}
                className={`inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-bold rounded-xl transition-all disabled:opacity-50 cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-[#161B2A] ${currentVariant.confirmBtn}`}
              >
                {isLoading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Memproses...</span>
                  </>
                ) : (
                  <span>{confirmText}</span>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
