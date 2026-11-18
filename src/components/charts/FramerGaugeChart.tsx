"use client";

import { motion } from "framer-motion";

interface FramerGaugeChartProps {
  score: number; // 0 to 100
  title: string;
  subTitle?: string;
  size?: number;
  strokeWidth?: number;
  colorScheme?: "auto" | "gold" | "emerald" | "indigo";
  displayValue?: string;
}

export default function FramerGaugeChart({
  score,
  title,
  subTitle,
  size = 140,
  strokeWidth = 12,
  colorScheme = "auto",
  displayValue,
}: FramerGaugeChartProps) {
  const clampedScore = Math.min(100, Math.max(0, score));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (clampedScore / 100) * circumference;

  let color = "#f59e0b"; // gold
  if (colorScheme === "emerald" || (colorScheme === "auto" && clampedScore >= 75)) {
    color = "#10b981"; // emerald
  } else if (colorScheme === "indigo") {
    color = "#6366f1";
  } else if (colorScheme === "auto" && clampedScore < 50) {
    color = "#ef4444"; // crimson
  }

  return (
    <div className="flex flex-col items-center text-center p-3">
      <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          {/* Background Circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-oxford-100 dark:text-oxford-800"
            fill="transparent"
          />

          {/* Animated Value Circle */}
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1.2, ease: "easeOut" }}
            strokeLinecap="round"
            fill="transparent"
          />
        </svg>

        {/* Center Text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <motion.span
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="text-2xl md:text-3xl font-extrabold text-oxford-900 dark:text-white"
          >
            {displayValue || `${clampedScore}%`}
          </motion.span>
        </div>
      </div>

      <h4 className="mt-3 font-bold text-sm text-oxford-900 dark:text-white leading-tight">
        {title}
      </h4>
      {subTitle && (
        <p className="text-[11px] text-oxford-500 dark:text-oxford-400 mt-0.5 leading-snug">
          {subTitle}
        </p>
      )}
    </div>
  );
}
