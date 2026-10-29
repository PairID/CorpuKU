"use client";

import { Toaster as SonnerToaster } from "sonner";
import { useTheme } from "@/components/theme-provider";

export function AppToaster() {
  const themeContext = useTheme();
  const theme = themeContext?.resolvedTheme || "light";

  return (
    <SonnerToaster
      theme={theme as "light" | "dark"}
      position="top-center"
      closeButton
      offset={20}
      gap={10}
      toastOptions={{
        duration: 4000,
        className:
          "group font-sans rounded-2xl border p-4 shadow-xl text-sm transition-all select-none",
        classNames: {
          toast:
            "bg-white dark:bg-[#161B2A] border-oxford-200 dark:border-oxford-700 text-oxford-900 dark:text-white shadow-xl shadow-oxford-950/10 dark:shadow-black/40",
          title: "font-bold text-sm text-oxford-900 dark:text-white leading-snug",
          description: "text-xs text-oxford-600 dark:text-oxford-300 mt-1 leading-relaxed",
          actionButton:
            "!bg-crimson-600 hover:!bg-crimson-700 !text-white font-bold text-xs rounded-xl px-3.5 py-2 transition-all cursor-pointer shadow-sm shrink-0",
          cancelButton:
            "!bg-oxford-100 hover:!bg-oxford-200 dark:!bg-oxford-800 dark:hover:!bg-oxford-700 !text-oxford-800 dark:!text-oxford-200 font-semibold text-xs rounded-xl px-3.5 py-2 transition-all cursor-pointer shrink-0",
          closeButton:
            "!border-none !bg-transparent hover:!bg-oxford-100 dark:hover:!bg-oxford-800 text-oxford-400 hover:text-oxford-700 dark:hover:text-oxford-200 transition-colors",
          success:
            "!border-emerald-300 dark:!border-emerald-700/70 !bg-emerald-50/70 dark:!bg-[#11231f]",
          error:
            "!border-crimson-300 dark:!border-crimson-800/70 !bg-crimson-50/70 dark:!bg-[#261314]",
          warning:
            "!border-amber-300 dark:!border-amber-700/70 !bg-amber-50/70 dark:!bg-[#261d12]",
          info:
            "!border-oxford-200 dark:!border-oxford-700 !bg-oxford-50/70 dark:!bg-[#161B2A]",
        },
      }}
    />
  );
}

export default AppToaster;
