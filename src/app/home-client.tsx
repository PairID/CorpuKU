"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, type Variants, AnimatePresence } from "framer-motion";
import { ArrowRight, BookOpen, Calendar, Layers3, ChevronRight, Award, Radio, PlayCircle, Clock, Video } from "lucide-react";
import { optimizeImage } from "@/lib/utils";
import type { Webinar } from "@/lib/types";

function useCountdown(targetDateStr: string | null | undefined) {
  const [mounted, setMounted] = useState(false);
  const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number; minutes: number; seconds: number; isPast: boolean }>({
    days: 0, hours: 0, minutes: 0, seconds: 0, isPast: false
  });

  useEffect(() => {
    setMounted(true);
    if (!targetDateStr) return;

    const targetTime = new Date(targetDateStr).getTime();
    if (isNaN(targetTime)) return;

    let intervalId: NodeJS.Timeout | null = null;

    const calculate = () => {
      const diff = targetTime - Date.now();
      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, isPast: true });
        if (intervalId) {
          clearInterval(intervalId);
          intervalId = null;
        }
        return;
      }
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      setTimeLeft({ days, hours, minutes, seconds, isPast: false });
    };

    calculate();
    intervalId = setInterval(calculate, 1000);
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [targetDateStr]);

  return { ...timeLeft, mounted };
}

// ANIMATIONS
const fadeIn: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
};

const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.15 }
  }
};

const MONTHS = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];

// Dynamic Props Provided from Server

interface CourseProp {
  id: string;
  title: string;
  description: string | null;
  category: string;
  thumbnailUrl: string | null;
  startDate: string | null;
  endDate: string | null;
  createdAt: string | null;
}

const CATEGORY_TO_TYPE: Record<string, { type: string, color: string }> = {
  "Kepemimpinan": { type: "Diklat Struktural", color: "bg-oxford-800" },
  "Manajemen Pemerintahan": { type: "Diklat Struktural", color: "bg-oxford-900" },
  "Teknologi Informasi": { type: "Diklat Teknis", color: "bg-oxford-700" },
  "Data & Analitik": { type: "Workshop", color: "bg-crimson-700" },
  "Pengadaan Barang & Jasa": { type: "Bimtek", color: "bg-gold-600" },
  "Keuangan Daerah": { type: "Bimtek", color: "bg-crimson-600" },
  "default": { type: "Lainnya", color: "bg-oxford-600" }
};

