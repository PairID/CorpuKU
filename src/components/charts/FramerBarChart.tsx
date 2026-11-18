"use client";

import { motion } from "framer-motion";
import { useState } from "react";

export interface FramerBarItem {
  id?: string;
  label: string;
  subLabel?: string;
  value: number; // e.g. percentage or count
  displayValue?: string;
  color?: string; // e.g. '#f59e0b', '#10b981'
  highlight?: boolean;
}

interface FramerBarChartProps {
  items: FramerBarItem[];
  orientation?: "horizontal" | "vertical";
  maxValue?: number;
  height?: number; // for vertical
}

export default function FramerBarChart({
  items,
  orientation = "horizontal",
  maxValue = 100,
  height = 200,
}: FramerBarChartProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (!items || items.length === 0) {
    return (
      <div className="p-8 text-center text-oxford-400 bg-oxford-50 dark:bg-oxford-950/40 rounded-2xl border border-dashed border-oxford-200 dark:border-oxford-800 text-sm">
        Data grafik belum tersedia.
      </div>
    );
  }

  const effectiveMax = maxValue || Math.max(...items.map((i) => i.value), 100);

  if (orientation === "vertical") {
    return (
      <div className="w-full">
        <div className="flex items-end justify-between gap-2 pt-8 pb-3 px-2 border-b border-oxford-100 dark:border-oxford-800" style={{ height: `${height}px` }}>
          {items.map((item, idx) => {
            const heightPct = Math.min(100, Math.max(4, Math.round((item.value / effectiveMax) * 100)));
            const isHovered = hoveredIdx === idx;

            return (
              <div
                key={item.id || idx}
                className="flex-1 flex flex-col items-center h-full justify-end relative group cursor-pointer"
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
              >
                {/* Tooltip */}
                <motion.div
                  initial={false}
                  animate={{ opacity: isHovered ? 1 : 0, y: isHovered ? -8 : 0 }}
                  className="absolute -top-10 z-20 pointer-events-none bg-oxford-950 text-white text-[11px] font-bold px-2.5 py-1 rounded-lg shadow-lg whitespace-nowrap border border-oxford-800"
                >
                  <p>{item.label}: {item.displayValue || `${item.value}%`}</p>
                  {item.subLabel && <p className="text-[10px] text-oxford-400 font-normal">{item.subLabel}</p>}
                </motion.div>

                {/* Animated Bar */}
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${heightPct}%` }}
                  transition={{ duration: 0.6, delay: idx * 0.05, ease: "easeOut" }}
                  className={`w-full max-w-[48px] rounded-t-xl transition-all ${
                    item.color
                      ? ""
                      : item.highlight
                      ? "bg-gold-500 hover:bg-gold-400"
                      : "bg-oxford-800 dark:bg-oxford-700 hover:bg-gold-500"
                  }`}
                  style={{ backgroundColor: item.color }}
                />
              </div>
            );
          })}
        </div>

        {/* Labels underneath */}
        <div className="flex justify-between gap-2 mt-2 px-1 text-center">
          {items.map((item, idx) => (
            <div key={item.id || idx} className="flex-1 truncate">
              <p className="text-[11px] font-bold text-oxford-700 dark:text-oxford-300 truncate">
                {item.label}
              </p>
              <p className="text-[10px] text-oxford-400 font-medium">
                {item.displayValue || `${item.value}%`}
              </p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Horizontal orientation
  return (
    <div className="space-y-4 w-full">
      {items.map((item, idx) => {
        const widthPct = Math.min(100, Math.max(3, Math.round((item.value / effectiveMax) * 100)));

        return (
          <div key={item.id || idx} className="space-y-1.5">
            <div className="flex justify-between text-xs md:text-sm font-sans">
              <span className="font-bold text-oxford-800 dark:text-oxford-200 flex items-center gap-2 truncate">
                <span className="text-oxford-400 font-mono text-xs">#{idx + 1}</span> {item.label}
              </span>
              <span className="font-bold text-oxford-900 dark:text-white shrink-0 ml-2">
                {item.displayValue || `${item.value}%`}
                {item.subLabel && <span className="text-oxford-400 text-xs font-normal ml-1">({item.subLabel})</span>}
              </span>
            </div>

            <div className="h-3 w-full bg-oxford-100 dark:bg-oxford-900 rounded-full overflow-hidden p-0.5">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${widthPct}%` }}
                transition={{ duration: 0.7, delay: idx * 0.06, ease: "easeOut" }}
                className={`h-full rounded-full transition-all ${
                  item.color
                    ? ""
                    : item.value >= 80
                    ? "bg-gradient-to-r from-emerald-500 to-emerald-400"
                    : item.value >= 50
                    ? "bg-gradient-to-r from-gold-500 to-gold-400"
                    : "bg-gradient-to-r from-crimson-500 to-crimson-400"
                }`}
                style={{ backgroundColor: item.color }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
