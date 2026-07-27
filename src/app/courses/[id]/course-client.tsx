"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { BookOpen, Clock, Globe, Award, Shield, CheckCircle, ChevronDown, ChevronUp, PlayCircle, Loader2, CalendarDays } from "lucide-react";
import { enrollInCourse, checkEnrollment } from "@/app/actions/courses";
import { useRouter } from "next/navigation";
import { optimizeImage } from "@/lib/utils";
import { toast } from "sonner";

export interface CourseLesson {
    id: string;
    title: string;
    type: string;
}

export interface CourseModule {
    id: string;
    title: string;
    order: string;
    lessons: CourseLesson[];
}

export interface CourseProp {
    id: string;
    title: string;
    description: string | null;
    thumbnailUrl: string | null;
    category: string | null;
    level: string | null;
    status: string;
    instructorName: string | null;
    jp: number;
    pacingType: "self_paced" | "instructor_paced";
    startDate: string | null;
    endDate: string | null;
    certificateEnabled: boolean;
    certificateType: string | null;
    createdAt: string | null;
    updatedAt: string | null;
}

export default function CourseClient({ course, courseContent }: { course: CourseProp, courseContent: CourseModule[] }) {
    const [expandedWeek, setExpandedWeek] = useState<string | null>(courseContent[0]?.id || null);
    const [isEnrolled, setIsEnrolled] = useState<boolean>(false);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [isChecking, setIsChecking] = useState<boolean>(true);
    const router = useRouter();

    useEffect(() => {
        async function fetchEnrollment() {
            try {
                const enrolled = await checkEnrollment(course.id);
                setIsEnrolled(enrolled);
            } catch (err) {
                console.error("Failed to check enrollment:", err);
                setIsEnrolled(false);
            } finally {
                setIsChecking(false);
            }
        }
        const timer = window.setTimeout(() => void fetchEnrollment(), 0);
        return () => window.clearTimeout(timer);
    }, [course.id]);

    const handleEnroll = async () => {
        setIsLoading(true);
        const result = await enrollInCourse(course.id);

        if (result.success) {
            setIsEnrolled(true);
            toast.success("Berhasil mendaftar di kursus!");
            router.refresh();
        } else if (result.error) {
            const errString = String(result.error);
            toast.error(errString);
            if (errString.includes("logged in")) {
                router.push("/login");
            }
        }
        setIsLoading(false);
    };

    const toggleSyllabus = (moduleId: string) => {
        if (expandedWeek === moduleId) {
            setExpandedWeek(null);
        } else {
            setExpandedWeek(moduleId);
        }
    };

    // Computed values from real data
    const totalModules = courseContent.length;
    const totalLessons = courseContent.reduce((sum, mod) => sum + mod.lessons.length, 0);
    const computedDuration = totalModules > 0 ? `${totalModules} Modul` : "Belum ditentukan";
    const computedEffort = totalLessons > 0 ? `${totalLessons} materi pelajaran` : "—";

    const formatCourseDate = (value: string | null) => value
        ? new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric" }).format(new Date(value))
        : null;
    const schedule = course.startDate
        ? course.endDate
            ? `${formatCourseDate(course.startDate)} – ${formatCourseDate(course.endDate)}`
            : `Mulai ${formatCourseDate(course.startDate)}`
        : course.pacingType === "self_paced" ? "Mulai kapan saja" : "Jadwal belum ditetapkan";
    const certificateLabels: Record<string, string> = {
        sertifikat: "Sertifikat penyelesaian",
        surat_keterangan: "Surat keterangan",
        sttp: "STTP",
    };

    const courseInfo = {
        provider: "CorpuKU Academy",
        category: course.category || "Professional Development",
        duration: computedDuration,
        effort: computedEffort,
        level: course.level || "Semua tingkat",
        language: "Bahasa Indonesia",
        instructorName: course.instructorName || "Ditentukan penyelenggara",
        pacing: course.pacingType === "instructor_paced" ? "Dipandu instruktur" : "Belajar mandiri",
        schedule,
        certificate: course.certificateEnabled
            ? certificateLabels[course.certificateType || "sertifikat"] || "Sertifikat penyelesaian"
            : "Tanpa sertifikat",
    };

    return (
        <div className="bg-white dark:bg-[#161B2A] min-h-screen pb-20">

            {/* HERO SECTION */}
            <section className="bg-oxford-950 text-white pt-24 pb-12 lg:pb-32 relative overflow-x-clip overflow-y-visible">
                <div className="absolute inset-0 bg-mesh mix-blend-screen opacity-20" />

                <div className="container mx-auto px-4 relative z-10">
                    <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">

                        {/* Left/Top Content */}
                        <div className="flex-1 lg:max-w-3xl lg:pr-12">
                            <div className="flex items-center gap-3 mb-6">
                                <span className="bg-oxford-800 text-oxford-200 px-3 py-1 rounded font-sans text-xs font-semibold uppercase tracking-wider">
                                    {courseInfo.category}
                                </span>
                                <span className="text-gold-500 font-bold text-sm">{courseInfo.provider}</span>
                            </div>

                            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-sans font-bold leading-tight mb-6">
                                {course.title}
                            </h1>

                            <p className="text-base sm:text-lg text-oxford-200 mb-8 max-w-2xl leading-relaxed">
                                {course.description}
                            </p>

                            <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-sm">
                                <div className="flex items-center gap-1.5 text-gold-400 font-bold">
                                    <BookOpen size={18} />
                                    <span>{totalModules} Modul</span>
                                    <span className="text-oxford-400 font-normal">· {totalLessons} Materi</span>
                                </div>
                                <div className="hidden sm:block w-1.5 h-1.5 rounded-full bg-oxford-700" />
                                <div className="text-oxford-300">
                                    Instruktur: <span className="font-bold text-white">{courseInfo.instructorName}</span>
                                </div>
                            </div>
                        </div>

                        {/* Right/Bottom Sticky Card (Enrollment) */}
                        <div className="w-full lg:w-[400px] shrink-0 mt-8 lg:mt-0">
                            <div className="bg-white dark:bg-[#161B2A] text-oxford-900 dark:text-white rounded-2xl p-6 lg:p-8 shadow-2xl border border-oxford-100 dark:border-oxford-800 lg:absolute lg:right-4 lg:top-24 z-20 w-full lg:w-[400px]">

                                {/* Video Preview Fake Cover */}
                                <div className="w-full aspect-video bg-oxford-900 rounded-xl mb-6 relative flex items-center justify-center group cursor-pointer overflow-hidden">
                                    <div className="absolute inset-0 bg-mesh opacity-30" />
                                    {course.thumbnailUrl ? (
                                        <Image src={optimizeImage(course.thumbnailUrl, 800)} alt={course.title} fill sizes="(min-width: 1024px) 400px, 100vw" unoptimized className="object-cover opacity-60" />
                                    ) : (
                                        <PlayCircle size={64} className="text-white opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all z-10 drop-shadow-lg" />
                                    )}
                                    <div className="absolute bottom-3 left-3 bg-black/70 px-2 py-1 rounded text-xs font-bold text-white">Preview</div>
                                </div>

                                <div className="mb-6">
                                    <p className="text-xs font-bold uppercase tracking-widest text-oxford-400">Akses pelatihan</p>
                                    <p className="mt-1 text-xl font-bold text-oxford-900 dark:text-white">Daftar melalui akun CorpuKU</p>
                                </div>

                                {isEnrolled ? (
                                    <button
                                        onClick={() => router.push(`/learn/${course.id}`)}
                                        className="w-full py-4 font-bold font-sans rounded-xl text-lg transition-all shadow-lg active:scale-95 mb-4 flex items-center justify-center gap-2 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 shadow-none border border-emerald-200"
                                    >
                                        <CheckCircle size={20} /> Lanjutkan Belajar
                                    </button>
                                ) : (
                                    <button
                                        onClick={handleEnroll}
                                        disabled={isLoading || isChecking}
                                        className={`w-full py-4 font-bold font-sans rounded-xl text-lg transition-all shadow-lg active:scale-95 mb-4 flex items-center justify-center gap-2 bg-gold-500 text-oxford-950 hover:bg-gold-400 shadow-gold-500/20 disabled:opacity-70`}
                                    >
                                        {isLoading ? (
                                            <Loader2 className="animate-spin" size={20} />
                                        ) : (
                                            "Daftar Sekarang"
                                        )}
                                    </button>
                                )}
                                <p className="text-center text-xs text-oxford-500 dark:text-oxford-400 mb-8">Progres dan kelulusan tersimpan pada akun Anda.</p>

                                {/* Course Quick Facts */}
                                <div className="space-y-4">
                                    <div className="flex items-start gap-3">
                                        <Clock className="text-oxford-400 shrink-0 mt-0.5" size={20} />
                                        <div>
                                            <p className="font-bold text-sm text-oxford-900 dark:text-white">Durasi: {courseInfo.duration}</p>
                                            <p className="text-xs text-oxford-600 dark:text-oxford-300">{courseInfo.effort}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <CalendarDays className="text-oxford-400 shrink-0 mt-0.5" size={20} />
                                        <div>
                                            <p className="font-bold text-sm text-oxford-900 dark:text-white">{courseInfo.pacing}</p>
                                            <p className="text-xs text-oxford-600 dark:text-oxford-300">{courseInfo.schedule}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <Globe className="text-oxford-400 shrink-0 mt-0.5" size={20} />
                                        <div>
                                            <p className="font-bold text-sm text-oxford-900 dark:text-white">{courseInfo.language}</p>
                                            <p className="text-xs text-oxford-600 dark:text-oxford-300">Bahasa pengantar utama</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <Award className="text-oxford-400 shrink-0 mt-0.5" size={20} />
                                        <div>
                                            <p className="font-bold text-sm text-oxford-900 dark:text-white">{courseInfo.certificate}</p>
                                            <p className="text-xs text-oxford-600 dark:text-oxford-300">{course.certificateEnabled ? "Diterbitkan setelah seluruh syarat terpenuhi" : "Kursus ini tidak menerbitkan sertifikat"}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <Shield className="text-oxford-400 shrink-0 mt-0.5" size={20} />
                                        <div>
                                            <p className="font-bold text-sm text-oxford-900 dark:text-white">{courseInfo.level}</p>
                                            <p className="text-xs text-oxford-600 dark:text-oxford-300">{course.jp > 0 ? `${course.jp} JP` : "Jumlah JP belum ditetapkan"}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </section>

            {/* MAIN CONTENT AREA */}
            <section className="py-12 lg:py-20 pb-32">
                <div className="container mx-auto px-4">
                    <div className="flex flex-col lg:flex-row gap-12">

                        {/* Left Content (Matches the width of Hero Left Content) */}
                        <div className="flex-1 lg:max-w-3xl lg:pr-12">

                            {/* Learning Objectives */}
                            {course.description && (
                                <div className="mb-12 lg:mb-16">
                                    <h2 className="text-2xl font-sans font-bold text-oxford-900 dark:text-white mb-6">Tentang Kursus Ini</h2>
                                    <div className="bg-oxford-50 dark:bg-oxford-950 border border-oxford-200 dark:border-oxford-700 p-6 lg:p-8 rounded-2xl">
                                        <p className="text-oxford-800 dark:text-oxford-100 text-sm leading-relaxed whitespace-pre-line">{course.description}</p>
                                    </div>
                                </div>
                            )}

                            {/* Syllabus Accordion */}
                            <div className="mb-16">
                                <h2 className="text-2xl font-sans font-bold text-oxford-900 dark:text-white mb-6">Silabus Kursus</h2>
                                <div className="space-y-4">
                                    {courseContent.map((item, i) => (
                                        <div key={item.id} className="border border-oxford-200 dark:border-oxford-700 rounded-xl overflow-hidden bg-white dark:bg-[#161B2A] shadow-sm hover:shadow-md transition-shadow">
                                            <button
                                                onClick={() => toggleSyllabus(item.id)}
                                                className="w-full flex items-center justify-between p-4 lg:p-6 text-left focus:outline-none"
                                            >
                                                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 lg:gap-6 w-full">
                                                    <span className="font-serif font-bold text-oxford-400 text-lg sm:w-20 shrink-0">Modul {i + 1}</span>
                                                    <h3 className="font-sans font-bold text-oxford-900 dark:text-white text-base lg:text-lg flex-1 pr-4">{item.title}</h3>
                                                </div>
                                                <div className="shrink-0 p-2 bg-oxford-50 dark:bg-oxford-950 rounded-full text-oxford-500 dark:text-oxford-400">
                                                    {expandedWeek === item.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                                </div>
                                            </button>

                                            {expandedWeek === item.id && (
                                                <div className="px-4 lg:px-6 pb-6 pt-2 border-t border-oxford-100 dark:border-oxford-800 bg-oxford-50 dark:bg-oxford-950/50">
                                                    <ul className="space-y-3 mt-4 ml-0 sm:ml-24 lg:ml-26">
                                                        {item.lessons.map((lesson) => {
                                                            const typeLabels: Record<string, string> = {
                                                                video: "Tonton Video",
                                                                reading: "Baca Materi",
                                                                quiz: "Kerjakan Kuis",
                                                                file: "Unduh Materi"
                                                            };
                                                            
                                                            let displayTitle = lesson.title;
                                                            if (displayTitle.startsWith("Pelajaran Baru (") || displayTitle === "Pelajaran Baru") {
                                                                displayTitle = typeLabels[lesson.type] || lesson.type;
                                                            }

                                                            return (
                                                                <li key={lesson.id} className="flex items-center gap-3 text-sm text-oxford-700 dark:text-oxford-200">
                                                                    <span className="w-1.5 h-1.5 rounded-full bg-gold-500 shrink-0" /> 
                                                                    <span className="font-medium text-oxford-900 dark:text-white">{displayTitle}</span>
                                                                    {!lesson.title.startsWith("Pelajaran Baru") && (
                                                                        <span className="text-xs text-oxford-400 capitalize">({typeLabels[lesson.type] || lesson.type})</span>
                                                                    )}
                                                                </li>
                                                            );
                                                        })}
                                                        {item.lessons.length === 0 && (
                                                            <li className="text-sm text-oxford-400 italic ml-2">Belum ada materi.</li>
                                                        )}
                                                    </ul>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                    {courseContent.length === 0 && (
                                        <div className="text-center py-12 bg-oxford-50 dark:bg-oxford-950 rounded-2xl border-2 border-dashed border-oxford-200 dark:border-oxford-700 text-oxford-500 dark:text-oxford-400">
                                            <p>Konten kursus sedang dalam penyusunan.</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Instructor */}
                            <div className="mt-12 lg:mt-16">
                                <h2 className="text-2xl font-sans font-bold text-oxford-900 dark:text-white mb-6">Instruktur Pengajar</h2>
                                <div className="flex items-start gap-4">
                                    <div className="w-16 h-16 lg:w-20 lg:h-20 rounded-full bg-oxford-200 dark:bg-oxford-800 overflow-hidden shrink-0 border-2 border-white shadow-md relative">
                                        <div className="w-full h-full bg-gradient-to-br from-oxford-300 to-oxford-400 absolute inset-0" />
                                    </div>
                                    <div className="flex-1 mt-1">
                                        <h3 className="font-sans font-bold text-oxford-900 dark:text-white text-base lg:text-lg">{courseInfo.instructorName}</h3>
                                        <p className="text-sm text-oxford-600 dark:text-oxford-300 mt-1 leading-snug">Instruktur di {courseInfo.provider}</p>
                                    </div>
                                </div>
                            </div>

                        </div>
                    </div>
                </div>
            </section>

        </div>
    );
}
