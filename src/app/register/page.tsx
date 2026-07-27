"use client";

import Link from "next/link";
import { BookOpen, Mail, Lock, User, Briefcase, Building2, ArrowRight, CheckCircle2, Loader2, Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";

export default function Register() {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [nip, setNip] = useState("");
    const [instansiAsal, setInstansiAsal] = useState("");
    const [isEmailSent, setIsEmailSent] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState("");

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        if (password !== confirmPassword) {
            setError("Password dan Konfirmasi Password tidak cocok.");
            setLoading(false);
            return;
        }

        const { error } = await authClient.signUp.email({
            email,
            password,
            name,
            nip,
            instansiAsal,
        });

        if (error) {
            setError(error.message || "Registration failed");
            setLoading(false);
        } else {
            setSuccess(true);

            // Periksa apakah sistem minta verifikasi email
            setIsEmailSent(true);
            setLoading(false);
        }
    };

    return (
        <div className="min-h-[calc(100vh-5rem)] bg-oxford-50 dark:bg-oxford-950 flex">
            {/* Left Image Section */}
            <div className="hidden lg:flex w-1/2 bg-oxford-950 relative items-center justify-center overflow-hidden">
                <div className="absolute inset-0 bg-mesh mix-blend-screen opacity-30" />
                <div className="absolute inset-0 bg-gradient-to-t from-oxford-950 via-transparent to-oxford-950/50" />
                <div className="relative z-10 max-w-lg p-12 text-center">
                    <h2 className="text-4xl font-serif font-bold text-white mb-6 leading-tight">Mulai Perjalanan Belajar Anda</h2>
                    <p className="text-oxford-200 font-sans text-lg">Akses katalog kursus, webinar, dan materi pengembangan kompetensi yang tersedia di CorpuKU.</p>
                </div>
            </div>

            {/* Right Form Section */}
            <div className="w-full lg:w-1/2 flex flex-col px-8 sm:px-16 md:px-24 py-10 lg:py-16 overflow-y-auto">
                <div className="max-w-md w-full mx-auto my-auto">
                    <Link href="/" className="flex items-center gap-2 mb-10">
                        <div className="w-10 h-10 bg-gold-500 text-oxford-900 dark:text-white rounded-lg flex items-center justify-center">
                            <BookOpen size={24} />
                        </div>
                        <span className="font-serif text-2xl font-bold text-oxford-900 dark:text-white tracking-tight">
                            CorpuKU <span className="font-sans text-gold-500 font-medium text-xl">Academy</span>
                        </span>
                    </Link>

                    <h1 className="text-3xl font-sans font-bold text-oxford-900 dark:text-white mb-2">Buat Akun Baru</h1>
                    <p className="text-oxford-500 dark:text-oxford-400 font-sans mb-8">Daftar sekarang untuk mendapatkan akses penuh ke platform CorpuKU.</p>

                    {isEmailSent ? (
                        <div className="bg-white dark:bg-[#161B2A] p-8 rounded-2xl border-2 border-gold-500/20 shadow-xl text-center space-y-6 animate-in fade-in zoom-in duration-500">
                            <div className="w-20 h-20 bg-emerald-500/10 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                <CheckCircle2 size={40} className="animate-bounce" />
                            </div>
                            <h2 className="text-2xl font-bold text-oxford-900 dark:text-white">Pendaftaran Berhasil!</h2>
                            <p className="text-oxford-600 dark:text-oxford-300">
                                Akun Anda atas nama <span className="font-bold text-oxford-900 dark:text-white">{name}</span> telah berhasil didaftarkan.
                                Anda sekarang memiliki akses penuh ke platform CorpuKU.
                            </p>
                            <div className="pt-4">
                                <Link
                                    href="/login"
                                    className="inline-flex w-full justify-center items-center gap-2 bg-gold-500 text-oxford-950 py-3 rounded-xl font-bold hover:bg-gold-400 transition-colors shadow-sm"
                                >
                                    Klik Disini Untuk Login <ArrowRight size={18} />
                                </Link>
                            </div>
                        </div>
                    ) : (
                        <>
                            {error && (
                                <div className="mb-4 p-3 bg-crimson-50 text-crimson-600 rounded-lg border border-crimson-200 text-sm font-medium">
                                    {error}
                                </div>
                            )}

                            <form className="space-y-5" onSubmit={handleRegister}>
                                <div>
                                    <label className="block text-sm font-bold text-oxford-900 dark:text-white mb-2">Nama Lengkap</label>
                                    <div className="relative">
                                        <User className="absolute left-4 top-1/2 -translate-y-1/2 text-oxford-400" size={20} />
                                        <input
                                            type="text"
                                            id="name"
                                            name="name"
                                            required
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            placeholder="Nama beserta gelar"
                                            autoComplete="name"
                                            className="w-full pl-12 pr-4 py-3 border border-oxford-200 dark:border-oxford-700 bg-white dark:bg-[#161B2A] rounded-xl focus:outline-none focus:ring-4 focus:ring-gold-500/10 focus:border-gold-500 transition-all font-sans text-oxford-900 dark:text-white"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-oxford-900 dark:text-white mb-2">NIP / ID Pegawai</label>
                                    <div className="relative">
                                        <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 text-oxford-400" size={20} />
                                        <input
                                            type="text"
                                            id="nip"
                                            name="nip"
                                            value={nip}
                                            onChange={(e) => setNip(e.target.value)}
                                            placeholder="Nomor Induk Pegawai"
                                            className="w-full pl-12 pr-4 py-3 border border-oxford-200 dark:border-oxford-700 bg-white dark:bg-[#161B2A] rounded-xl focus:outline-none focus:ring-4 focus:ring-gold-500/10 focus:border-gold-500 transition-all font-sans text-oxford-900 dark:text-white"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-oxford-900 dark:text-white mb-2">Instansi Asal</label>
                                    <div className="relative">
                                        <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-oxford-400" size={20} />
                                        <input
                                            type="text"
                                            id="instansiAsal"
                                            name="instansiAsal"
                                            value={instansiAsal}
                                            onChange={(e) => setInstansiAsal(e.target.value)}
                                            placeholder="Nama Instansi"
                                            className="w-full pl-12 pr-4 py-3 border border-oxford-200 dark:border-oxford-700 bg-white dark:bg-[#161B2A] rounded-xl focus:outline-none focus:ring-4 focus:ring-gold-500/10 focus:border-gold-500 transition-all font-sans text-oxford-900 dark:text-white"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-oxford-900 dark:text-white mb-2">Email Kedinasan</label>
                                    <div className="relative">
                                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-oxford-400" size={20} />
                                        <input
                                            type="email"
                                            id="email"
                                            name="email"
                                            required
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            placeholder="nama@instansi.go.id"
                                            autoComplete="email"
                                            className="w-full pl-12 pr-4 py-3 border border-oxford-200 dark:border-oxford-700 bg-white dark:bg-[#161B2A] rounded-xl focus:outline-none focus:ring-4 focus:ring-gold-500/10 focus:border-gold-500 transition-all font-sans text-oxford-900 dark:text-white"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-oxford-900 dark:text-white mb-2">Password</label>
                                    <div className="relative">
                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-oxford-400" size={20} />
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            id="password"
                                            name="password"
                                            required
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            placeholder="Minimal 8 karakter"
                                            autoComplete="new-password"
                                            className="w-full pl-12 pr-12 py-3 border border-oxford-200 dark:border-oxford-700 bg-white dark:bg-[#161B2A] rounded-xl focus:outline-none focus:ring-4 focus:ring-gold-500/10 focus:border-gold-500 transition-all font-sans text-oxford-900 dark:text-white"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-oxford-400 hover:text-oxford-600 dark:hover:text-oxford-300 transition-colors"
                                        >
                                            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-oxford-900 dark:text-white mb-2">Konfirmasi Password</label>
                                    <div className="relative">
                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-oxford-400" size={20} />
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            id="confirmPassword"
                                            name="confirmPassword"
                                            required
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            placeholder="Ulangi password Anda"
                                            autoComplete="new-password"
                                            className="w-full pl-12 pr-12 py-3 border border-oxford-200 dark:border-oxford-700 bg-white dark:bg-[#161B2A] rounded-xl focus:outline-none focus:ring-4 focus:ring-gold-500/10 focus:border-gold-500 transition-all font-sans text-oxford-900 dark:text-white"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-oxford-400 hover:text-oxford-600 dark:hover:text-oxford-300 transition-colors"
                                        >
                                            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                        </button>
                                    </div>
                                </div>

                                <div className="py-2">
                                    <button
                                        type="submit"
                                        disabled={loading || success}
                                        className={`w-full flex justify-center items-center gap-2 py-4 font-bold rounded-xl transition-all shadow-md mt-2 disabled:cursor-not-allowed ${success
                                            ? "bg-emerald-500 text-white shadow-emerald-500/20"
                                            : "bg-gold-500 text-oxford-950 hover:bg-gold-400 shadow-gold-500/20 active:scale-95 disabled:opacity-70"
                                            }`}
                                    >
                                        {loading && !success && <Loader2 size={18} className="animate-spin" />}
                                        {success && <CheckCircle2 size={18} />}
                                        {success ? "Memproses Verifikasi..." : loading ? "Memproses..." : "Buat Akun"}
                                        {!loading && !success && <ArrowRight size={18} />}
                                    </button>
                                    <p className="text-xs text-oxford-500 dark:text-oxford-400 text-center mt-4">
                                        Dengan mendaftar, Anda menyetujui Syarat Ketentuan dan Kebijakan Privasi CorpuKU.
                                    </p>
                                </div>
                            </form>

                            <p className="mt-8 text-center text-sm font-sans text-oxford-600 dark:text-oxford-300">
                                Sudah punya akun? <Link href="/login" className="font-bold text-gold-600 hover:text-gold-500 underline">Masuk di sini</Link>
                            </p>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
