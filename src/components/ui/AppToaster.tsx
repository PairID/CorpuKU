"use client";

import { Toaster as SonnerToaster } from "sonner";
import { AlertTriangle, Check, Info, X } from "lucide-react";
import { useTheme } from "@/components/theme-provider";

export function AppToaster() {
  const themeContext = useTheme();
  const theme = themeContext?.resolvedTheme || "light";

  return (
    <SonnerToaster
      theme={theme as "light" | "dark"}
      position="bottom-center"
      closeButton
      offset={24}
      gap={8}
      icons={{
        success: (
          <span className="w-7 h-7 rounded-full bg-[#16A34A] text-white flex items-center justify-center shrink-0">
            <Check size={14} strokeWidth={2.75} />
          </span>
        ),
        error: (
          <span className="w-7 h-7 rounded-full bg-[#DC2626] text-white flex items-center justify-center shrink-0">
            <X size={14} strokeWidth={2.75} />
          </span>
        ),
        warning: (
          <span className="w-7 h-7 rounded-full bg-[#D97706] text-white flex items-center justify-center shrink-0">
            <AlertTriangle size={14} strokeWidth={2.5} />
          </span>
        ),
        info: (
          <span className="w-7 h-7 rounded-full bg-[#6B7280] text-white flex items-center justify-center shrink-0">
            <Info size={14} strokeWidth={2.5} />
          </span>
        ),
      }}
      toastOptions={{
        duration: 3800,
        className:
          "group font-sans !rounded-xl border !px-3.5 !py-3 !gap-3 !items-center select-none relative overflow-hidden",
        classNames: {
          toast:
            "!bg-white dark:!bg-[#111111] !border-[#EAEAEA] dark:!border-neutral-800 !text-[#111111] dark:!text-white !shadow-[0_10px_28px_rgba(0,0,0,0.08)] dark:!shadow-[0_12px_32px_rgba(0,0,0,0.28)] !opacity-100 !w-[min(400px,calc(100vw-32px))]",
          icon: "!w-7 !h-7 !m-0 shrink-0",
          content: "!flex-1 !min-w-0 !gap-0.5",
          title:
            "!font-semibold !text-[14px] !text-[#111111] dark:!text-white !leading-snug",
          description:
            "!text-[13px] !text-[#777777] dark:!text-[#A3A3A3] !leading-snug",
          actionButton:
            "!rounded-full !bg-[#111111] dark:!bg-white !text-white dark:!text-[#111111] !font-semibold !text-xs !px-3 !py-1.5 !border-0 cursor-pointer shrink-0 transition-opacity hover:opacity-90",
          cancelButton:
            "!rounded-full !bg-neutral-100 dark:!bg-neutral-800 !text-[#555555] dark:!text-neutral-200 !font-semibold !text-xs !px-3 !py-1.5 cursor-pointer shrink-0 transition-colors hover:bg-neutral-200 dark:hover:bg-neutral-700",
          closeButton:
            "!static !transform-none !ml-auto !border-0 !bg-transparent !text-[#888888] hover:!text-[#111111] dark:hover:!text-white transition-colors cursor-pointer shrink-0",
        },
      }}
    />
  );
}

export default AppToaster;
