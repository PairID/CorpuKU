"use client";

import { useState, useRef } from "react";
import { Save, ArrowLeft, Loader2, Upload, X } from "lucide-react";
import Link from "next/link";
import { createCourse, updateCourseDetails } from "@/app/actions/courses";
import { COURSE_CATEGORIES } from "@/lib/constants";


export interface CourseInstructor {
    id: string;
    name: string;
    email: string;
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
}

interface CourseFormProps {
    initialData?: CourseFormData;
    instructors: CourseInstructor[];
    mode: "create" | "edit";
    basePath?: string;
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
    const [startDate, setStartDate] = useState(initialData?.startDate || "");
    const [endDate, setEndDate] = useState(initialData?.endDate || "");
    const [jp, setJp] = useState<number | "">(initialData?.jp || "");
    const [certificateType, setCertificateType] = useState<"sertifikat" | "surat_keterangan" | "sttp">(initialData?.certificateType || "sertifikat");
    const [certificateEnabled, setCertificateEnabled] = useState(initialData?.certificateEnabled ?? true);
    const [certificateAutoIssue, setCertificateAutoIssue] = useState(initialData?.certificateAutoIssue ?? true);
    const [certificateNumberPrefix, setCertificateNumberPrefix] = useState(initialData?.certificateNumberPrefix || "CRS");
    const [passingScore, setPassingScore] = useState(initialData?.passingScore ?? 60);
    const [thumbnailPreview, setThumbnailPreview] = useState<string>(initialData?.thumbnailUrl || "");

    const handleThumbnailUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        
        if (file.size > 5 * 1024 * 1024) {
            alert("Ukuran file maksimal 5MB.");
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
            } else {
                alert("Upload gagal: " + result.error);
            }
        } catch (err) {
            console.error("Upload error:", err);
            alert("Terjadi kesalahan saat upload gambar.");
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
        };

        try {
            if (mode === "create") {
                const result = await createCourse(data);
                if (result.success) {
                    // Use window.location for a clean navigation (avoids render loop)
                    window.location.href = `${basePath}/courses`;
                    return; // Don't setIsLoading(false) — we're navigating away
                } else {
                    alert(result.error);
                }
            } else {
                const result = await updateCourseDetails(initialData!.id, data);
                if (result.success) {
                    window.location.href = `${basePath}/courses`;
                    return;
                } else {
                    alert(result.error);
                }
            }
        } catch {
            alert("Terjadi kesalahan saat menyimpan.");
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
                        <label className="block text-sm font-bold text-oxford-900 dark:text-white mb-2">Instruktur Pengajar</label>
                        <select
                            value={instructorId}
                            onChange={(e) => setInstructorId(e.target.value)}
                            className="w-full px-4 py-3 bg-white dark:bg-[#161B2A] border border-oxford-200 dark:border-oxford-700 rounded-lg text-sm focus:outline-none focus:border-gold-500 text-oxford-900 dark:text-white"
                        >
                            <option value="" disabled>Pilih Instruktur...</option>
                            {instructors.map((inst) => (
                                <option key={inst.id} value={inst.id}>
                                    {inst.name} ({inst.email})
                                </option>
                            ))}
                        </select>
                        {instructors.length === 0 && (
                            <p className="text-xs text-crimson-500 mt-2">Belum ada akun instruktur terdaftar di sistem.</p>
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
        </form>
    );
}
