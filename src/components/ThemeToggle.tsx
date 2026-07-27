"use client";

import { useTheme } from "@/components/theme-provider";
import { Moon, Sun } from "lucide-react";
import { motion } from "framer-motion";

export default function ThemeToggle() {
    const { theme, setTheme } = useTheme();

    return (
        <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="relative p-2 rounded-xl bg-oxford-100 dark:bg-[#161B2A] dark:bg-oxford-800 text-oxford-600 dark:text-oxford-300 hover:text-gold-500 transition-colors group overflow-hidden"
            aria-label="Toggle theme"
        >
            <motion.div
                initial={false}
                animate={{
                    y: theme === "dark" ? 0 : 40,
                    opacity: theme === "dark" ? 1 : 0
                }}
                transition={{ duration: 0.3, ease: "backOut" }}
                className="absolute inset-0 flex items-center justify-center"
            >
                <Sun size={20} />
            </motion.div>
            
            <motion.div
                initial={false}
                animate={{
                    y: theme === "light" ? 0 : -40,
                    opacity: theme === "light" ? 1 : 0
                }}
                transition={{ duration: 0.3, ease: "backOut" }}
                className="flex items-center justify-center"
            >
                <Moon size={20} />
            </motion.div>
        </button>
    );
}
