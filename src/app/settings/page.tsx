"use client";

import Link from "next/link";
import Image from "next/image";
import { ChevronLeft, User, Shield, Bell, Settings as SettingsIcon, Save, Loader2, Camera, X, Eye, EyeOff, Check, Moon, Sun } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { changePassword, updateNotificationPreferences, getNotificationPreferences, updateUserProfile } from "@/app/actions/users";
import { useTheme } from "@/components/theme-provider";
import { PANGKAT_GOLONGAN } from "@/lib/constants";
import type { AuthUser } from "@/lib/session";

type SettingsTab = "profile" | "security" | "notifications" | "preferences";

export default function Settings() {
    const { data: session, isPending } = authClient.useSession();
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<SettingsTab>("profile");
    const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);
    useEffect(() => {
        if (!isPending && !session) {
            router.push('/login');
        }
    }, [session, isPending, router]);

    const showNotification = (type: "success" | "error", message: string) => {
        setNotification({ type, message });
        setTimeout(() => setNotification(null), 3000);
    };

    if (isPending || !session) {
        return (
            <div className="min-h-screen bg-oxford-50 dark:bg-oxford-950 flex items-center justify-center">
                <Loader2 size={40} className="animate-spin text-gold-500" />
            </div>
        );
    }

    const user = session.user!;

    const storedUser = user;

    const tabs: { key: SettingsTab; label: string; icon: React.ReactNode }[] = [
        { key: "profile", label: "Profil Pribadi", icon: <User size={18} /> },
        { key: "security", label: "Keamanan & Password", icon: <Shield size={18} /> },
        { key: "notifications", label: "Notifikasi Email", icon: <Bell size={18} /> },
        { key: "preferences", label: "Preferensi Sistem", icon: <SettingsIcon size={18} /> },
    ];

    return (
        <div className="min-h-screen bg-oxford-50 dark:bg-oxford-950 flex flex-col font-sans">

            {/* Floating Notification */}
            {notification && (
                <div className={`fixed top-6 right-6 z-[100] flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-2xl border text-sm font-bold animate-slide-in-right ${notification.type === "success"
                    ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                    : "bg-crimson-50 text-crimson-800 border-crimson-200"
                    }`}>
                    {notification.type === "success" ? <Check size={18} /> : <X size={18} />}
                    {notification.message}
                    <button onClick={() => setNotification(null)} className="ml-2 opacity-60 hover:opacity-100">
                        <X size={14} />
                    </button>
                </div>
            )}

            {/* Top Header */}
            <header className="h-20 bg-white dark:bg-[#161B2A] border-b border-oxford-200 dark:border-oxford-700 flex items-center px-6 sticky top-0 z-30 shadow-sm">
                <Link href="/" className="flex items-center gap-2 text-oxford-500 dark:text-oxford-400 hover:text-oxford-900 dark:hover:text-white transition-colors mr-6">
                    <ChevronLeft size={20} /> Kembali ke Beranda
                </Link>
                <div className="h-6 w-px bg-oxford-200 dark:bg-oxford-800 mr-6" />
                <h1 className="font-bold text-xl text-oxford-900 dark:text-white">Pengaturan Akun</h1>
            </header>

            {/* Main Content Area */}
            <main className="flex-1 max-w-6xl mx-auto w-full p-6 md:p-8 lg:p-12">

                <div className="flex flex-col lg:flex-row gap-8 items-start">

                    {/* Sidebar Navigation */}
                    <aside className="w-full lg:w-80 shrink-0 bg-white dark:bg-[#161B2A] rounded-2xl border border-oxford-200 dark:border-oxford-700 shadow-sm p-4 sticky top-28">
                        <nav className="space-y-1">
                            {tabs.map(tab => (
                                <button
                                    key={tab.key}
                                    onClick={() => setActiveTab(tab.key)}
                                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${activeTab === tab.key
                                        ? "bg-oxford-50 dark:bg-oxford-950 text-oxford-900 dark:text-white font-bold border border-oxford-100 dark:border-oxford-800"
                                        : "text-oxford-600 dark:text-oxford-300 hover:bg-oxford-50 dark:hover:bg-oxford-950 hover:text-oxford-900 dark:hover:text-white"
                                        }`}
                                >
                                    {tab.icon} {tab.label}
                                </button>
                            ))}
                        </nav>
                    </aside>

                    {/* Form Area */}
                    <div className="flex-1 bg-white dark:bg-[#161B2A] rounded-2xl border border-oxford-200 dark:border-oxford-700 shadow-sm overflow-hidden min-h-[500px]">
                        {activeTab === "profile" && (
                            <ProfileTab user={user} storedUser={storedUser} onNotify={showNotification} />
                        )}
                        {activeTab === "security" && (
                            <SecurityTab userId={user.id} onNotify={showNotification} />
                        )}
                        {activeTab === "notifications" && (
                            <NotificationsTab userId={user.id} onNotify={showNotification} />
                        )}
                        {activeTab === "preferences" && (
                            <PreferencesTab onNotify={showNotification} />
                        )}
                    </div>

                </div>

            </main>

        </div>
    );
}

// ===== PROFILE TAB =====

function ProfileTab({ user, storedUser, onNotify }: {
    user: AuthUser;
    storedUser: AuthUser;
    onNotify: (type: "success" | "error", msg: string) => void;
}) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
    const [uploadProgress, setUploadProgress] = useState<number | null>(null);
    const [formData, setFormData] = useState({
        name: user.name || "",
        email: user.email || "",
        nip: storedUser?.nip || user.nip || "",
        instansiAsal: storedUser?.instansiAsal || "BPSDM Provinsi",
        pangkat: storedUser?.pangkat || "",
        jabatan: storedUser?.jabatan || "",
        tempatLahir: storedUser?.tempatLahir || "",
        tanggalLahir: storedUser?.tanggalLahir || "",
    });
    const [saving, setSaving] = useState(false);

    const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 2 * 1024 * 1024) {
            onNotify("error", "Ukuran file maksimal 2MB.");
            return;
        }

        setSaving(true);
        setUploadProgress(0);
        
        try {
            const formData = new FormData();
            formData.append("file", file);

            const xhr = new XMLHttpRequest();
            xhr.upload.onprogress = (event) => {
                if (event.lengthComputable) {
                    const percent = Math.round((event.loaded / event.total) * 100);
                    setUploadProgress(percent);
                }
            };

            xhr.onload = () => {
                try {
                    const result = JSON.parse(xhr.responseText);
                    if (result.status >= 200 && result.status < 300 || result.success) {
                        setAvatarPreview(result.url);
                        onNotify("success", "Foto berhasil diunggah. Klik 'Simpan Perubahan' di bawah untuk menyimpan profil.");
                    } else {
                        onNotify("error", "Upload gagal: " + (result.error || "Unknown error"));
                    }
                } catch {
                    onNotify("error", "Gagal memproses respon server.");
                }
                setSaving(false);
                setUploadProgress(null);
            };

            xhr.onerror = () => {
                onNotify("error", "Terjadi kesalahan koneksi saat mengunggah.");
                setSaving(false);
                setUploadProgress(null);
            };

            xhr.open("POST", "/api/upload");
            xhr.send(formData);
        } catch (err) {
            console.error("Avatar upload error:", err);
            onNotify("error", "Terjadi kesalahan saat mengunggah foto.");
            setSaving(false);
            setUploadProgress(null);
        }
    };

    const handleRemovePhoto = () => {
        setAvatarPreview(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        onNotify("success", "Foto dihapus.");
    };

    const handleSave = async () => {
        setSaving(true);
        
        // Save to Postgres via server action
        const result = await updateUserProfile(user.id, {
            name: formData.name,
            instansiAsal: formData.instansiAsal,
            pangkat: formData.pangkat,
            jabatan: formData.jabatan,
            tempatLahir: formData.tempatLahir,
            tanggalLahir: formData.tanggalLahir,
            image: avatarPreview || undefined,
        });

        setSaving(false);
        if (result.success) {
            onNotify("success", "Profil berhasil disimpan. Data sertifikat akan otomatis terupdate.");
        } else {
            onNotify("error", result.error || "Gagal menyimpan profil.");
        }
    };

    return (
        <>
            <div className="p-6 border-b border-oxford-200 dark:border-oxford-700 bg-oxford-50 dark:bg-oxford-950/50">
                <h2 className="text-xl font-bold text-oxford-900 dark:text-white">Profil Pribadi</h2>
                <p className="text-sm text-oxford-500 dark:text-oxford-400">Perbarui foto dan identitas diri Anda di CorpuKU Academy.</p>
            </div>

            <div className="p-6 space-y-8">

                {/* Avatar Update */}
                <div className="flex items-center gap-6">
                    <div className="relative group">
                        <div className="w-20 h-20 rounded-full bg-oxford-900 flex items-center justify-center text-white text-3xl font-bold shadow-md uppercase overflow-hidden">
                            {avatarPreview || user.image ? (
                                <Image src={avatarPreview || user.image || ""} alt={user.name} width={80} height={80} unoptimized className="w-full h-full object-cover" />
                            ) : (
                                user.name.charAt(0)
                            )}
                            
                            {/* Upload Progress Overlay */}
                            {uploadProgress !== null && (
                                <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center p-2">
                                    <span className="text-[10px] font-bold text-gold-400 mb-1">{uploadProgress}%</span>
                                    <div className="w-full h-1 bg-white dark:bg-[#161B2A]/20 rounded-full overflow-hidden">
                                        <div 
                                            className="h-full bg-gold-400 transition-all duration-200" 
                                            style={{ width: `${uploadProgress}%` }}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="absolute -bottom-1 -right-1 w-7 h-7 bg-gold-500 text-oxford-950 rounded-full flex items-center justify-center shadow-md hover:bg-gold-400 transition-colors"
                        >
                            <Camera size={14} />
                        </button>
                    </div>
                    <div>
                        <div className="flex gap-3 mb-2">
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="px-4 py-2 bg-oxford-100 dark:bg-[#161B2A] text-oxford-900 dark:text-white text-sm font-bold rounded-lg hover:bg-oxford-200 dark:hover:bg-oxford-800 transition-colors"
                            >
                                Ubah Foto
                            </button>
                            <button
                                onClick={handleRemovePhoto}
                                className="px-4 py-2 text-crimson-600 text-sm font-bold hover:bg-crimson-50 rounded-lg transition-colors"
                            >
                                Hapus
                            </button>
                        </div>
                        <p className="text-xs text-oxford-500 dark:text-oxford-400">JPG, GIF, atau PNG maksimal 2MB.</p>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/jpeg,image/png,image/gif"
                            onChange={handlePhotoChange}
                            className="hidden"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-bold text-oxford-900 dark:text-white mb-2" htmlFor="name">Nama Lengkap</label>
                        <input
                            type="text"
                            id="name"
                            name="name"
                            autoComplete="name"
                            value={formData.name}
                            onChange={e => setFormData(f => ({ ...f, name: e.target.value }))}
                            className="w-full px-4 py-3 bg-white dark:bg-[#161B2A] border border-oxford-200 dark:border-oxford-700 rounded-xl focus:outline-none focus:border-gold-500 focus:ring-4 focus:ring-gold-500/10 transition-all font-sans text-oxford-900 dark:text-white"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-oxford-900 dark:text-white mb-2" htmlFor="email">Email Kedinasan</label>
                        <input
                            type="email"
                            id="email"
                            name="email"
                            autoComplete="email"
                            value={formData.email}
                            disabled
                            className="w-full px-4 py-3 bg-oxford-50 dark:bg-oxford-950 border border-oxford-200 dark:border-oxford-700 rounded-xl focus:outline-none text-oxford-500 dark:text-oxford-400 cursor-not-allowed font-sans"
                        />
                        <p className="text-xs text-oxford-400 mt-1">Hubungi admin untuk mengubah email.</p>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-oxford-900 dark:text-white mb-2" htmlFor="nip">NIP / ID Pegawai</label>
                        <input
                            type="text"
                            id="nip"
                            name="nip"
                            autoComplete="username"
                            value={formData.nip}
                            onChange={e => setFormData(f => ({ ...f, nip: e.target.value }))}
                            className="w-full px-4 py-3 bg-oxford-50 dark:bg-oxford-950 border border-oxford-200 dark:border-oxford-700 rounded-xl focus:outline-none text-oxford-700 dark:text-oxford-200 font-sans font-mono cursor-not-allowed"
                            disabled
                        />
                        <p className="text-xs text-oxford-400 mt-1">NIP bersifat tetap dan digunakan sebagai username.</p>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-oxford-900 dark:text-white mb-2" htmlFor="instansiAsal">Instansi Asal</label>
                        <input
                            type="text"
                            id="instansiAsal"
                            name="instansiAsal"
                            autoComplete="organization"
                            value={formData.instansiAsal}
                            onChange={e => setFormData(f => ({ ...f, instansiAsal: e.target.value }))}
                            className="w-full px-4 py-3 bg-white dark:bg-[#161B2A] border border-oxford-200 dark:border-oxford-700 rounded-xl focus:outline-none focus:border-gold-500 focus:ring-4 focus:ring-gold-500/10 transition-all font-sans text-oxford-900 dark:text-white"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-oxford-900 dark:text-white mb-2" htmlFor="pangkat">Pangkat / Golongan</label>
                        <select
                            id="pangkat"
                            name="pangkat"
                            autoComplete="honorific-prefix"
                            value={formData.pangkat}
                            onChange={e => setFormData(f => ({ ...f, pangkat: e.target.value }))}
                            className="w-full px-4 py-3 bg-white dark:bg-[#161B2A] border border-oxford-200 dark:border-oxford-700 rounded-xl focus:outline-none focus:border-gold-500 focus:ring-4 focus:ring-gold-500/10 transition-all font-sans text-oxford-900 dark:text-white"
                        >
                            <option value="">Pilih Pangkat/Golongan</option>
                            {PANGKAT_GOLONGAN.map(p => (
                                <option key={p} value={p}>{p}</option>
                            ))}
                        </select>
                        <p className="text-xs text-oxford-400 mt-1">Data ini akan tampil di sertifikat Anda.</p>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-oxford-900 dark:text-white mb-2" htmlFor="jabatan">Jabatan</label>
                        <input
                            type="text"
                            id="jabatan"
                            name="jabatan"
                            autoComplete="organization-title"
                            value={formData.jabatan}
                            onChange={e => setFormData(f => ({ ...f, jabatan: e.target.value }))}
                            placeholder="cth: Analis Kebijakan Ahli Pertama"
                            className="w-full px-4 py-3 bg-white dark:bg-[#161B2A] border border-oxford-200 dark:border-oxford-700 rounded-xl focus:outline-none focus:border-gold-500 focus:ring-4 focus:ring-gold-500/10 transition-all font-sans text-oxford-900 dark:text-white"
                        />
                        <p className="text-xs text-oxford-400 mt-1">Data ini akan tampil di sertifikat Anda.</p>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-oxford-900 dark:text-white mb-2" htmlFor="tempatLahir">Tempat Lahir</label>
                        <input
                            type="text"
                            id="tempatLahir"
                            name="tempatLahir"
                            value={formData.tempatLahir}
                            onChange={e => setFormData(f => ({ ...f, tempatLahir: e.target.value }))}
                            placeholder="cth: Tanjung Selor"
                            className="w-full px-4 py-3 bg-white dark:bg-[#161B2A] border border-oxford-200 dark:border-oxford-700 rounded-xl focus:outline-none focus:border-gold-500 focus:ring-4 focus:ring-gold-500/10 transition-all font-sans text-oxford-900 dark:text-white"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-oxford-900 dark:text-white mb-2" htmlFor="tanggalLahir">Tanggal Lahir</label>
                        <input
                            type="text"
                            id="tanggalLahir"
                            name="tanggalLahir"
                            autoComplete="bday"
                            value={formData.tanggalLahir}
                            onChange={e => setFormData(f => ({ ...f, tanggalLahir: e.target.value }))}
                            placeholder="cth: 15 Mei 1985"
                            className="w-full px-4 py-3 bg-white dark:bg-[#161B2A] border border-oxford-200 dark:border-oxford-700 rounded-xl focus:outline-none focus:border-gold-500 focus:ring-4 focus:ring-gold-500/10 transition-all font-sans text-oxford-900 dark:text-white"
                        />
                    </div>
                </div>

                <div className="pt-6 border-t border-oxford-100 dark:border-oxford-800 flex justify-end gap-4">
                    <button className="px-6 py-2.5 text-sm font-bold text-oxford-600 dark:text-oxford-300 hover:bg-oxford-50 dark:hover:bg-oxford-950 rounded-lg transition-colors">Batal</button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="px-6 py-2.5 bg-gold-500 hover:bg-gold-400 text-oxford-950 text-sm font-bold rounded-lg transition-colors shadow-sm flex items-center gap-2 disabled:opacity-60"
                    >
                        {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                        {saving ? "Menyimpan..." : "Simpan Perubahan"}
                    </button>
                </div>

            </div>
        </>
    );
}

// ===== SECURITY TAB =====

function SecurityTab({ userId, onNotify }: { userId: string; onNotify: (type: "success" | "error", msg: string) => void }) {
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [saving, setSaving] = useState(false);

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!currentPassword) {
            onNotify("error", "Masukkan password lama.");
            return;
        }
        if (newPassword.length < 6) {
            onNotify("error", "Password baru minimal 6 karakter.");
            return;
        }
        if (newPassword !== confirmPassword) {
            onNotify("error", "Konfirmasi password tidak cocok.");
            return;
        }

        setSaving(true);
        const res = await changePassword(userId, currentPassword, newPassword);
        setSaving(false);

        if (res.success) {
            // Clear form
            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");
            onNotify("success", "Password berhasil diubah.");
        } else {
            onNotify("error", res.error || "Gagal mengubah password.");
        }
    };

    // Password strength indicator
    const getPasswordStrength = (pwd: string) => {
        if (!pwd) return { level: 0, label: "", color: "" };
        let score = 0;
        if (pwd.length >= 6) score++;
        if (pwd.length >= 10) score++;
        if (/[A-Z]/.test(pwd)) score++;
        if (/[0-9]/.test(pwd)) score++;
        if (/[^A-Za-z0-9]/.test(pwd)) score++;

        if (score <= 1) return { level: 1, label: "Lemah", color: "bg-crimson-500" };
        if (score <= 3) return { level: 2, label: "Sedang", color: "bg-gold-500" };
        return { level: 3, label: "Kuat", color: "bg-emerald-500" };
    };

    const strength = getPasswordStrength(newPassword);

    return (
        <>
            <div className="p-6 border-b border-oxford-200 dark:border-oxford-700 bg-oxford-50 dark:bg-oxford-950/50">
                <h2 className="text-xl font-bold text-oxford-900 dark:text-white">Keamanan & Password</h2>
                <p className="text-sm text-oxford-500 dark:text-oxford-400">Ubah password akun Anda secara berkala untuk menjaga keamanan.</p>
            </div>

            <form onSubmit={handleChangePassword} className="p-6 space-y-6">

                <div>
                    <label className="block text-sm font-bold text-oxford-900 dark:text-white mb-2">Password Lama</label>
                    <div className="relative">
                        <input
                            type={showCurrent ? "text" : "password"}
                            value={currentPassword}
                            onChange={e => setCurrentPassword(e.target.value)}
                            placeholder="Masukkan password saat ini"
                            className="w-full px-4 py-3 pr-10 border border-oxford-200 dark:border-oxford-700 rounded-xl text-sm focus:outline-none focus:border-gold-500 focus:ring-4 focus:ring-gold-500/10 transition-all text-oxford-900 dark:text-white"
                        />
                        <button type="button" onClick={() => setShowCurrent(!showCurrent)} className="absolute right-3 top-1/2 -translate-y-1/2 text-oxford-400 hover:text-oxford-600 dark:hover:text-oxford-300">
                            {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-bold text-oxford-900 dark:text-white mb-2">Password Baru</label>
                    <div className="relative">
                        <input
                            type={showNew ? "text" : "password"}
                            value={newPassword}
                            onChange={e => setNewPassword(e.target.value)}
                            placeholder="Minimal 6 karakter"
                            className="w-full px-4 py-3 pr-10 border border-oxford-200 dark:border-oxford-700 rounded-xl text-sm focus:outline-none focus:border-gold-500 focus:ring-4 focus:ring-gold-500/10 transition-all text-oxford-900 dark:text-white"
                        />
                        <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 top-1/2 -translate-y-1/2 text-oxford-400 hover:text-oxford-600 dark:hover:text-oxford-300">
                            {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                    </div>
                    {newPassword && (
                        <div className="mt-2 flex items-center gap-2">
                            <div className="flex gap-1 flex-1">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${i <= strength.level ? strength.color : "bg-oxford-100 dark:bg-[#161B2A]"}`} />
                                ))}
                            </div>
                            <span className={`text-xs font-bold ${strength.level === 1 ? "text-crimson-600" : strength.level === 2 ? "text-gold-600" : "text-emerald-600"}`}>
                                {strength.label}
                            </span>
                        </div>
                    )}
                </div>

                <div>
                    <label className="block text-sm font-bold text-oxford-900 dark:text-white mb-2">Konfirmasi Password Baru</label>
                    <div className="relative">
                        <input
                            type={showConfirm ? "text" : "password"}
                            value={confirmPassword}
                            onChange={e => setConfirmPassword(e.target.value)}
                            placeholder="Ketik ulang password baru"
                            className={`w-full px-4 py-3 pr-10 border rounded-xl text-sm focus:outline-none focus:ring-4 transition-all text-oxford-900 dark:text-white ${confirmPassword && confirmPassword !== newPassword
                                ? "border-crimson-300 focus:border-crimson-500 focus:ring-crimson-500/10"
                                : confirmPassword && confirmPassword === newPassword
                                    ? "border-emerald-300 focus:border-emerald-500 focus:ring-emerald-500/10"
                                    : "border-oxford-200 dark:border-oxford-700 focus:border-gold-500 focus:ring-gold-500/10"
                                }`}
                        />
                        <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-oxford-400 hover:text-oxford-600 dark:hover:text-oxford-300">
                            {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                    </div>
                    {confirmPassword && confirmPassword !== newPassword && (
                        <p className="text-xs text-crimson-600 mt-1">Password tidak cocok.</p>
                    )}
                    {confirmPassword && confirmPassword === newPassword && (
                        <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1"><Check size={12} /> Password cocok.</p>
                    )}
                </div>

                <div className="pt-6 border-t border-oxford-100 dark:border-oxford-800 flex justify-end gap-4">
                    <button type="button" onClick={() => { setCurrentPassword(""); setNewPassword(""); setConfirmPassword(""); }} className="px-6 py-2.5 text-sm font-bold text-oxford-600 dark:text-oxford-300 hover:bg-oxford-50 dark:hover:bg-oxford-950 rounded-lg transition-colors">
                        Batal
                    </button>
                    <button
                        type="submit"
                        disabled={saving || !currentPassword || !newPassword || newPassword !== confirmPassword}
                        className="px-6 py-2.5 bg-gold-500 hover:bg-gold-400 text-oxford-950 text-sm font-bold rounded-lg transition-colors shadow-sm flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        {saving ? <Loader2 size={16} className="animate-spin" /> : <Shield size={16} />}
                        {saving ? "Menyimpan..." : "Ubah Password"}
                    </button>
                </div>

            </form>
        </>
    );
}

