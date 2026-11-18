"use client";

import { motion } from "framer-motion";
import { CheckCircle2, Users, AlertTriangle, ArrowDown } from "lucide-react";

interface FunnelStep {
  stage: string;
  label: string;
  count: number;
  percent: number;
  dropOff: number;
}

interface FramerFunnelChartProps {
  steps: FunnelStep[];
  totalEnrolled: number;
}

export default function FramerFunnelChart({ steps, totalEnrolled }: FramerFunnelChartProps) {
  if (!steps || steps.length === 0) {
    return (
      <div className="p-8 text-center text-oxford-400 bg-oxford-50 dark:bg-oxford-950/40 rounded-2xl border border-dashed border-oxford-200 dark:border-oxford-800">
        Data corong belum tersedia.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {steps.map((step, idx) => {
        const isFirst = idx === 0;
        const isLast = idx === steps.length - 1;
        const conversionPct = totalEnrolled > 0 ? Math.round((step.count / totalEnrolled) * 100) : 0;
        const dropPct = idx > 0 && steps[idx - 1].count > 0
          ? Math.round(((steps[idx - 1].count - step.count) / steps[idx - 1].count) * 100)
          : 0;

        return (
          <div key={step.stage} className="relative">
            {/* Step Row */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: idx * 0.1, ease: "easeOut" }}
              className={`p-4 md:p-5 rounded-2xl border transition-all ${
                isLast && step.count > 0
                  ? "bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent border-emerald-500/30"
                  : "bg-white dark:bg-[#161B2A] border-oxford-200 dark:border-oxford-800 shadow-sm"
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-3 mb-2.5">
                <div className="flex items-center gap-3">
                  <span className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                    isLast 
                      ? "bg-emerald-500 text-white" 
                      : isFirst 
                      ? "bg-oxford-900 dark:bg-oxford-700 text-white" 
                      : "bg-gold-500 text-oxford-950"
                  }`}>
                    {idx + 1}
                  </span>
                  <span className="font-bold text-sm md:text-base text-oxford-900 dark:text-white">
                    {step.label}
                  </span>
                </div>

                <div className="flex items-center gap-4">
                  {idx > 0 && dropPct > 0 && (
                    <span className="text-xs font-semibold text-rose-500 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded-full border border-rose-200 dark:border-rose-900 flex items-center gap-1">
                      <ArrowDown size={12} /> {dropPct}% drop
                    </span>
                  )}
                  <span className="text-base md:text-lg font-bold text-oxford-900 dark:text-white">
                    {step.count.toLocaleString("id-ID")} <span className="text-xs font-normal text-oxford-400">peserta</span>
                  </span>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                    conversionPct >= 80 
                      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300" 
                      : conversionPct >= 50 
                      ? "bg-gold-100 text-gold-800 dark:bg-gold-950 dark:text-gold-300" 
                      : "bg-oxford-100 text-oxford-700 dark:bg-oxford-800 dark:text-oxford-300"
                  }`}>
                    {conversionPct}%
                  </span>
                </div>
              </div>

              {/* Progress Bar with Framer Motion spring */}
              <div className="w-full h-3 bg-oxford-100 dark:bg-oxford-900 rounded-full overflow-hidden p-0.5">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.max(2, conversionPct)}%` }}
                  transition={{ duration: 0.8, delay: 0.2 + idx * 0.1, ease: "easeOut" }}
                  className={`h-full rounded-full ${
                    isLast
                      ? "bg-gradient-to-r from-emerald-500 to-emerald-400 shadow-sm"
                      : isFirst
                      ? "bg-gradient-to-r from-oxford-700 to-oxford-900 dark:from-oxford-400 dark:to-oxford-200"
                      : "bg-gradient-to-r from-gold-500 to-gold-400"
                  }`}
                />
              </div>
            </motion.div>
          </div>
        );
      })}
    </div>
  );
}