export default function HomeClient({ courses, featuredWebinar }: { courses: CourseProp[]; featuredWebinar?: Webinar | null }) {
  const isWebinarLive = Boolean(
    featuredWebinar && (
      featuredWebinar.isAttendanceOpen ||
      (
        new Date().getTime() >= new Date(featuredWebinar.scheduledAt).getTime() - (featuredWebinar.joinWindowMinutes || 30) * 60 * 1000 &&
        new Date().getTime() <= new Date(featuredWebinar.scheduledAt).getTime() + 4 * 60 * 60 * 1000
      )
    )
  );

  const countdown = useCountdown(featuredWebinar?.scheduledAt);

  // Hanya kursus dengan jadwal eksplisit yang boleh tampil sebagai jadwal.
  const scheduledData = courses.flatMap((course) => {
    if (!course.startDate) return [];
    const scheduleDate = new Date(course.startDate);
    const month = MONTHS[scheduleDate.getMonth()];
    const mapping = CATEGORY_TO_TYPE[course.category] || CATEGORY_TO_TYPE["default"];
    const endDate = course.endDate ? new Date(course.endDate) : null;
    const dateFormatter = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric" });
    const dateStr = endDate
      ? [dateFormatter.format(scheduleDate), dateFormatter.format(endDate)].join(" - ")
      : dateFormatter.format(scheduleDate);

    return {
      ...course,
      month,
      date: dateStr,
      type: mapping.type,
      color: mapping.color
    };
  });
  const availableMonths = MONTHS.filter((month) => scheduledData.some((course) => course.month === month));
  const [selectedMonth, setSelectedMonth] = useState(() => availableMonths[0] || "");

  // Filter courses by selected month
  const activeCourses = scheduledData.filter(c => c.month === selectedMonth);
  const publicStats = [
    { label: "Kursus aktif", value: courses.length, icon: BookOpen },
    { label: "Kursus terjadwal", value: scheduledData.length, icon: Calendar },
    { label: "Kategori pembelajaran", value: new Set(courses.map((course) => course.category)).size, icon: Layers3 },
  ];

  return (
    <div className="flex flex-col min-h-screen">
      {/* 1. HERO SECTION */}
      <section className="relative overflow-hidden bg-background pt-24 pb-32 lg:pt-36 lg:pb-48">
        <div className="absolute inset-0 bg-mesh opacity-10 mix-blend-multiply" />
        <div className="absolute inset-0 bg-noise" />

        <div className="container relative mx-auto px-4 z-10">
          <div className="max-w-4xl mx-auto text-center">
            <motion.div
              initial="hidden"
              animate="visible"
              variants={staggerContainer}
            >
              <motion.span variants={fadeIn} className="inline-block py-1 px-3 rounded-full bg-gold-500/10 text-gold-600 font-sans text-sm font-semibold tracking-wider uppercase mb-6 border border-gold-500/20">
                Welcome to CorpuKU Academy
              </motion.span>

              <motion.h1 variants={fadeIn} className="text-5xl md:text-7xl font-sans font-bold text-foreground leading-tight mb-8">
                Master the Future of <br className="hidden md:block" />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-gold-500 to-gold-700">
                  Professional Excellence
                </span>
              </motion.h1>

              <motion.p variants={fadeIn} className="text-lg md:text-xl text-oxford-600 dark:text-oxford-300 font-sans max-w-2xl mx-auto mb-12 leading-relaxed">
                Platform pembelajaran dan pengembangan kompetensi digital terpadu untuk mendorong kapabilitas aparatur berkelas dunia.
              </motion.p>

              <motion.div variants={fadeIn} className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link href="/search" className="w-full sm:w-auto px-8 py-4 bg-gold-500 text-oxford-950 font-bold font-sans rounded-full hover:bg-gold-400 hover:scale-105 transition-all flex items-center justify-center gap-2 shadow-lg shadow-gold-500/20">
                  Jelajahi Pelatihan <ArrowRight size={20} />
                </Link>
              </motion.div>
            </motion.div>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 w-full h-24 bg-gradient-to-t from-background to-transparent" />
      </section>

      {/* 2. ROW PERTAMA: WEBINAR SHOWCASE (LIVE / UPCOMING) */}
      {featuredWebinar && (
        <section className="relative z-20 -mt-16 sm:-mt-24 mb-16 container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className={`rounded-3xl overflow-hidden border shadow-2xl transition-all ${
              isWebinarLive
                ? "bg-gradient-to-br from-oxford-950 via-crimson-950/70 to-oxford-900 border-crimson-500/40 shadow-crimson-900/20"
                : "bg-gradient-to-br from-oxford-950 via-oxford-900 to-[#121724] border-gold-500/30 shadow-gold-950/20"
            }`}
          >
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center p-6 sm:p-10">
              {/* Kolom Teks & Aksi */}
              <div className="lg:col-span-7 flex flex-col justify-center">
                {/* Badge Status */}
                <div className="flex flex-wrap items-center gap-3 mb-4">
                  {isWebinarLive ? (
                    <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-crimson-600 text-white font-sans text-xs font-bold uppercase tracking-wider shadow-lg shadow-crimson-600/40 animate-pulse">
                      <span className="w-2.5 h-2.5 rounded-full bg-white" />
                      Live Sekarang
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gold-500/20 text-gold-400 border border-gold-500/30 font-sans text-xs font-bold uppercase tracking-wider">
                      <Video size={14} className="text-gold-400" />
                      Webinar Terdekat
                    </span>
                  )}

                  <span className="text-xs text-oxford-300 font-medium flex items-center gap-1.5">
                    <Calendar size={14} className="text-gold-400" />
                    {new Date(featuredWebinar.scheduledAt).toLocaleDateString("id-ID", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                      timeZone: "Asia/Makassar"
                    })}
                  </span>
                  <span className="text-xs text-oxford-300 font-medium flex items-center gap-1.5">
                    <Clock size={14} className="text-gold-400" />
                    {new Date(featuredWebinar.scheduledAt).toLocaleTimeString("id-ID", {
                      hour: "2-digit",
                      minute: "2-digit",
                      timeZone: "Asia/Makassar"
                    })}{" "}
                    WITA
                  </span>
                </div>

                {/* Judul & Deskripsi */}
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-sans font-bold text-white mb-3 leading-tight">
                  {featuredWebinar.title}
                </h2>
                <p className="text-oxford-300 text-sm sm:text-base line-clamp-2 mb-6 leading-relaxed">
                  {featuredWebinar.description}
                </p>

                {/* Countdown jika belum live */}
                {!isWebinarLive && countdown.mounted && !countdown.isPast && (
                  <div className="flex items-center gap-2 sm:gap-3 mb-6">
                    <div className="bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-center min-w-[56px]">
                      <div className="text-xl sm:text-2xl font-bold text-gold-400 font-mono">{countdown.days}</div>
                      <div className="text-[10px] text-oxford-400 uppercase tracking-wider font-semibold">Hari</div>
                    </div>
                    <span className="text-oxford-500 font-bold">:</span>
                    <div className="bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-center min-w-[56px]">
                      <div className="text-xl sm:text-2xl font-bold text-white font-mono">{String(countdown.hours).padStart(2, "0")}</div>
                      <div className="text-[10px] text-oxford-400 uppercase tracking-wider font-semibold">Jam</div>
                    </div>
                    <span className="text-oxford-500 font-bold">:</span>
                    <div className="bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-center min-w-[56px]">
                      <div className="text-xl sm:text-2xl font-bold text-white font-mono">{String(countdown.minutes).padStart(2, "0")}</div>
                      <div className="text-[10px] text-oxford-400 uppercase tracking-wider font-semibold">Menit</div>
                    </div>
                    <span className="text-oxford-500 font-bold">:</span>
                    <div className="bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-center min-w-[56px]">
                      <div className="text-xl sm:text-2xl font-bold text-gold-500 font-mono">{String(countdown.seconds).padStart(2, "0")}</div>
                      <div className="text-[10px] text-oxford-400 uppercase tracking-wider font-semibold">Detik</div>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center gap-4">
                  <Link
                    href={`/webinars/${featuredWebinar.id}`}
                    className={`px-7 py-3.5 rounded-full font-bold font-sans text-sm sm:text-base flex items-center gap-2.5 transition-all shadow-lg hover:scale-105 ${
                      isWebinarLive
                        ? "bg-crimson-600 hover:bg-crimson-500 text-white shadow-crimson-600/30"
                        : "bg-gold-500 hover:bg-gold-400 text-oxford-950 shadow-gold-500/20"
                    }`}
                  >
                    {isWebinarLive ? (
                      <>
                        <Radio size={18} className="animate-pulse" />
                        Ikuti Siaran & Presensi Sekarang
                      </>
                    ) : (
                      <>
                        <PlayCircle size={18} />
                        Lihat Detail & Bergabung
                      </>
                    )}
                    <ArrowRight size={16} />
                  </Link>

                  <Link
                    href="/webinars"
                    className="px-5 py-3 rounded-full font-sans text-sm text-oxford-300 hover:text-white hover:bg-white/5 transition-colors border border-white/10"
                  >
                    Katalog Webinar
                  </Link>
                </div>
              </div>

              {/* Kolom Preview Poster */}
              <div className="lg:col-span-5 flex justify-center">
                <Link
                  href={`/webinars/${featuredWebinar.id}`}
                  className="relative group w-full max-w-md h-56 sm:h-72 rounded-2xl overflow-hidden border border-white/10 shadow-xl cursor-pointer"
                >
                  {featuredWebinar.thumbnailUrl ? (
                    <Image
                      src={featuredWebinar.thumbnailUrl}
                      alt={featuredWebinar.title}
                      fill
                      sizes="(min-width: 1024px) 40vw, 100vw"
                      unoptimized
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-oxford-900 flex flex-col items-center justify-center text-oxford-400">
                      <Video size={48} className="mb-2 opacity-50" />
                      <p className="text-sm font-sans">Poster Webinar</p>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-oxford-950/80 via-transparent to-transparent flex items-end p-4">
                    <span className="text-xs text-gold-400 font-semibold group-hover:underline flex items-center gap-1">
                      Buka Halaman Webinar <ChevronRight size={14} />
                    </span>
                  </div>
                </Link>
              </div>
            </div>
          </motion.div>
        </section>
      )}

      {/* KURSUS TERBARU DARI DATABASE */}
      <section className="py-24 bg-background transition-colors duration-300">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-12">
            <div>
              <h2 className="text-3xl md:text-4xl font-sans font-bold text-foreground mb-4 flex items-center gap-3">
                <BookOpen className="text-gold-500" size={32} /> Kursus Terbaru
              </h2>
              <p className="text-oxford-600 dark:text-oxford-300 font-sans text-lg">Kursus aktif terbaru yang tersedia di katalog CorpuKU.</p>
            </div>
            <Link href="/search" className="hidden md:flex items-center gap-2 text-gold-600 font-bold hover:text-gold-500 transition-colors">
              Lihat Semua <ChevronRight size={20} />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {courses.slice(0, 4).map((course, idx) => (
              <motion.div
                key={course.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="bg-oxford-50 dark:bg-oxford-950 rounded-2xl overflow-hidden border border-border-base shadow-sm hover:shadow-xl hover:shadow-gold-500/5 transition-all duration-300 group flex flex-col h-full"
              >
                <div className="h-48 bg-oxford-900 relative overflow-hidden">
                  {course.thumbnailUrl ? (
                    <Image src={optimizeImage(course.thumbnailUrl, 600)} alt={course.title} fill sizes="(min-width: 1024px) 25vw, (min-width: 768px) 50vw, 100vw" unoptimized className="object-cover group-hover:scale-110 transition-transform duration-500 opacity-80" />
                  ) : (
                    <div className="absolute inset-0 bg-mesh opacity-30" />
                  )}
                </div>
                <div className="p-6 flex flex-col flex-1">
                  <h3 className="text-xl font-sans font-bold text-foreground group-hover:text-gold-600 transition-colors line-clamp-2">
                    {course.title}
                  </h3>
                  <p className="text-sm text-oxford-600 dark:text-oxford-300 line-clamp-2 mb-6">
                    {course.description}
                  </p>
                  <div className="mt-auto pt-6 border-t border-border-base flex items-center justify-between">
                    <span className="text-xs font-bold text-oxford-400">{course.category}</span>
                    <Link href={`/courses/${course.id}`} className="p-2 bg-background text-foreground rounded-lg hover:bg-gold-500 hover:text-oxford-950 transition-all border border-border-base">
                      <ArrowRight size={18} />
                    </Link>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* 3. COURSE SCHEDULE */}
      <section className="py-24 bg-oxford-50 dark:bg-oxford-950 border-t border-border-base transition-colors duration-300">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-sans font-bold text-foreground mb-4 flex items-center justify-center gap-3">
              <Calendar className="text-gold-500" size={36} /> Jadwal Pelatihan
            </h2>
            <p className="text-oxford-600 dark:text-oxford-300 font-sans text-lg">Pilih bulan untuk melihat jadwal pelaksanaan program pelatihan dan pengembangan kompetensi terdekat.</p>
          </div>

          <div className="flex overflow-x-auto hide-scrollbar gap-2 pb-6 mb-8 justify-start lg:justify-center px-4 snap-x">
            {availableMonths.map((month) => (
              <button
                key={month}
                onClick={() => setSelectedMonth(month)}
                className={`snap-center shrink-0 px-6 py-3 rounded-full font-sans font-bold transition-all ${selectedMonth === month
                  ? "bg-oxford-900 text-white shadow-md scale-105"
                  : "bg-background text-oxford-600 dark:text-oxford-300 border border-border-base hover:border-gold-400 hover:text-foreground"
                  }`}
              >
                {month}
              </button>
            ))}
          </div>

          <div className="min-h-[300px]">
            {activeCourses.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <AnimatePresence mode="popLayout">
                  {activeCourses.map((course) => (
                    <motion.div
                      key={course.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                      className="bg-background rounded-2xl overflow-hidden border border-border-base shadow-sm hover:shadow-xl hover:shadow-oxford-900/5 transition-all duration-300 group flex flex-col"
                    >
                      <div className={`h-32 ${course.color} relative overflow-hidden flex items-center justify-center`}>
                        <div className="absolute inset-0 bg-mesh mix-blend-overlay opacity-50" />
                        <span className="relative z-10 text-white font-sans font-bold text-lg tracking-widest uppercase opacity-80 group-hover:opacity-100 transition-opacity">
                          {course.type}
                        </span>
                      </div>
                      <div className="p-6 flex flex-col flex-1">
                        <div className="flex items-center gap-2 text-sm font-semibold text-gold-600 mb-3 bg-gold-50 w-fit px-3 py-1 rounded-md border border-gold-200">
                          <Calendar size={14} /> {course.date}
                        </div>
                        <h3 className="text-xl font-sans font-bold text-foreground mb-6 group-hover:text-gold-600 transition-colors line-clamp-2">
                          {course.title}
                        </h3>
                        <div className="mt-auto pt-6 border-t border-border-base">
                          <Link href={`/courses/${course.id}`} className="font-sans font-semibold text-foreground hover:text-gold-600 flex items-center justify-between transition-colors w-full group/btn">
                            Lihat Detail <ChevronRight size={18} className="transform group-hover/btn:translate-x-1 transition-transform" />
                          </Link>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="w-full h-48 flex flex-col items-center justify-center bg-background rounded-2xl border border-border-base border-dashed"
              >
                <BookOpen size={48} className="text-oxford-200 mb-4" />
                <p className="text-oxford-500 dark:text-oxford-400 font-sans font-medium">
                  {selectedMonth ? `Belum ada jadwal untuk bulan ${selectedMonth}.` : "Belum ada kursus dengan tanggal pelaksanaan yang ditetapkan."}
                </p>
              </motion.div>
            )}
          </div>
        </div>
      </section>

      <section className="py-24 bg-background border-t border-border-base transition-colors duration-300">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-sans font-bold text-foreground mb-4">
              Katalog Pembelajaran
            </h2>
            <p className="text-oxford-600 dark:text-oxford-300 font-sans text-lg">
              Ringkasan katalog aktif tanpa menampilkan data pribadi atau capaian peserta.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {publicStats.map(({ label, value, icon: Icon }) => (
              <div key={label} className="rounded-2xl border border-border-base bg-oxford-50 dark:bg-oxford-950 p-8 text-center shadow-sm">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gold-500 text-oxford-950">
                  <Icon size={24} aria-hidden="true" />
                </div>
                <div className="text-4xl font-bold text-foreground">{value.toLocaleString("id-ID")}</div>
                <div className="mt-2 text-sm font-semibold text-oxford-600 dark:text-oxford-300">{label}</div>
              </div>
            ))}
          </div>
          <div className="mt-10 text-center">
            <Link href="/paths" className="inline-flex items-center gap-2 rounded-full bg-oxford-900 px-7 py-3 font-bold text-white transition-colors hover:bg-gold-500 hover:text-oxford-950">
              Jelajahi learning path <Award size={18} />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
