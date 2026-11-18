"use client";

import { motion } from "framer-motion";
import { Award, CheckCircle, XCircle } from "lucide-react";

interface HistogramBucket {
  label: string;
  range: string;
  count: number;
  color: string;
}

interface FramerHistogramProps {
  buckets: HistogramBucket[];
  totalAttempts: number;
  highestScore: number;
  lowestScore: number;
  avgScore: number;
  passingScore: number;
}

export default function FramerHistogram({
  buckets,
  totalAttempts,
  highestScore,
  lowestScore,
  avgScore,
  passingScore,
}: FramerHistogramProps) {
  if (totalAttempts === 0) {
    return (
      <div className="p-8 text-center text-oxford-400 bg-oxford-50 dark:bg-oxford-950/40 rounded-2xl border border-dashed border-oxford-200 dark:border-oxford-800 text-sm">
        Belum ada percobaan kuis atau ujian yang tercatat untuk kelas ini.
      </div>
    );
  }

  const maxCount = Math.max(...buckets.map((b) => b.count), 1);

  return (
    <div className="space-y-6">
      {/* Top Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 bg-oxford-50 dark:bg-oxford-950/60 rounded-xl border border-oxford-100 dark:border-oxford-800">
          <p className="text-[11px] font-bold text-oxford-400 uppercase">Rata-Rata Nilai</p>
          <p className="text-xl font-extrabold text-oxford-900 dark:text-white mt-0.5">{avgScore}</p>
        </div>
        <div className="p-3.5 bg-oxford-50 dark:bg-oxford-950/60 rounded-xl border border-oxford-100 dark:border-oxford-800">
          <p className="text-[11px] font-bold text-oxford-400 uppercase">Nilai Tertinggi</p>
          <p className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5">{highestScore}</p>
        </div>
        <div className="p-3.5 bg-oxford-50 dark:bg-oxford-950/60 rounded-xl border border-oxford-100 dark:border-oxford-800">
          <p className="text-[11px] font-bold text-oxford-400 uppercase">Nilai Terendah</p>
          <p className="text-xl font-extrabold text-rose-600 dark:text-rose-400 mt-0.5">{lowestScore}</p>
        </div>
        <div className="p-3.5 bg-oxford-50 dark:bg-oxford-950/60 rounded-xl border border-oxford-100 dark:border-oxford-800">
          <p className="text-[11px] font-bold text-oxford-400 uppercase">Standar Kelulusan</p>
          <p className="text-xl font-extrabold text-gold-600 mt-0.5">≥ {passingScore}</p>
        </div>
      </div>

      {/* Histogram Bars */}
      <div className="space-y-3.5 pt-2">
        {buckets.map((bucket, idx) => {
          const countPct = Math.round((bucket.count / totalAttempts) * 100);
          const barWidth = Math.min(100, Math.max(3, Math.round((bucket.count / maxCount) * 100)));

          return (
            <div key={bucket.range} className="space-y-1">
              <div className="flex justify-between text-xs font-sans">
                <span className="font-bold text-oxford-800 dark:text-oxford-200">
                  {bucket.label}
                </span>
                <span className="font-bold text-oxford-900 dark:text-white">
                  {bucket.count} peserta <span className="text-oxford-400 font-normal">({countPct}%)</span>
                </span>
              </div>

              <div className="h-3.5 w-full bg-oxford-100 dark:bg-oxford-900 rounded-full overflow-hidden p-0.5">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${barWidth}%` }}
                  transition={{ duration: 0.7, delay: idx * 0.08, ease: "easeOut" }}
                  className="h-full rounded-full"
                  style={{ backgroundColor: bucket.color }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
