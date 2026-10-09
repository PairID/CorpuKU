"use client";

import { getCertificateSettings } from "@/app/actions/courses";
import { AdminSidebar } from "@/components/layout/AdminSidebar";
import CertificateAdminClient, { type CertificateSettings } from "./certificate-admin-client";
import { CertificateNumberingAdmin } from "./certificate-numbering-admin";
import { useState, useEffect } from "react";
import { Menu, FileText, Hash } from "lucide-react";
import Link from "next/link";

export default function AdminCertificatesPage() {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [settings, setSettings] = useState<CertificateSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeSection, setActiveSection] = useState<"template" | "numbering">("numbering");

    useEffect(() => {
        async function fetchSettings() {
            setLoading(true);
            try {
                const s = await getCertificateSettings();
                setSettings(s as CertificateSettings);
            } catch (err) {
                console.error(err);
            }
            setLoading(false);
        }
        fetchSettings();
    }, []);

    return (
        <div className="min-h-screen bg-oxford-50 dark:bg-oxford-950 flex font-sans">
            <AdminSidebar activePage="certificates" isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

            <main className="flex-1 flex flex-col min-h-screen relative">
                {/* Mobile sidebar toggle button (floating) */}
                <button 
                    onClick={() => setSidebarOpen(true)}
                    className="lg:hidden fixed bottom-6 right-6 z-40 p-4 bg-gold-500 text-oxford-950 rounded-full shadow-2xl hover:bg-gold-400 transition-all active:scale-95"
                >
                    <Menu size={24} />
                </button>

                <div className="p-6 md:p-8 lg:p-10 max-w-5xl">
                    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
                        <div>
                            <h2 className="text-2xl font-bold text-oxford-900 dark:text-white mb-2">Pengaturan Global Sertifikat</h2>
                            <p className="text-oxford-600 dark:text-oxford-300 font-sans">Konfigurasi nomor awal register, format naskah dinas resmi, dan desain template sertifikat.</p>
                        </div>
                        <Link href="/admin/certificates/issued" className="shrink-0 rounded-xl bg-oxford-900 px-4 py-3 text-sm font-bold text-white hover:bg-oxford-800 transition-colors">
                            Sertifikat Terbit
                        </Link>
                    </div>

                    {/* Section Switcher Tabs */}
                    <div className="flex items-center gap-2 mb-8 p-1.5 bg-oxford-100 dark:bg-oxford-900 rounded-2xl w-fit">
                        <button
                            type="button"
                            onClick={() => setActiveSection("numbering")}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                                activeSection === "numbering"
                                    ? "bg-white dark:bg-[#161B2A] text-oxford-900 dark:text-white shadow-sm"
                                    : "text-oxford-600 dark:text-oxford-400 hover:text-oxford-900 dark:hover:text-white"
                            }`}
                        >
                            <Hash size={15} className="text-gold-500" />
                            Format & Nomor Urut Global
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveSection("template")}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                                activeSection === "template"
                                    ? "bg-white dark:bg-[#161B2A] text-oxford-900 dark:text-white shadow-sm"
                                    : "text-oxford-600 dark:text-oxford-400 hover:text-oxford-900 dark:hover:text-white"
                            }`}
                        >
                            <FileText size={15} className="text-emerald-500" />
                            Desain & Layout Template
                        </button>
                    </div>

                    {activeSection === "numbering" ? (
                        <CertificateNumberingAdmin />
                    ) : (
                        loading ? (
                            <div className="flex items-center justify-center h-64">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold-500"></div>
                            </div>
                        ) : settings ? (
                            <CertificateAdminClient initialSettings={settings} />
                        ) : (
                            <p className="rounded-xl border border-crimson-200 bg-crimson-50 p-4 text-sm text-crimson-700">
                                Pengaturan sertifikat tidak dapat dimuat.
                            </p>
                        )
                    )}
                </div>
            </main>
        </div>
    );
}
