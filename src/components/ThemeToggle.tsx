"use client";

import { useEffect, useState } from "react";
import { useTheme } from "@/components/theme-provider";
import { Moon, Sun } from "lucide-react";
import { motion } from "framer-motion";

export default function ThemeToggle() {
    const { resolvedTheme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        return (
            <button
                className="relative p-2 w-9 h-9 rounded-xl bg-oxford-100 dark:bg-oxford-800 text-oxford-600 dark:text-oxford-300 transition-colors"
                aria-label="Toggle theme"
            >
                <div className="w-5 h-5" />
            </button>
        );
    }

    const isDark = resolvedTheme === "dark";

    return (
        <button
            onClick={() => setTheme(isDark ? "light" : "dark")}
            className="relative p-2 w-9 h-9 rounded-xl bg-oxford-100 dark:bg-oxford-800 text-oxford-600 dark:text-oxford-300 hover:text-gold-500 transition-colors group overflow-hidden"
            aria-label="Toggle theme"
        >
            <motion.div
                initial={false}
                animate={{
                    y: isDark ? 0 : 40,
                    opacity: isDark ? 1 : 0
                }}
                transition={{ duration: 0.3, ease: "backOut" }}
                className="absolute inset-0 flex items-center justify-center"
            >
                <Sun size={20} />
            </motion.div>
            
            <motion.div
                initial={false}
                animate={{
                    y: !isDark ? 0 : -40,
                    opacity: !isDark ? 1 : 0
                }}
                transition={{ duration: 0.3, ease: "backOut" }}
                className="flex items-center justify-center"
            >
                <Moon size={20} />
            </motion.div>
        </button>
    );
}
