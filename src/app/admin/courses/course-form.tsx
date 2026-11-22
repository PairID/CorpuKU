"use client";

import { useState, useRef, useMemo, useEffect } from "react";
import { Save, ArrowLeft, Loader2, Upload, X, Search, Check } from "lucide-react";
import Link from "next/link";
import { createCourse, updateCourseDetails } from "@/app/actions/courses";
import { COURSE_CATEGORIES } from "@/lib/constants";
import { showToast } from "@/lib/toast";
import { CourseEvaluationConfig, getDefaultCourseEvaluationConfig, getOrganizerEvaluationQuestions } from "@/lib/skm-constants";
import { DEFAULT_ORGANIZER_NAME, type DeliveryMode } from "@/lib/certificate-activity";
import CourseEvaluationConfigEditor from "@/components/evaluations/CourseEvaluationConfigEditor";


export interface CourseInstructor {
    id: string;
    name: string;
    email: string;
    role?: string;
}

export interface CourseFormData {
        id: string;
        title: string;
        description: string | null;
        category: string | null;
        status: string;
        level?: "Beginner" | "Intermediate" | "Advanced";
        pacingType?: "self_paced" | "instructor_paced";
        instructorId: string | null;
        thumbnailUrl: string | null;
        startDate?: string | null;
        endDate?: string | null;
        jp?: number;
        certificateType?: "sertifikat" | "surat_keterangan" | "sttp";
        certificateEnabled?: boolean;
        certificateAutoIssue?: boolean;
        certificateNumberPrefix?: string;
        passingScore?: number;
        trainingType?: "elearning" | "classical_facilitation";
        targetOpd?: string | null;
        attendanceThreshold?: number;
        documentationUrl?: string | null;
        organizerName?: string | null;
        deliveryMode?: DeliveryMode;
        locationName?: string | null;
        accessMode?: "open" | "passcode" | "approval";
        passcode?: string | null;
        evaluationConfig?: CourseEvaluationConfig | null;
}

interface CourseFormProps {
    initialData?: CourseFormData;
    instructors: CourseInstructor[];
    mode: "create" | "edit";
    basePath?: string;
}

function toDateInputValue(val: unknown): string {
    if (!val) return "";
    if (val instanceof Date) return isNaN(val.getTime()) ? "" : val.toISOString().slice(0, 10);
    const match = String(val).trim().match(/^(\d{4}-\d{2}-\d{2})/);
    return match ? match[1] : "";
}

