"use client";

import { useState, useEffect, useMemo } from "react";
import { UserCheck, Shield, Plus, Trash2, Search, Check, Loader2, Users, AlertCircle, Info } from "lucide-react";
import {
  getCourseStaff,
  assignCourseStaff,
  removeCourseStaff,
  searchPotentialStaffUsers,
  CourseStaffMember,
  CourseStaffRole,
} from "@/app/actions/course-staff";
import { showToast } from "@/lib/toast";

interface CourseStaffManagerProps {
  courseId: string;
  courseTitle: string;
}

export default function CourseStaffManager({ courseId, courseTitle }: CourseStaffManagerProps) {
  const [loading, setLoading] = useState(true);
  const [managers, setManagers] = useState<CourseStaffMember[]>([]);
  const [officers, setOfficers] = useState<CourseStaffMember[]>([]);

  // Search state for adding staff
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedRole, setSelectedRole] = useState<CourseStaffRole>("class_officer");
  const [isAdding, setIsAdding] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const loadStaff = async () => {
    setLoading(true);
    const res = await getCourseStaff(courseId);
    if (res.success) {
      setManagers(res.managers);
      setOfficers(res.officers);
    } else {
      showToast.error("Gagal Memuat Staf", res.error || "Gagal memuat tim pengelola kelas.");
    }
    setLoading(false);
  };

  useEffect(() => {
    loadStaff();
  }, [courseId]);

  // Debounce search potential staff users
  useEffect(() => {
    if (!isAdding) return;
    const timer = setTimeout(async () => {
      setIsSearching(true);
      const results = await searchPotentialStaffUsers(searchQuery);
      setSearchResults(results);
      setIsSearching(false);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery, isAdding]);

  const assignedUserIds = useMemo(() => {
    return new Set([...managers.map((m) => m.userId), ...officers.map((o) => o.userId)]);
  }, [managers, officers]);

  const handleAssign = async (userId: string) => {
    setActionLoadingId(userId);
    try {
      const res = await assignCourseStaff({
        courseId,
        userId,
        role: selectedRole,
      });

      if (res.success) {
        showToast.success(
          "Penugasan Berhasil",
          selectedRole === "course_manager"
            ? "Pengguna berhasil ditugaskan sebagai Manejer Kelas."
            : "Pengguna berhasil ditugaskan sebagai Pengurus Kelas."
        );
        await loadStaff();
        setSearchQuery("");
      } else {
        showToast.error("Gagal Menugaskan", res.error || "Gagal menugaskan pengguna.");
      }
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRemove = async (member: CourseStaffMember) => {
    if (!confirm(`Cabut penugasan ${member.name} dari ${member.role === "course_manager" ? "Manejer Kelas" : "Pengurus Kelas"}?`)) {
      return;
    }

    setActionLoadingId(member.id);
    try {
      const res = await removeCourseStaff({
        courseId,
        userId: member.userId,
        role: member.role,
      });

      if (res.success) {
        showToast.success("Penugasan Dicabut", "Staf berhasil dikeluarkan dari tim kelas.");
        await loadStaff();
      } else {
        showToast.error("Gagal Mencabut", res.error || "Gagal mencabut penugasan.");
      }
    } finally {
      setActionLoadingId(null);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center bg-white dark:bg-[#161B2A] rounded-2xl border border-oxford-200 dark:border-oxford-800">
        <Loader2 className="animate-spin text-gold-500 mx-auto mb-2" size={28} />
        <p className="text-xs text-oxford-500">Memuat tim pengelola kelas...</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-[#161B2A] rounded-2xl border border-oxford-200 dark:border-oxford-800 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-oxford-100 dark:border-oxford-800/80 bg-oxford-50/50 dark:bg-oxford-950/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-oxford-900 dark:text-white flex items-center gap-2">
            <Users size={18} className="text-gold-500" />
            Tim Pengelola & Panitia Penyelenggara Kelas
          </h3>
          <p className="text-xs text-oxford-500 dark:text-oxford-400 mt-0.5">
            Tugaskan Manejer Kelas (PIC Utama) dan Pengurus Kelas (Panitia Presensi) khusus untuk pelatihan ini.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setIsAdding(!isAdding);
            if (!isAdding) setSearchQuery("");
          }}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
            isAdding
              ? "bg-oxford-200 dark:bg-oxford-800 text-oxford-800 dark:text-oxford-200 hover:bg-oxford-300"
              : "bg-gold-500 hover:bg-gold-400 text-oxford-950 shadow-sm"
          }`}
        >
          {isAdding ? "Tutup Form Tambah" : <><Plus size={15} /> Tambah Personil Tim</>}
        </button>
      </div>

      {/* Form Tambah Personil */}
      {isAdding && (
        <div className="p-6 bg-gold-50/40 dark:bg-gold-950/20 border-b border-gold-200/80 dark:border-gold-800/50 space-y-4 animate-in fade-in duration-150">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h4 className="text-xs font-bold text-oxford-900 dark:text-white">Pilih Peran Penugasan:</h4>
              <p className="text-[11px] text-oxford-500 dark:text-oxford-400">
                Pilih apakah personil bertindak sebagai Manejer (pengelola materi/kelulusan) atau Pengurus (operasional presensi).
              </p>
            </div>

            <div className="inline-flex rounded-xl p-1 bg-white dark:bg-oxford-900 border border-oxford-200 dark:border-oxford-700">
              <button
                type="button"
                onClick={() => setSelectedRole("course_manager")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  selectedRole === "course_manager"
                    ? "bg-gold-500 text-oxford-950 shadow-xs"
                    : "text-oxford-600 dark:text-oxford-400 hover:text-oxford-900"
                }`}
              >
                👑 Manejer Kelas (PIC)
              </button>
              <button
                type="button"
                onClick={() => setSelectedRole("class_officer")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  selectedRole === "class_officer"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "text-oxford-600 dark:text-oxford-400 hover:text-oxford-900"
                }`}
              >
                📋 Pengurus Kelas (Panitia)
              </button>
            </div>
          </div>

          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-oxford-400" size={16} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama pegawai, NIP, email, atau jabatan..."
              className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-oxford-900 border border-oxford-200 dark:border-oxford-700 rounded-xl text-xs font-sans text-oxford-900 dark:text-white focus:outline-none focus:border-gold-500"
            />
            {isSearching && (
              <Loader2 className="absolute right-3.5 top-1/2 -translate-y-1/2 animate-spin text-oxford-400" size={16} />
            )}
          </div>

          {/* Search Results List */}
          <div className="max-h-56 overflow-y-auto space-y-1.5 rounded-xl border border-oxford-200/80 dark:border-oxford-800 bg-white dark:bg-[#161B2A] p-2">
            {searchResults.length === 0 ? (
              <div className="p-4 text-center text-xs text-oxford-400">
                {isSearching ? "Mencari pengguna..." : "Tidak ada pengguna ditemukan dengan kata kunci tersebut."}
              </div>
            ) : (
              searchResults.map((u) => {
                const isAssigned = assignedUserIds.has(u.id);
                const isActionLoading = actionLoadingId === u.id;

                return (
                  <div
                    key={u.id}
                    className="p-2.5 rounded-xl hover:bg-oxford-50 dark:hover:bg-oxford-900/60 transition-colors flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-oxford-900 dark:text-white truncate">{u.name}</span>
                        {u.nip && (
                          <span className="px-1.5 py-0.2 bg-oxford-100 dark:bg-oxford-800 text-[10px] font-mono text-oxford-600 dark:text-oxford-300 rounded">
                            {u.nip}
                          </span>
                        )}
                        <span className="text-[10px] text-oxford-400 capitalize">({u.role})</span>
                      </div>
                      <p className="text-[11px] text-oxford-500 dark:text-oxford-400 truncate">
                        {[u.jabatan, u.instansiAsal, u.email].filter(Boolean).join(" • ")}
                      </p>
                    </div>

                    <button
                      type="button"
                      disabled={isAssigned || isActionLoading}
                      onClick={() => handleAssign(u.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 flex items-center gap-1 ${
                        isAssigned
                          ? "bg-oxford-100 dark:bg-oxford-800 text-oxford-400 cursor-not-allowed"
                          : selectedRole === "course_manager"
                          ? "bg-gold-500 hover:bg-gold-400 text-oxford-950 shadow-xs"
                          : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs"
                      }`}
                    >
                      {isActionLoading ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : isAssigned ? (
                        <Check size={13} />
                      ) : (
                        <Plus size={13} />
                      )}
                      <span>{isAssigned ? "Sudah Terdaftar" : `Tugaskan sbg ${selectedRole === "course_manager" ? "Manejer" : "Pengurus"}`}</span>
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Daftar Anggota Tim Terdaftar */}
      <div className="p-6 space-y-6">
        {/* Seksi 1: Manejer Kelas */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-oxford-500 dark:text-oxford-400 flex items-center gap-1.5">
              <span>👑</span>
              <span>Manejer Kelas (PIC Utama) &mdash; {managers.length} Orang</span>
            </h4>
          </div>

          {managers.length === 0 ? (
            <div className="p-4 rounded-xl border border-dashed border-oxford-200 dark:border-oxford-800 bg-oxford-50/50 dark:bg-oxford-950/30 text-xs text-oxford-400 flex items-center gap-2">
              <Info size={16} className="text-oxford-400 shrink-0" />
              <span>Belum ada Manejer Kelas yang ditugaskan. Admin sistem saat ini bertindak sebagai PIC utama kelas.</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {managers.map((m) => (
                <div
                  key={m.id}
                  className="p-3.5 rounded-xl border border-gold-300/80 dark:border-gold-800/60 bg-gold-50/40 dark:bg-gold-950/20 flex items-center justify-between gap-3 shadow-2xs"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-xs text-oxford-900 dark:text-white truncate">{m.name}</span>
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-gold-200 dark:bg-gold-900/80 text-gold-950 dark:text-gold-200">
                        PIC Utama
                      </span>
                    </div>
                    <p className="text-[11px] text-oxford-500 dark:text-oxford-400 truncate">
                      {[m.nip, m.jabatan, m.instansiAsal].filter(Boolean).join(" • ")}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemove(m)}
                    disabled={actionLoadingId === m.id}
                    title="Cabut Penugasan"
                    className="p-1.5 rounded-lg text-crimson-600 dark:text-crimson-400 hover:bg-crimson-50 dark:hover:bg-crimson-950/50 transition-colors shrink-0"
                  >
                    {actionLoadingId === m.id ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Seksi 2: Pengurus Kelas */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-oxford-500 dark:text-oxford-400 flex items-center gap-1.5">
              <span>📋</span>
              <span>Pengurus Kelas (Panitia Penyelenggara) &mdash; {officers.length} Orang</span>
            </h4>
          </div>

          {officers.length === 0 ? (
            <div className="p-4 rounded-xl border border-dashed border-oxford-200 dark:border-oxford-800 bg-oxford-50/50 dark:bg-oxford-950/30 text-xs text-oxford-400 flex items-center gap-2">
              <Info size={16} className="text-oxford-400 shrink-0" />
              <span>Belum ada Pengurus Kelas yang ditugaskan. Klik tombol "Tambah Personil Tim" di atas untuk menambahkan panitia.</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {officers.map((o) => (
                <div
                  key={o.id}
                  className="p-3.5 rounded-xl border border-emerald-300/80 dark:border-emerald-800/60 bg-emerald-50/40 dark:bg-emerald-950/20 flex items-center justify-between gap-3 shadow-2xs"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-xs text-oxford-900 dark:text-white truncate">{o.name}</span>
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200">
                        Panitia
                      </span>
                    </div>
                    <p className="text-[11px] text-oxford-500 dark:text-oxford-400 truncate">
                      {[o.nip, o.jabatan, o.instansiAsal].filter(Boolean).join(" • ")}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemove(o)}
                    disabled={actionLoadingId === o.id}
                    title="Cabut Penugasan"
                    className="p-1.5 rounded-lg text-crimson-600 dark:text-crimson-400 hover:bg-crimson-50 dark:hover:bg-crimson-950/50 transition-colors shrink-0"
                  >
                    {actionLoadingId === o.id ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