// ===== NOTIFICATIONS TAB =====

function NotificationsTab({ userId, onNotify }: { userId: string; onNotify: (type: "success" | "error", msg: string) => void }) {
    const [settings, setSettings] = useState({
        courseUpdates: true,
        newCourses: true,
        assignments: true,
        certificates: true,
        systemAnnouncements: false,
        weeklyDigest: true,
    });
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchSettings = async () => {
            const data = await getNotificationPreferences(userId);
            if (data) setSettings(data);
            setLoading(false);
        };
        fetchSettings();
    }, [userId]);

    const toggleSetting = (key: keyof typeof settings) => {
        setSettings(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const handleSave = async () => {
        setSaving(true);
        const res = await updateNotificationPreferences(userId, settings);
        setSaving(false);
        
        if (res.success) {
            onNotify("success", "Pengaturan notifikasi berhasil disimpan.");
        } else {
            onNotify("error", res.error || "Gagal menyimpan pengaturan.");
        }
    };

    if (loading) {
        return (
            <div className="p-12 flex flex-col items-center justify-center text-oxford-400">
                <Loader2 size={32} className="animate-spin mb-4" />
                <p>Memuat pengaturan...</p>
            </div>
        );
    }

    const notifItems: { key: keyof typeof settings; label: string; description: string }[] = [
        { key: "courseUpdates", label: "Update Kursus", description: "Notifikasi saat ada pembaruan materi pada kursus yang Anda ikuti." },
        { key: "newCourses", label: "Kursus Baru", description: "Pemberitahuan saat ada kursus baru yang sesuai dengan minat Anda." },
        { key: "assignments", label: "Pengingat Tugas", description: "Notifikasi saat ada tugas, kuis, atau deadline yang mendekat." },
        { key: "certificates", label: "Sertifikat", description: "Notifikasi saat sertifikat Anda siap diunduh." },
        { key: "systemAnnouncements", label: "Pengumuman Sistem", description: "Pembaruan terkait pemeliharaan atau perubahan kebijakan platform." },
        { key: "weeklyDigest", label: "Ringkasan Mingguan", description: "Email rangkuman aktivitas belajar Anda setiap minggu." },
    ];

    return (
        <>
            <div className="p-6 border-b border-oxford-200 dark:border-oxford-700 bg-oxford-50 dark:bg-oxford-950/50">
                <h2 className="text-xl font-bold text-oxford-900 dark:text-white">Notifikasi Email</h2>
                <p className="text-sm text-oxford-500 dark:text-oxford-400">Kelola preferensi notifikasi email yang Anda terima dari CorpuKU.</p>
            </div>

            <div className="p-6 space-y-1">
                {notifItems.map(item => (
                    <div key={item.key} className="flex items-center justify-between p-4 rounded-xl hover:bg-oxford-50 dark:hover:bg-oxford-950/50 transition-colors">
                        <div className="flex-1 mr-4">
                            <p className="text-sm font-bold text-oxford-900 dark:text-white">{item.label}</p>
                            <p className="text-xs text-oxford-500 dark:text-oxford-400 mt-0.5">{item.description}</p>
                        </div>
                        <button
                            onClick={() => toggleSetting(item.key)}
                            className={`relative w-12 h-7 rounded-full transition-colors ${settings[item.key] ? "bg-gold-500" : "bg-oxford-200 dark:bg-oxford-800"}`}
                        >
                            <div className={`absolute top-0.5 w-6 h-6 bg-white dark:bg-[#161B2A] rounded-full shadow-sm transition-transform ${settings[item.key] ? "translate-x-5" : "translate-x-0.5"}`} />
                        </button>
                    </div>
                ))}

                <div className="pt-6 border-t border-oxford-100 dark:border-oxford-800 flex justify-end gap-4 mt-4">
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="px-6 py-2.5 bg-gold-500 hover:bg-gold-400 text-oxford-950 text-sm font-bold rounded-lg transition-colors shadow-sm flex items-center gap-2 disabled:opacity-60"
                    >
                        {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                        {saving ? "Menyimpan..." : "Simpan Perubahan"}
                    </button>
                </div>
            </div>
        </>
    );
}

// ===== PREFERENCES TAB =====

function PreferencesTab({ onNotify }: { onNotify: (type: "success" | "error", msg: string) => void }) {
    const { theme, setTheme } = useTheme();
    type Preferences = {
        theme: "light" | "dark" | "system";
        language: "id" | "en";
        autoplay: boolean;
        highContrast: boolean;
    };
    const [prefs, setPrefs] = useState<Preferences>(() => {
        const defaults: Preferences = {
            theme,
            language: "id",
            autoplay: true,
            highContrast: false,
        };
        if (typeof window === "undefined") return defaults;
        const stored = localStorage.getItem("corpuku_preferences");
        if (!stored) return defaults;
        try {
            const parsed: unknown = JSON.parse(stored);
            if (!parsed || typeof parsed !== "object") return defaults;
            const value = parsed as Partial<Preferences>;
            return {
                theme: value.theme === "light" || value.theme === "dark" || value.theme === "system" ? value.theme : defaults.theme,
                language: value.language === "en" ? "en" : "id",
                autoplay: typeof value.autoplay === "boolean" ? value.autoplay : defaults.autoplay,
                highContrast: typeof value.highContrast === "boolean" ? value.highContrast : defaults.highContrast,
            };
        } catch {
            return defaults;
        }
    });
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        setSaving(true);
        await new Promise(r => setTimeout(r, 600));

        // Sync with Theme Provider
        setTheme(prefs.theme);

        // Persist to localStorage
        if (typeof window !== "undefined") {
            localStorage.setItem("corpuku_preferences", JSON.stringify(prefs));
            localStorage.setItem("corpuku-theme", prefs.theme);
        }

        setSaving(false);
        onNotify("success", "Preferensi sistem berhasil disimpan.");
    };

    return (
        <>
            <div className="p-6 border-b border-oxford-200 dark:border-oxford-700 bg-oxford-50 dark:bg-oxford-950/50">
                <h2 className="text-xl font-bold text-oxford-900 dark:text-white">Preferensi Sistem</h2>
                <p className="text-sm text-oxford-500 dark:text-oxford-400">Sesuaikan tampilan dan perilaku CorpuKU sesuai kenyamanan Anda.</p>
            </div>

            <div className="p-6 space-y-8">

                {/* Theme */}
                <div>
                    <label className="block text-sm font-bold text-oxford-900 dark:text-white mb-3">Tema Tampilan</label>
                    <div className="grid grid-cols-3 gap-3">
                        {([
                            { key: "light", icon: <Sun size={18} />, label: "Terang" },
                            { key: "dark", icon: <Moon size={18} />, label: "Gelap" },
                            { key: "system", icon: <SettingsIcon size={18} />, label: "Sistem" },
                        ] as const).map(opt => (
                            <button
                                key={opt.key}
                                onClick={() => setPrefs(p => ({ ...p, theme: opt.key }))}
                                className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border text-sm font-bold transition-all ${prefs.theme === opt.key
                                    ? "bg-oxford-900 text-white border-oxford-900 shadow-md"
                                    : "bg-white dark:bg-[#161B2A] text-oxford-700 dark:text-oxford-200 border-oxford-200 dark:border-oxford-700 hover:border-gold-500"
                                    }`}
                            >
                                {opt.icon} {opt.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Language */}
                <div>
                    <label className="block text-sm font-bold text-oxford-900 dark:text-white mb-3">Bahasa</label>
                    <div className="grid grid-cols-2 gap-3">
                        {([
                            { key: "id", label: "Bahasa Indonesia", flag: "🇮🇩" },
                            { key: "en", label: "English", flag: "🇬🇧" },
                        ] as const).map(opt => (
                            <button
                                key={opt.key}
                                onClick={() => setPrefs(p => ({ ...p, language: opt.key }))}
                                className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-bold transition-all ${prefs.language === opt.key
                                    ? "bg-oxford-900 text-white border-oxford-900 shadow-md"
                                    : "bg-white dark:bg-[#161B2A] text-oxford-700 dark:text-oxford-200 border-oxford-200 dark:border-oxford-700 hover:border-gold-500"
                                    }`}
                            >
                                <span className="text-lg">{opt.flag}</span> {opt.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Toggle Options */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 rounded-xl border border-oxford-100 dark:border-oxford-800">
                        <div>
                            <p className="text-sm font-bold text-oxford-900 dark:text-white">Autoplay Video</p>
                            <p className="text-xs text-oxford-500 dark:text-oxford-400">Video materi otomatis diputar saat membuka pelajaran.</p>
                        </div>
                        <button
                            onClick={() => setPrefs(p => ({ ...p, autoplay: !p.autoplay }))}
                            className={`relative w-12 h-7 rounded-full transition-colors ${prefs.autoplay ? "bg-gold-500" : "bg-oxford-200 dark:bg-oxford-800"}`}
                        >
                            <div className={`absolute top-0.5 w-6 h-6 bg-white dark:bg-[#161B2A] rounded-full shadow-sm transition-transform ${prefs.autoplay ? "translate-x-5" : "translate-x-0.5"}`} />
                        </button>
                    </div>

                    <div className="flex items-center justify-between p-4 rounded-xl border border-oxford-100 dark:border-oxford-800">
                        <div>
                            <p className="text-sm font-bold text-oxford-900 dark:text-white">Kontras Tinggi</p>
                            <p className="text-xs text-oxford-500 dark:text-oxford-400">Meningkatkan kontras teks untuk aksesibilitas yang lebih baik.</p>
                        </div>
                        <button
                            onClick={() => setPrefs(p => ({ ...p, highContrast: !p.highContrast }))}
                            className={`relative w-12 h-7 rounded-full transition-colors ${prefs.highContrast ? "bg-gold-500" : "bg-oxford-200 dark:bg-oxford-800"}`}
                        >
                            <div className={`absolute top-0.5 w-6 h-6 bg-white dark:bg-[#161B2A] rounded-full shadow-sm transition-transform ${prefs.highContrast ? "translate-x-5" : "translate-x-0.5"}`} />
                        </button>
                    </div>
                </div>

                <div className="pt-6 border-t border-oxford-100 dark:border-oxford-800 flex justify-end gap-4">
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="px-6 py-2.5 bg-gold-500 hover:bg-gold-400 text-oxford-950 text-sm font-bold rounded-lg transition-colors shadow-sm flex items-center gap-2 disabled:opacity-60"
                    >
                        {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                        {saving ? "Menyimpan..." : "Simpan Perubahan"}
                    </button>
                </div>

            </div>
        </>
    );
}