export default function CourseForm({ initialData, instructors, mode, basePath = "/admin" }: CourseFormProps) {
    const [isLoading, setIsLoading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Form state
    const [title, setTitle] = useState(initialData?.title || "");
    const [description, setDescription] = useState(initialData?.description || "");
    const [category, setCategory] = useState(initialData?.category || "Kepemimpinan");
    const [status, setStatus] = useState(initialData?.status || "draft");
    const [level, setLevel] = useState<"Beginner" | "Intermediate" | "Advanced">(initialData?.level || "Beginner");
    const [pacingType, setPacingType] = useState<"self_paced" | "instructor_paced">(initialData?.pacingType || "self_paced");
    const [instructorId, setInstructorId] = useState(initialData?.instructorId || (instructors.length > 0 ? instructors[0].id : ""));
    const [thumbnailUrl, setThumbnailUrl] = useState(initialData?.thumbnailUrl || "");
    const [startDate, setStartDate] = useState(() => toDateInputValue(initialData?.startDate));
    const [endDate, setEndDate] = useState(() => toDateInputValue(initialData?.endDate));
    const [jp, setJp] = useState<number | "">(initialData?.jp || "");
    const [certificateType, setCertificateType] = useState<"sertifikat" | "surat_keterangan" | "sttp">(initialData?.certificateType || "sertifikat");
    const [certificateEnabled, setCertificateEnabled] = useState(initialData?.certificateEnabled ?? true);
    const [certificateAutoIssue, setCertificateAutoIssue] = useState(initialData?.certificateAutoIssue ?? true);
    const [certificateNumberPrefix, setCertificateNumberPrefix] = useState(initialData?.certificateNumberPrefix || "CRS");
    const [passingScore, setPassingScore] = useState(initialData?.passingScore ?? 60);
    const [trainingType, setTrainingType] = useState<"elearning" | "classical_facilitation">(initialData?.trainingType || "elearning");
    const [targetOpd, setTargetOpd] = useState(initialData?.targetOpd || "");
    const [attendanceThreshold, setAttendanceThreshold] = useState<number>(initialData?.attendanceThreshold ?? 80);
    const [documentationUrl, setDocumentationUrl] = useState(initialData?.documentationUrl || "");
    const [organizerName, setOrganizerName] = useState(initialData?.organizerName || DEFAULT_ORGANIZER_NAME);
    const [deliveryMode, setDeliveryMode] = useState<DeliveryMode>(initialData?.deliveryMode || "daring");
    const [locationName, setLocationName] = useState(initialData?.locationName || "");
    const [accessMode, setAccessMode] = useState<"open" | "passcode" | "approval">(initialData?.accessMode || "open");
    const [passcode, setPasscode] = useState(initialData?.passcode || "");
    const [evaluationConfig, setEvaluationConfig] = useState<Required<CourseEvaluationConfig>>(() => {
        const defaults = getDefaultCourseEvaluationConfig();
        return {
            enableUnderstanding: Boolean(initialData?.evaluationConfig?.enableUnderstanding),
            narasumber: initialData?.evaluationConfig?.narasumber?.length ? initialData.evaluationConfig.narasumber : defaults.narasumber,
            organizer: initialData?.evaluationConfig?.organizer?.length ? initialData.evaluationConfig.organizer : defaults.organizer,
            understanding: initialData?.evaluationConfig?.understanding?.length ? initialData.evaluationConfig.understanding : defaults.understanding,
            skm: initialData?.evaluationConfig?.skm?.length ? initialData.evaluationConfig.skm : defaults.skm,
        };
    });
    const [thumbnailPreview, setThumbnailPreview] = useState<string>(initialData?.thumbnailUrl || "");

    // Searchable Instructor Combobox States
    const [instructorSearch, setInstructorSearch] = useState("");
    const [isInstructorDropdownOpen, setIsInstructorDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const selectedInstructor = useMemo(() => {
        return instructors.find(i => i.id === instructorId) || null;
    }, [instructors, instructorId]);

    const filteredInstructors = useMemo(() => {
        const q = instructorSearch.trim().toLowerCase();
        if (!q) {
            return instructors.slice(0, 6);
        }
        return instructors.filter(i => 
            i.name.toLowerCase().includes(q) || 
            i.email.toLowerCase().includes(q) ||
            (i.role && i.role.toLowerCase().includes(q))
        ).slice(0, 15);
    }, [instructors, instructorSearch]);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setIsInstructorDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleThumbnailUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        
        if (file.size > 5 * 1024 * 1024) {
            showToast.warning("Ukuran File Terlalu Besar", "Ukuran file maksimal 5MB.");
            return;
        }

        setIsLoading(true);
        try {
            const formData = new FormData();
            formData.append("file", file);

            const res = await fetch("/api/upload", {
                method: "POST",
                body: formData,
            });

            const result = await res.json();
            if (result.success) {
                setThumbnailPreview(result.url);
                setThumbnailUrl(result.url);
                showToast.success("Gambar Berhasil Diunggah", file.name);
            } else {
                showToast.error("Gagal Mengunggah Gambar", result.error || "Gagal mengunggah gambar.");
            }
        } catch (err) {
            console.error("Upload error:", err);
            showToast.error("Kesalahan Jaringan", "Terjadi kesalahan saat upload gambar.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleRemoveThumbnail = () => {
        setThumbnailPreview("");
        setThumbnailUrl("");
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isLoading) return; // Prevent double-submit
        setIsLoading(true);

        const data = {
            title,
            description,
            category,
            level,
            pacingType,
            status,
            instructorId: instructorId || undefined,
            thumbnailUrl,
            startDate,
            endDate,
            jp: jp !== "" ? Number(jp) : undefined,
            certificateType,
            certificateEnabled,
            certificateAutoIssue,
            certificateNumberPrefix,
            passingScore,
            trainingType,
            targetOpd: trainingType === "classical_facilitation" ? targetOpd : null,
            attendanceThreshold: Number(attendanceThreshold || 80),
            documentationUrl: documentationUrl.trim() || "",
            organizerName: organizerName.trim() || DEFAULT_ORGANIZER_NAME,
            deliveryMode,
            locationName: deliveryMode === "daring" ? null : locationName.trim(),
            accessMode,
            passcode: accessMode === "passcode" ? passcode.trim() : null,
            evaluationConfig: trainingType === "classical_facilitation" ? evaluationConfig : undefined,
        };

        try {
            if (mode === "create") {
                const result = await createCourse(data);
                if (result.success) {
                    showToast.success("Kursus Berhasil Dibuat", "Mengarahkan ke daftar kursus...");
                    // Use window.location for a clean navigation (avoids render loop)
                    window.location.href = `${basePath}/courses`;
                    return;
                } else {
                    showToast.error("Gagal Membuat Kursus", result.error || "Gagal membuat kursus.");
                }
            } else {
                const result = await updateCourseDetails(initialData!.id, data);
                if (result.success) {
                    showToast.success("Kursus Berhasil Diperbarui", "Mengarahkan ke daftar kursus...");
                    window.location.href = `${basePath}/courses`;
                    return;
                } else {
                    showToast.error("Gagal Memperbarui Kursus", result.error || "Gagal menyimpan perubahan kursus.");
                }
            }
        } catch {
            showToast.error("Kesalahan Jaringan", "Terjadi kesalahan saat menyimpan.");
        }

        setIsLoading(false);
    };

    return (
        <form onSubmit={handleSubmit} className="bg-white dark:bg-[#161B2A] rounded-2xl border border-oxford-200 dark:border-oxford-700 shadow-sm overflow-hidden">
            {/* Header */}
            <div className="p-6 border-b border-oxford-200 dark:border-oxford-700 flex items-center justify-between bg-oxford-50 dark:bg-oxford-950">
                <div className="flex items-center gap-4">
                    <Link href={`${basePath}/courses`} className="p-2 text-oxford-400 hover:text-gold-600 hover:bg-gold-50 rounded-lg transition-colors">
                        <ArrowLeft size={20} />
                    </Link>
                    <div>
                        <h2 className="text-xl font-bold text-oxford-900 dark:text-white">
                            {mode === "create" ? "Buat Kursus Baru" : "Edit Kursus"}
                        </h2>
                        <p className="text-sm text-oxford-500 dark:text-oxford-400">
                            {mode === "create" ? "Masukkan detail kursus yang akan dibuat." : "Perbarui informasi kursus yang sudah ada."}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <Link
                        href={`${basePath}/courses`}
                        className="px-4 py-2 text-sm font-medium text-oxford-700 dark:text-oxford-200 bg-white dark:bg-[#161B2A] border border-oxford-200 dark:border-oxford-700 rounded-lg hover:bg-oxford-50 dark:hover:bg-oxford-950 transition-colors"
                    >
                        Batal
                    </Link>
                    <button
                        type="submit"
                        disabled={isLoading || !title}
                        className="flex items-center gap-2 px-5 py-2 bg-gold-500 hover:bg-gold-400 text-oxford-950 text-sm font-bold rounded-lg transition-colors shadow-sm disabled:opacity-50"
                    >
                        {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                        Simpan Kursus
                    </button>
                </div>
            </div>

            {/* Form Body */}
            <div className="p-6 md:p-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Content (Left) */}
                <div className="lg:col-span-2 space-y-6">
                    <div>
                        <label className="block text-sm font-bold text-oxford-900 dark:text-white mb-2">
                            Judul Kursus <span className="text-crimson-500">*</span>
                        </label>
                        <input
                            type="text"
                            required
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Contoh: Pengantar Analisis Data"
                            className="w-full px-4 py-3 bg-white dark:bg-[#161B2A] border border-oxford-200 dark:border-oxford-700 rounded-lg text-sm focus:outline-none focus:border-gold-500 focus:ring-4 focus:ring-gold-500/10 transition-all text-oxford-900 dark:text-white"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-oxford-900 dark:text-white mb-2">
                            Deskripsi Kursus
                        </label>
                        <textarea
                            rows={6}
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Deskripsikan apa yang akan dipelajari di kursus ini..."
                            className="w-full px-4 py-3 bg-white dark:bg-[#161B2A] border border-oxford-200 dark:border-oxford-700 rounded-lg text-sm focus:outline-none focus:border-gold-500 focus:ring-4 focus:ring-gold-500/10 transition-all text-oxford-900 dark:text-white resize-y"
                        />
                    </div>

                    {/* Thumbnail Upload */}
                    <div>
                        <label className="block text-sm font-bold text-oxford-900 dark:text-white mb-2">Cover / Thumbnail</label>
                        <p className="text-xs text-oxford-500 dark:text-oxford-400 mb-3">Upload gambar cover kursus. Format: JPG, PNG, WebP. Maks 5MB.</p>

                        {thumbnailPreview ? (
                            <div className="relative w-full aspect-video rounded-xl bg-oxford-100 dark:bg-[#161B2A] border border-oxford-200 dark:border-oxford-700 overflow-hidden group">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={thumbnailPreview}
                                    alt="Thumbnail Preview"
                                    className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        className="px-4 py-2 bg-white dark:bg-[#161B2A] text-oxford-900 dark:text-white text-sm font-bold rounded-lg hover:bg-gold-500 transition-colors"
                                    >
                                        Ganti
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleRemoveThumbnail}
                                        className="px-4 py-2 bg-crimson-500 text-white text-sm font-bold rounded-lg hover:bg-crimson-600 transition-colors"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <label className="flex flex-col items-center justify-center gap-3 w-full aspect-video border-2 border-dashed border-oxford-300 dark:border-oxford-600 rounded-xl cursor-pointer hover:border-gold-500 hover:bg-gold-50/30 transition-all">
                                <div className="w-16 h-16 bg-oxford-100 dark:bg-[#161B2A] rounded-full flex items-center justify-center">
                                    <Upload size={28} className="text-oxford-400" />
                                </div>
                                <div className="text-center">
                                    <p className="text-sm font-bold text-oxford-700 dark:text-oxford-200">Klik untuk upload gambar</p>
                                    <p className="text-xs text-oxford-400">JPG, PNG, WebP — maks 5MB</p>
                                </div>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp"
                                    onChange={handleThumbnailUpload}
                                    className="hidden"
                                />
                            </label>
                        )}
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            onChange={handleThumbnailUpload}
                            className="hidden"
                        />
                    </div>
                </div>

                {/* Sidebar (Right) */}
                <div className="space-y-6">
                    <div className="bg-oxford-50 dark:bg-oxford-950 p-5 rounded-xl border border-oxford-100 dark:border-oxford-800">
                        <label className="block text-sm font-bold text-oxford-900 dark:text-white mb-2">Status Publikasi</label>
                        <select
                            value={status}
                            onChange={(e) => setStatus(e.target.value)}
                            className="w-full px-4 py-3 bg-white dark:bg-[#161B2A] border border-oxford-200 dark:border-oxford-700 rounded-lg text-sm focus:outline-none focus:border-gold-500 text-oxford-900 dark:text-white font-medium"
                        >
                            <option value="draft">Draft (Belum Rilis)</option>
                            <option value="active">Active (Tampil ke Siswa)</option>
                            <option value="archived">Archived (Diarsipkan)</option>
                        </select>
                        <label className="block text-sm font-bold text-oxford-900 dark:text-white mb-2">Tingkat Kesulitan</label>
                        <select
                            value={level}
                            onChange={(e) => setLevel(e.target.value as typeof level)}
                            className="w-full px-4 py-3 bg-white dark:bg-[#161B2A] border border-oxford-200 dark:border-oxford-700 rounded-lg text-sm focus:outline-none focus:border-gold-500 text-oxford-900 dark:text-white"
                        >
                            <option value="Beginner">Pemula</option>
                            <option value="Intermediate">Menengah</option>
                            <option value="Advanced">Lanjutan</option>
                        </select>
                    </div>

                    <div className="bg-oxford-50 dark:bg-oxford-950 p-5 rounded-xl border border-oxford-100 dark:border-oxford-800">
                        <label className="block text-sm font-bold text-oxford-900 dark:text-white mb-2">Tipe Pelatihan</label>
                        <select
                            value={trainingType}
                            onChange={(e) => setTrainingType(e.target.value as "elearning" | "classical_facilitation")}
                            className="w-full px-4 py-3 bg-white dark:bg-[#161B2A] border border-oxford-200 dark:border-oxford-700 rounded-lg text-sm focus:outline-none focus:border-gold-500 text-oxford-900 dark:text-white font-medium"
                        >
                            <option value="elearning">E-Learning Mandiri (Asynchronous)</option>
                            <option value="classical_facilitation">Fasilitasi Pelatihan Klasikal OPD Luar</option>
                        </select>
                        {trainingType === "classical_facilitation" && (
                            <div className="mt-4 space-y-4 pt-3 border-t border-oxford-200 dark:border-oxford-800">
                                <div>
                                    <label className="block text-xs font-bold text-oxford-700 dark:text-oxford-200 mb-1">
                                        Target Instansi / OPD Luar <span className="text-crimson-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={targetOpd}
                                        onChange={(e) => setTargetOpd(e.target.value)}
                                        placeholder="Contoh: Dinas Kesehatan Kab. Bulungan"
                                        className="w-full px-4 py-2 bg-white dark:bg-[#161B2A] border border-oxford-200 dark:border-oxford-700 rounded-lg text-sm focus:outline-none focus:border-gold-500 text-oxford-900 dark:text-white"
                                    />
                                    <p className="text-[11px] text-oxford-500 mt-1">Nama instansi/OPD yang difasilitasi dalam pelatihan ini.</p>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-oxford-700 dark:text-oxford-200 mb-1">
                                        Ambang Batas Kehadiran Minimal (% JP)
                                    </label>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="number"
                                            min={1}
                                            max={100}
                                            required
                                            value={attendanceThreshold}
                                            onChange={(e) => setAttendanceThreshold(Number(e.target.value))}
                                            className="w-full px-4 py-2 bg-white dark:bg-[#161B2A] border border-oxford-200 dark:border-oxford-700 rounded-lg text-sm focus:outline-none focus:border-gold-500 text-oxford-900 dark:text-white"
                                        />
                                        <span className="text-sm font-bold text-oxford-600 dark:text-oxford-400">%</span>
                                    </div>
                                    <p className="text-[11px] text-oxford-500 mt-1">Standar minimal kelulusan sertifikat adalah 80% JP kehadiran.</p>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="bg-oxford-50 dark:bg-oxford-950 p-5 rounded-xl border border-oxford-100 dark:border-oxford-800 space-y-4">
                        <h4 className="text-sm font-bold text-oxford-900 dark:text-white">Penyelenggara &amp; Pola Kegiatan</h4>

                        <div>
                            <div className="flex items-center justify-between gap-2 mb-1">
                                <label className="block text-xs font-bold text-oxford-700 dark:text-oxford-200">
                                    Penyelenggara (Tercetak di Sertifikat) <span className="text-crimson-500">*</span>
                                </label>
                                {targetOpd.trim() && (
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setOrganizerName(
                                                `${targetOpd.trim()} bekerjasama dengan ${DEFAULT_ORGANIZER_NAME}`
                                            )
                                        }
                                        className="text-[11px] font-bold text-gold-600 hover:underline"
                                    >
                                        + Pola Kerjasama OPD
                                    </button>
                                )}
                            </div>
                            <textarea
                                rows={2}
                                required
                                value={organizerName}
                                onChange={(e) => setOrganizerName(e.target.value)}
                                placeholder={`Contoh: ${DEFAULT_ORGANIZER_NAME}`}
                                className="w-full px-3.5 py-2 bg-white dark:bg-[#161B2A] border border-oxford-200 dark:border-oxford-700 rounded-lg text-xs focus:outline-none focus:border-gold-500 text-oxford-900 dark:text-white"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-oxford-700 dark:text-oxford-200 mb-1">
                                Pola Kegiatan
                            </label>
                            <select
                                value={deliveryMode}
                                onChange={(e) => {
                                    const nextMode = e.target.value as DeliveryMode;
                                    setDeliveryMode(nextMode);
                                    // Otomatis sinkronkan format pertanyaan evaluasi penyelenggara sesuai metode yang dipilih
                                    const nextQuestions = getOrganizerEvaluationQuestions(nextMode);
                                    setEvaluationConfig((prev) => ({
                                        ...prev,
                                        organizer: nextQuestions.map((q) => ({
                                            ...q,
                                            options: q.options.map((o) => ({ ...o })),
                                        })),
                                    }));
                                }}
                                className="w-full px-4 py-2.5 bg-white dark:bg-[#161B2A] border border-oxford-200 dark:border-oxford-700 rounded-lg text-sm focus:outline-none focus:border-gold-500 text-oxford-900 dark:text-white font-medium"
                            >
                                <option value="daring">Daring (Online)</option>
                                <option value="luring">Luring / Klasikal (Tatap Muka)</option>
                                <option value="blended">Blended Learning</option>
                            </select>
                            <p className="text-[11px] text-oxford-500 dark:text-oxford-400 mt-1">
                                Format instrumen evaluasi penyelenggara otomatis berganti ke format {deliveryMode === "daring" ? "Daring (Platform, Audio-Visual, Materi Digital)" : deliveryMode === "luring" ? "Luring (Ruang Kelas, AC, Konsumsi, Sound)" : "Blended Learning (Hybrid)"}.
                            </p>
                        </div>

                        {(deliveryMode === "luring" || deliveryMode === "blended") && (
                            <div>
                                <label className="block text-xs font-bold text-oxford-700 dark:text-oxford-200 mb-1">
                                    Nama Tempat / Lokasi Pelaksanaan <span className="text-crimson-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={locationName}
                                    onChange={(e) => setLocationName(e.target.value)}
                                    placeholder="Contoh: Kota Tarakan"
                                    className="w-full px-4 py-2 bg-white dark:bg-[#161B2A] border border-oxford-200 dark:border-oxford-700 rounded-lg text-sm focus:outline-none focus:border-gold-500 text-oxford-900 dark:text-white"
                                />
                                <p className="text-[11px] text-oxford-500 mt-1">
                                    Akan tercetak di sertifikat: &ldquo;{deliveryMode === "luring" ? "secara klasikal" : "secara blended learning"} di {locationName.trim() || "..."}&rdquo;.
                                </p>
                            </div>
                        )}
                    </div>

                    <div className="bg-oxford-50 dark:bg-oxford-950 p-5 rounded-xl border border-oxford-100 dark:border-oxford-800">
                        <label className="block text-sm font-bold text-oxford-900 dark:text-white mb-2">Link Dokumentasi Kegiatan (Opsional)</label>
                        <input
                            type="url"
                            value={documentationUrl}
                            onChange={(e) => setDocumentationUrl(e.target.value)}
                            placeholder="https://drive.google.com/drive/folders/..."
                            className="w-full px-4 py-2.5 bg-white dark:bg-[#161B2A] border border-oxford-200 dark:border-oxford-700 rounded-lg text-sm focus:outline-none focus:border-gold-500 text-oxford-900 dark:text-white"
                        />
                        <p className="text-[11px] text-oxford-500 mt-1">Tautan Google Drive / Album Foto / Rekaman yang ditampilkan di sidebar kelas peserta tanpa membebani server.</p>
                    </div>

                    <div className="bg-oxford-50 dark:bg-oxford-950 p-5 rounded-xl border border-oxford-100 dark:border-oxford-800 space-y-3" ref={dropdownRef}>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                            <label className="block text-sm font-bold text-oxford-900 dark:text-white">Instruktur Pengajar</label>
                            <span className="text-[11px] text-oxford-500">Cari nama/NIP pengajar di sistem</span>
                        </div>

                        {/* Selected Instructor Card */}
                        {selectedInstructor && !isInstructorDropdownOpen ? (
                            <div className="flex items-center justify-between p-3.5 bg-white dark:bg-[#161B2A] border border-gold-400/60 dark:border-gold-500/40 rounded-xl shadow-xs">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-9 h-9 rounded-full bg-gold-100 dark:bg-gold-950 text-gold-700 dark:text-gold-300 flex items-center justify-center font-bold text-sm shrink-0 border border-gold-300 dark:border-gold-700">
                                        {selectedInstructor.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <p className="text-sm font-bold text-oxford-900 dark:text-white truncate">
                                                {selectedInstructor.name}
                                            </p>
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                                selectedInstructor.role === 'instructor'
                                                    ? 'bg-gold-100 dark:bg-gold-950 text-gold-800 dark:text-gold-300 border border-gold-300'
                                                    : selectedInstructor.role === 'admin'
                                                    ? 'bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 border border-blue-300'
                                                    : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300'
                                            }`}>
                                                {selectedInstructor.role === 'instructor' ? 'Instruktur' : selectedInstructor.role === 'admin' ? 'Admin' : 'Pegawai/Peserta'}
                                            </span>
                                        </div>
                                        <p className="text-xs text-oxford-500 truncate">
                                            {selectedInstructor.email}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsInstructorDropdownOpen(true);
                                        setInstructorSearch("");
                                    }}
                                    className="px-3 py-1.5 text-xs font-bold text-gold-600 dark:text-gold-400 hover:text-gold-500 hover:bg-gold-50 dark:hover:bg-oxford-800 rounded-lg transition-colors shrink-0 ml-2 border border-gold-300/60"
                                >
                                    Ganti Pengajar
                                </button>
                            </div>
                        ) : (
                            /* Search Input & Live Filter Dropdown */
                            <div className="relative">
                                <div className="relative">
                                    <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-oxford-400" />
                                    <input
                                        type="text"
                                        value={instructorSearch}
                                        onFocus={() => setIsInstructorDropdownOpen(true)}
                                        onChange={(e) => {
                                            setInstructorSearch(e.target.value);
                                            setIsInstructorDropdownOpen(true);
                                        }}
                                        placeholder="Ketik nama atau NIP/email pengajar untuk mencari..."
                                        className="w-full pl-10 pr-10 py-2.5 bg-white dark:bg-[#161B2A] border border-oxford-200 dark:border-oxford-700 rounded-xl text-sm focus:outline-none focus:border-gold-500 text-oxford-900 dark:text-white"
                                    />
                                    {isInstructorDropdownOpen && selectedInstructor && (
                                        <button
                                            type="button"
                                            onClick={() => setIsInstructorDropdownOpen(false)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-oxford-400 hover:text-oxford-600 dark:hover:text-white"
                                        >
                                            <X size={16} />
                                        </button>
                                    )}
                                </div>

                                {isInstructorDropdownOpen && (
                                    <div className="absolute left-0 right-0 top-full mt-1.5 bg-white dark:bg-[#161B2A] border border-oxford-200 dark:border-oxford-700 rounded-xl shadow-xl z-30 max-h-64 overflow-y-auto divide-y divide-oxford-100 dark:divide-oxford-800 animate-in fade-in duration-150">
                                        {filteredInstructors.length > 0 ? (
                                            filteredInstructors.map((inst) => {
                                                const isSelected = inst.id === instructorId;
                                                return (
                                                    <button
                                                        key={inst.id}
                                                        type="button"
                                                        onClick={() => {
                                                            setInstructorId(inst.id);
                                                            setIsInstructorDropdownOpen(false);
                                                            setInstructorSearch("");
                                                        }}
                                                        className={`w-full text-left px-4 py-2.5 flex items-center justify-between gap-3 hover:bg-gold-50/70 dark:hover:bg-oxford-800 transition-colors ${
                                                            isSelected ? "bg-gold-500/10 font-bold" : ""
                                                        }`}
                                                    >
                                                        <div className="min-w-0">
                                                            <div className="flex items-center gap-2">
                                                                <p className="text-xs font-bold text-oxford-900 dark:text-white truncate">
                                                                    {inst.name}
                                                                </p>
                                                                <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                                                                    inst.role === 'instructor'
                                                                        ? 'bg-gold-100 text-gold-800 dark:bg-gold-950 dark:text-gold-300'
                                                                        : inst.role === 'admin'
                                                                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                                                                        : 'bg-oxford-100 text-oxford-700 dark:bg-oxford-800 dark:text-oxford-300'
                                                                }`}>
                                                                    {inst.role === 'instructor' ? 'Instruktur' : inst.role === 'admin' ? 'Admin' : 'Pegawai'}
                                                                </span>
                                                            </div>
                                                            <p className="text-[11px] text-oxford-500 truncate">
                                                                {inst.email}
                                                            </p>
                                                        </div>
                                                        {isSelected && (
                                                            <Check size={16} className="text-gold-600 shrink-0" />
                                                        )}
                                                    </button>
                                                );
                                            })
                                        ) : (
                                            <div className="p-4 text-center text-xs text-oxford-500">
                                                Tidak ditemukan pengguna dengan kata kunci &ldquo;{instructorSearch}&rdquo;
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                        {instructors.length === 0 && (
                            <p className="text-xs text-crimson-500 mt-2">Belum ada akun pengguna terdaftar di sistem.</p>
                        )}
                    </div>

                    <div className="bg-oxford-50 dark:bg-oxford-950 p-5 rounded-xl border border-oxford-100 dark:border-oxford-800">
                        <label className="block text-sm font-bold text-oxford-900 dark:text-white mb-2">Tanggal Pelaksanaan</label>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-bold text-oxford-400 uppercase tracking-widest mb-1">Model Waktu</label>
                                <select value={pacingType} onChange={(e) => setPacingType(e.target.value as typeof pacingType)} className="w-full px-4 py-2 bg-white dark:bg-[#161B2A] border border-oxford-200 dark:border-oxford-700 rounded-lg text-sm">
                                    <option value="self_paced">Mandiri (self-paced)</option>
                                    <option value="instructor_paced">Terjadwal (instructor-paced)</option>
                                </select>
                                <p className="mt-1 text-xs text-oxford-500">Mode terjadwal membuka materi mulai tanggal yang ditetapkan.</p>
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-oxford-400 uppercase tracking-widest mb-1">Mulai</label>
                                <input
                                    type="date"
                                    required={pacingType === "instructor_paced"}
                                    value={startDate || ""}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="w-full px-4 py-2 bg-white dark:bg-[#161B2A] border border-oxford-200 dark:border-oxford-700 rounded-lg text-sm focus:outline-none focus:border-gold-500 text-oxford-900 dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-oxford-400 uppercase tracking-widest mb-1">Selesai</label>
                                <input
                                    type="date"
                                    value={endDate || ""}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="w-full px-4 py-2 bg-white dark:bg-[#161B2A] border border-oxford-200 dark:border-oxford-700 rounded-lg text-sm focus:outline-none focus:border-gold-500 text-oxford-900 dark:text-white"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="bg-oxford-50 dark:bg-oxford-950 p-5 rounded-xl border border-oxford-100 dark:border-oxford-800">
                        <label className="block text-sm font-bold text-oxford-900 dark:text-white mb-2">Kategori Kursus</label>
                        <select
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            className="w-full px-4 py-3 bg-white dark:bg-[#161B2A] border border-oxford-200 dark:border-oxford-700 rounded-lg text-sm focus:outline-none focus:border-gold-500 text-oxford-900 dark:text-white mb-4"
                        >
                            {COURSE_CATEGORIES.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
                    </div>

                    <div className="bg-oxford-50 dark:bg-oxford-950 p-5 rounded-xl border border-oxford-100 dark:border-oxford-800">
                        <h4 className="text-sm font-bold text-oxford-900 dark:text-white mb-1">Akses &amp; Pendaftaran Kelas</h4>
                        <p className="text-xs text-oxford-500 dark:text-oxford-400 mb-4">Tentukan cara peserta mendaftar ke dalam kelas ini.</p>
                        
                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs font-bold text-oxford-700 dark:text-oxford-200 mb-1">Metode Akses</label>
                                <select
                                    value={accessMode}
                                    onChange={(e) => setAccessMode(e.target.value as typeof accessMode)}
                                    className="w-full px-4 py-2.5 bg-white dark:bg-[#161B2A] border border-oxford-200 dark:border-oxford-700 rounded-lg text-sm focus:outline-none focus:border-gold-500 text-oxford-900 dark:text-white"
                                >
                                    <option value="open">Terbuka (Langsung Terdaftar)</option>
                                    <option value="passcode">Kunci Pendaftaran (Wajib Passcode)</option>
                                    <option value="approval">Persetujuan Admin (Pending Approval)</option>
                                </select>
                            </div>

                            {accessMode === "passcode" && (
                                <div className="space-y-1">
                                    <label className="block text-xs font-bold text-oxford-700 dark:text-oxford-200">
                                        Kunci Pendaftaran (Passcode) *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={passcode}
                                        onChange={(e) => setPasscode(e.target.value)}
                                        placeholder="Contoh: KELAS-2026 atau PIN rahasia"
                                        className="w-full px-4 py-2 bg-white dark:bg-[#161B2A] border border-oxford-200 dark:border-oxford-700 rounded-lg text-sm font-mono focus:outline-none focus:border-gold-500 text-oxford-900 dark:text-white"
                                    />
                                    <p className="text-[11px] text-oxford-400">
                                        Peserta wajib memasukkan kode ini saat klik daftar.
                                    </p>
                                </div>
                            )}

                            {accessMode === "approval" && (
                                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-300">
                                    Peserta mengajukan pendaftaran secara mandiri, namun statusnya menunggu persetujuan admin/pengajar sebelum dapat mengakses kelas.
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="bg-oxford-50 dark:bg-oxford-950 p-5 rounded-xl border border-oxford-100 dark:border-oxford-800">
                        <h4 className="text-sm font-bold text-oxford-900 dark:text-white mb-4">Pengaturan Sertifikat & Durasi</h4>
                        
                        <div className="space-y-4">
                            <label className="flex items-start gap-3 rounded-lg border border-oxford-200 bg-white p-3 dark:border-oxford-700 dark:bg-[#161B2A]">
                                <input type="checkbox" checked={certificateEnabled} onChange={(e) => setCertificateEnabled(e.target.checked)} className="mt-1 h-4 w-4 accent-emerald-600" />
                                <span><strong className="block text-sm">Aktifkan sertifikat</strong><span className="text-xs text-oxford-500">Peserta yang lulus dapat menerima dokumen kelulusan.</span></span>
                            </label>
                            <label className={`flex items-start gap-3 rounded-lg border border-oxford-200 bg-white p-3 dark:border-oxford-700 dark:bg-[#161B2A] ${certificateEnabled ? "" : "opacity-50"}`}>
                                <input type="checkbox" disabled={!certificateEnabled} checked={certificateAutoIssue} onChange={(e) => setCertificateAutoIssue(e.target.checked)} className="mt-1 h-4 w-4 accent-emerald-600" />
                                <span><strong className="block text-sm">Terbitkan otomatis setelah lulus</strong><span className="text-xs text-oxford-500">Sistem membuat nomor, snapshot peserta, dan sertifikat tanpa proses manual.</span></span>
                            </label>
                            <div>
                                <label className="block text-xs font-bold text-oxford-700 dark:text-oxford-200 mb-1">Jenis Dokumen Kelulusan</label>
                                <select
                                    disabled={!certificateEnabled}
                                    value={certificateType}
                                    onChange={(e) => setCertificateType(e.target.value as typeof certificateType)}
                                    className="w-full px-4 py-2 bg-white dark:bg-[#161B2A] border border-oxford-200 dark:border-oxford-700 rounded-lg text-sm focus:outline-none focus:border-gold-500 text-oxford-900 dark:text-white"
                                >
                                    <option value="sertifikat">Sertifikat Kompetensi</option>
                                    <option value="surat_keterangan">Surat Keterangan</option>
                                    <option value="sttp">Surat Tanda Tamat Pelatihan (STTP)</option>
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-oxford-700 dark:text-oxford-200 mb-1">Awalan Nomor</label>
                                    <input disabled={!certificateEnabled} required maxLength={20} value={certificateNumberPrefix} onChange={(e) => setCertificateNumberPrefix(e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, ""))} placeholder="CRS" className="w-full px-4 py-2 bg-white dark:bg-[#161B2A] border border-oxford-200 dark:border-oxford-700 rounded-lg text-sm font-mono" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-oxford-700 dark:text-oxford-200 mb-1">Nilai Lulus</label>
                                    <input type="number" min={0} max={100} value={passingScore} onChange={(e) => setPassingScore(Number(e.target.value))} className="w-full px-4 py-2 bg-white dark:bg-[#161B2A] border border-oxford-200 dark:border-oxford-700 rounded-lg text-sm" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-oxford-700 dark:text-oxford-200 mb-1">Beban Jam Pelajaran (JP)</label>
                                <input
                                    type="number"
                                    min="0"
                                    value={jp}
                                    onChange={(e) => setJp(e.target.value === "" ? "" : parseInt(e.target.value))}
                                    placeholder="Contoh: 32"
                                    className="w-full px-4 py-2 bg-white dark:bg-[#161B2A] border border-oxford-200 dark:border-oxford-700 rounded-lg text-sm focus:outline-none focus:border-gold-500 text-oxford-900 dark:text-white"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {trainingType === "classical_facilitation" && (
                <CourseEvaluationConfigEditor
                    value={evaluationConfig}
                    onChange={setEvaluationConfig}
                    deliveryMode={deliveryMode}
                />
            )}
        </form>
    );
}
