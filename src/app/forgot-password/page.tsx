"use client";

import Link from "next/link";
import { BookOpen, User, ArrowRight, ArrowLeft, Mail, CheckCircle2 } from "lucide-react";
import { useState } from "react";

export default function ForgotPassword() {
    const [username, setUsername] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const handleReset = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");
        setSuccess("");

        try {
            const res = await fetch("/api/auth/forgot-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username }),
            });
            const data = await res.json();

            if (!res.ok || data.error) {
                setError(data.error || "Gagal memproses permintaan.");
            } else {
                setSuccess(data.message);
            }
        } catch {
            setError("Terjadi kesalahan sistem. Silakan coba lagi.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-oxford-50 dark:bg-oxford-950 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full mx-auto bg-white dark:bg-[#161B2A] rounded-3xl shadow-xl overflow-hidden border border-oxford-100 dark:border-oxford-800">
                <div className="p-8 sm:p-10">
                    <div className="text-center mb-10">
                        <Link href="/" className="inline-flex items-center gap-2 mb-8">
                            <div className="w-10 h-10 bg-gold-500 text-oxford-900 dark:text-white rounded-lg flex items-center justify-center">
                                <BookOpen size={24} />
                            </div>
                            <span className="font-serif text-2xl font-bold text-oxford-900 dark:text-white tracking-tight">
                                CorpuKU <span className="font-sans text-gold-500 font-medium text-xl">Academy</span>
                            </span>
                        </Link>
                        
                        {!success ? (
                            <>
                                <h1 className="text-3xl font-sans font-bold text-oxford-900 dark:text-white mb-2">Lupa Password?</h1>
                                <p className="text-oxford-500 dark:text-oxford-400 font-sans px-4">Masukkan NIP Anda. Jika akun terdaftar, kami akan mengirim tautan reset yang berlaku selama 30 menit.</p>
                            </>
                        ) : (
                            <div className="flex flex-col items-center">
                                <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mb-4">
                                    <CheckCircle2 size={40} />
                                </div>
                                <h1 className="text-3xl font-sans font-bold text-oxford-900 dark:text-white mb-2">Cek Email Anda</h1>
                                <p className="text-oxford-500 dark:text-oxford-400 font-sans px-4">{success}</p>
                            </div>
                        )}
                    </div>

                    {!success ? (
                        <form className="space-y-6" onSubmit={handleReset}>
                            {error && (
                                <div className="p-3 bg-crimson-50 text-crimson-600 rounded-lg border border-crimson-200 text-sm font-medium">
                                    {error}
                                </div>
                            )}

                            <div>
                                <label htmlFor="forgot-username" className="block text-sm font-bold text-oxford-900 dark:text-white mb-2">NIP / Username</label>
                                <div className="relative">
                                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-oxford-400" size={20} />
                                    <input
                                        id="forgot-username"
                                        name="username"
                                        type="text"
                                        required
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        placeholder="Masukkan NIP Anda"
                                        autoComplete="username"
                                        className="w-full pl-12 pr-4 py-4 border border-oxford-200 dark:border-oxford-700 bg-white dark:bg-[#161B2A] rounded-xl focus:outline-none focus:ring-4 focus:ring-gold-500/10 focus:border-gold-500 transition-all font-sans text-oxford-900 dark:text-white"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full flex justify-center items-center gap-2 py-4 bg-oxford-900 text-white font-bold rounded-xl hover:bg-gold-500 hover:text-oxford-950 transition-all shadow-md disabled:opacity-70 disabled:cursor-not-allowed"
                            >
                                {loading ? "Mengirim..." : "Reset Password"} {!loading && <Mail size={18} />}
                            </button>
                        </form>
                    ) : (
                        <div className="space-y-4">
                            <Link
                                href="/login"
                                className="w-full flex justify-center items-center gap-2 py-4 bg-oxford-900 text-white font-bold rounded-xl hover:bg-gold-500 hover:text-oxford-950 transition-all shadow-md"
                            >
                                Kembali ke Login <ArrowRight size={18} />
                            </Link>
                            <p className="text-center text-sm text-oxford-400">
                                Tidak menerima email? Tunggu beberapa menit atau cek folder Spam.
                            </p>
                        </div>
                    )}

                    {!success && (
                        <div className="mt-8 text-center">
                            <Link href="/login" className="inline-flex items-center gap-2 text-sm font-bold text-oxford-600 dark:text-oxford-300 hover:text-gold-600 transition-colors">
                                <ArrowLeft size={16} /> Kembali ke Halaman Login
                            </Link>
                        </div>
                    )}
                </div>
            </div>
            
            <div className="mt-8 text-center text-oxford-400 text-sm">
                &copy; {new Date().getFullYear()} BPSDM Kaltara. All rights reserved.
            </div>
        </div>
    );
}
