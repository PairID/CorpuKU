"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";
import { CheckCircle2, KeyRound } from "lucide-react";

function ResetPasswordForm() {
  const token = useSearchParams().get("token") || "";
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [complete, setComplete] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (!token) return setError("Tautan reset tidak valid.");
    if (password !== confirmation) return setError("Konfirmasi password tidak cocok.");
    setLoading(true);
    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const result = await response.json();
      if (!response.ok) setError(result.error || "Gagal mengatur ulang password.");
      else setComplete(true);
    } catch {
      setError("Terjadi gangguan jaringan. Silakan coba lagi.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-oxford-50 px-4 py-16 dark:bg-oxford-950">
      <section className="mx-auto max-w-md rounded-3xl border border-oxford-100 bg-white p-8 shadow-xl dark:border-oxford-800 dark:bg-[#161B2A]">
        <div className="mb-8 flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gold-100 text-gold-700">
            {complete ? <CheckCircle2 size={34} /> : <KeyRound size={34} />}
          </div>
        </div>
        <h1 className="text-center text-3xl font-bold text-oxford-900 dark:text-white">
          {complete ? "Password berhasil diperbarui" : "Buat password baru"}
        </h1>
        {complete ? (
          <div className="mt-8 text-center">
            <p className="mb-6 text-oxford-500">Semua sesi lama telah dihentikan demi keamanan akun Anda.</p>
            <Link href="/login" className="inline-flex rounded-xl bg-oxford-900 px-6 py-3 font-bold text-white">Masuk kembali</Link>
          </div>
        ) : (
          <form className="mt-8 space-y-5" onSubmit={submit}>
            {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
            <div>
              <label htmlFor="new-password" className="mb-2 block text-sm font-bold">Password baru</label>
              <input id="new-password" type="password" autoComplete="new-password" required minLength={10} maxLength={128} value={password} onChange={(event) => setPassword(event.target.value)} className="w-full rounded-xl border border-oxford-200 px-4 py-3 dark:bg-oxford-950" />
              <p className="mt-2 text-xs text-oxford-500">Minimal 10 karakter dengan huruf besar, huruf kecil, dan angka.</p>
            </div>
            <div>
              <label htmlFor="confirm-password" className="mb-2 block text-sm font-bold">Konfirmasi password</label>
              <input id="confirm-password" type="password" autoComplete="new-password" required value={confirmation} onChange={(event) => setConfirmation(event.target.value)} className="w-full rounded-xl border border-oxford-200 px-4 py-3 dark:bg-oxford-950" />
            </div>
            <button disabled={loading} className="w-full rounded-xl bg-oxford-900 px-4 py-3 font-bold text-white disabled:opacity-60">
              {loading ? "Menyimpan..." : "Simpan password baru"}
            </button>
          </form>
        )}
      </section>
    </main>
  );
}

export default function ResetPasswordPage() {
  return <Suspense fallback={<main className="min-h-screen bg-oxford-50" />}><ResetPasswordForm /></Suspense>;
}
