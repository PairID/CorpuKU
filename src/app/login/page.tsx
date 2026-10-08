"use client";

import Link from "next/link";
import { BookOpen, User, Lock, ArrowRight, Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Login() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const router = useRouter();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const res = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, password }),
            });
            const data = await res.json();

            if (!res.ok || data.error) {
                setError(data.error || "Login gagal. Periksa username dan password.");
                setLoading(false);
            } else {
                // Redirect based on role
                const role = data.user?.role;
                if (role === "admin") {
                    router.push("/admin");
                } else if (role === "instructor") {
                    router.push("/instructor");
                } else {
                    router.push("/dashboard");
                }
            }
        } catch {
            setError("Terjadi kesalahan. Silakan coba lagi.");
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-oxford-50 dark:bg-oxford-950 flex">
            {/* Left Image Section */}
            <div className="hidden lg:flex w-1/2 bg-oxford-950 relative items-center justify-center overflow-hidden">
                <div className="absolute inset-0 bg-mesh mix-blend-screen opacity-30" />
                <div className="absolute inset-0 bg-gradient-to-t from-oxford-950 via-transparent to-oxford-950/50" />
                <div className="relative z-10 max-w-lg p-12 text-center">
                    <h2 className="text-4xl font-serif font-bold text-white mb-6 leading-tight">Selamat Datang Kembali di CorpuKU</h2>
                    <p className="text-oxford-200 font-sans text-lg">Lanjutkan perjalanan pembelajaran Anda menuju peningkatan karir profesional.</p>
                </div>
            </div>

            {/* Right Form Section */}
            <div className="w-full lg:w-1/2 flex flex-col justify-center px-8 sm:px-16 md:px-24">
                <div className="max-w-md w-full mx-auto">
                    <Link href="/" className="flex items-center gap-2 mb-12">
                        <div className="w-10 h-10 bg-gold-500 text-oxford-900 dark:text-white rounded-lg flex items-center justify-center">
                            <BookOpen size={24} />
                        </div>
                        <span className="font-serif text-2xl font-bold text-oxford-900 dark:text-white tracking-tight">
                            CorpuKU <span className="font-sans text-gold-500 font-medium text-xl">Academy</span>
                        </span>
                    </Link>

                    <h1 className="text-3xl font-sans font-bold text-oxford-900 dark:text-white mb-2">Masuk ke Akun</h1>
                    <p className="text-oxford-500 dark:text-oxford-400 font-sans mb-8">Masukkan NIP (username) dan password Anda untuk mengakses LMS.</p>

                    {error && (
                        <div className="mb-4 p-3 bg-crimson-50 text-crimson-600 rounded-lg border border-crimson-200 text-sm font-medium">
                            {error}
                        </div>
                    )}

                    <form className="space-y-5" onSubmit={handleLogin}>
                        <div>
                            <label htmlFor="username" className="block text-sm font-bold text-oxford-900 dark:text-white mb-2">NIP / Username</label>
                            <div className="relative">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-oxford-400" size={20} />
                                <input
                                    type="text"
                                    id="username"
                                    name="username"
                                    required
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    placeholder="Masukkan NIP Anda"
                                    autoComplete="username"
                                    data-1p-ignore="true"
                                    data-lpignore="true"
                                    className="w-full pl-12 pr-4 py-3 border border-oxford-200 dark:border-oxford-700 bg-white dark:bg-[#161B2A] rounded-xl focus:outline-none focus:ring-4 focus:ring-gold-500/10 focus:border-gold-500 transition-all font-sans text-oxford-900 dark:text-white"
                                />
                            </div>
                        </div>

                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label htmlFor="password" className="text-sm font-bold text-oxford-900 dark:text-white">Password</label>
                            </div>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-oxford-400" size={20} />
                                <input
                                    type={showPassword ? "text" : "password"}
                                    id="password"
                                    name="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    autoComplete="current-password"
                                    data-1p-ignore="true"
                                    data-lpignore="true"
                                    className="w-full pl-12 pr-12 py-3 border border-oxford-200 dark:border-oxford-700 bg-white dark:bg-[#161B2A] rounded-xl focus:outline-none focus:ring-4 focus:ring-gold-500/10 focus:border-gold-500 transition-all font-sans text-oxford-900 dark:text-white"
                                />
                                <button
                                    type="button"
                                    aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
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
                                disabled={loading}
                                className="w-full flex justify-center items-center gap-2 py-4 bg-oxford-900 text-white font-bold rounded-xl hover:bg-gold-500 hover:text-oxford-950 transition-all shadow-md mt-4 disabled:opacity-70 disabled:cursor-not-allowed"
                            >
                                {loading ? "Memproses..." : "Masuk"} {!loading && <ArrowRight size={18} />}
                            </button>
                        </div>
                    </form>

                    <div className="mt-8 text-center bg-oxford-50 dark:bg-oxford-950/50 p-4 rounded-2xl border border-oxford-100 dark:border-oxford-800">
                        <p className="text-sm text-oxford-500 dark:text-oxford-400 mb-2">
                            Lupa password atau kendala login?
                        </p>
                        <Link 
                            href="/forgot-password" 
                            className="text-sm font-bold text-oxford-900 dark:text-white hover:text-gold-600 transition-colors flex items-center justify-center gap-1"
                        >
                            Reset Password via Email <ArrowRight size={14} />
                        </Link>
                    </div>
                </div>
            </div>

        </div>
    );
}
