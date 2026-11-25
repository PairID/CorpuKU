"use client";

import { useState } from "react";
import {
  Building2,
  Plus,
  Search,
  Pencil,
  Trash2,
  Check,
  X,
  Users,
  Award,
  Loader2,
  Menu,
} from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { AdminSidebar } from "@/components/layout/AdminSidebar";
import {
  addMasterInstansi,
  renameMasterInstansi,
  deleteMasterInstansi,
  type MasterInstansiItem,
} from "@/app/actions/instansi";

export default function InstansiAdminClient({
  initialList,
}: {
  initialList: MasterInstansiItem[];
}) {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [items, setItems] = useState<MasterInstansiItem[]>(initialList);
  const [search, setSearch] = useState("");
  const [newName, setNewName] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  const [editingName, setEditingName] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [syncCertificates, setSyncCertificates] = useState(true);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [deletingName, setDeletingName] = useState<string | null>(null);

  const filtered = search.trim()
    ? items.filter((i) =>
        i.name.toLowerCase().includes(search.trim().toLowerCase())
      )
    : items;

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newName.trim();
    if (trimmed.length < 3 || isAdding) return;

    setIsAdding(true);
    const res = await addMasterInstansi(trimmed);
    setIsAdding(false);

    if (res.success) {
      toast.success(res.message);
      setItems((prev) =>
        [
          ...prev,
          { id: `temp_${Date.now()}`, name: trimmed, userCount: 0, certCount: 0 },
        ].sort((a, b) => a.name.localeCompare(b.name, "id"))
      );
      setNewName("");
      router.refresh();
    } else {
      toast.error(res.message);
    }
  };

  const startEdit = (item: MasterInstansiItem) => {
    setEditingName(item.name);
    setEditValue(item.name);
    setSyncCertificates(true);
  };

  const handleSaveEdit = async (oldName: string) => {
    const trimmedNew = editValue.trim();
    if (trimmedNew.length < 3 || isSavingEdit) return;
    if (trimmedNew === oldName) {
      setEditingName(null);
      return;
    }

    setIsSavingEdit(true);
    const res = await renameMasterInstansi(oldName, trimmedNew, syncCertificates);
    setIsSavingEdit(false);

    if (res.success) {
      toast.success(res.message);
      setItems((prev) => {
        const oldItem = prev.find((i) => i.name === oldName);
        const existingTarget = prev.find(
          (i) =>
            i.name.toLowerCase() === trimmedNew.toLowerCase() &&
            i.name !== oldName
        );
        if (existingTarget && oldItem) {
          return prev
            .filter((i) => i.name !== oldName)
            .map((i) =>
              i.name === existingTarget.name
                ? {
                    ...i,
                    userCount: i.userCount + oldItem.userCount,
                    certCount:
                      i.certCount + (syncCertificates ? oldItem.certCount : 0),
                  }
                : i
            );
        }
        return prev
          .map((i) => (i.name === oldName ? { ...i, name: trimmedNew } : i))
          .sort((a, b) => a.name.localeCompare(b.name, "id"));
      });
      setEditingName(null);
      router.refresh();
    } else {
      toast.error(res.message);
    }
  };

  const handleDelete = async (item: MasterInstansiItem) => {
    const ok = confirm(
      `Hapus "${item.name}" dari master daftar instansi?${
        item.userCount > 0
          ? `\n\nCatatan: ${item.userCount} pengguna masih menggunakan nama ini (profil pengguna tidak dihapus).`
          : ""
      }`
    );
    if (!ok) return;

    setDeletingName(item.name);
    const res = await deleteMasterInstansi(item.name);
    setDeletingName(null);

    if (res.success) {
      toast.success(res.message);
      setItems((prev) => prev.filter((i) => i.name !== item.name));
      router.refresh();
    } else {
      toast.error(res.message);
    }
  };

  return (
    <div className="min-h-screen bg-oxford-50 dark:bg-oxford-950 flex font-sans">
      <AdminSidebar
        activePage="instansi"
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <main className="flex-1 flex flex-col min-h-screen">
        <header className="h-16 bg-white dark:bg-[#161B2A] border-b border-oxford-200 dark:border-oxford-800 flex items-center justify-between px-4 md:px-8 sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg text-oxford-600 dark:text-oxford-300 hover:bg-oxford-100 dark:hover:bg-oxford-800"
              aria-label="Buka Menu"
            >
              <Menu size={20} />
            </button>
            <Building2 className="text-gold-500" size={22} />
            <h1 className="font-bold text-lg md:text-xl text-oxford-950 dark:text-white">
              Master Data Instansi / OPD
            </h1>
          </div>
          <span className="text-xs font-bold px-3 py-1 rounded-full bg-oxford-100 dark:bg-oxford-800 text-oxford-700 dark:text-oxford-200">
            {items.length} Instansi Terdaftar
          </span>
        </header>

        <div className="p-4 md:p-8 max-w-6xl mx-auto w-full space-y-6">
          {/* Tambah Instansi Baru */}
          <form
            onSubmit={handleAdd}
            className="bg-white dark:bg-[#161B2A] rounded-2xl border border-oxford-200 dark:border-oxford-800 p-5 shadow-xs space-y-3"
          >
            <div>
              <h2 className="text-sm font-bold text-oxford-950 dark:text-white">
                Tambah Nama Instansi Baru
              </h2>
              <p className="text-xs text-oxford-500 dark:text-oxford-400 mt-0.5">
                Instansi yang ditambahkan di sini akan langsung muncul pada kotak pencarian pendaftaran, profil pengguna, dan verifikasi kelas.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2.5">
              <input
                type="text"
                required
                minLength={3}
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Contoh: Universitas Merdeka / Dinas Komunikasi, Informatika, Statistik, dan Persandian"
                className="flex-1 px-4 py-2.5 bg-oxford-50 dark:bg-oxford-900/60 border border-oxford-200 dark:border-oxford-700 rounded-xl text-sm text-oxford-900 dark:text-white focus:outline-none focus:border-gold-500"
              />
              <button
                type="submit"
                disabled={isAdding || newName.trim().length < 3}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl flex items-center justify-center gap-2 shrink-0 disabled:opacity-50 transition-colors"
              >
                {isAdding ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Plus size={16} />
                )}
                <span>Tambahkan Instansi</span>
              </button>
            </div>
          </form>

          {/* Pencarian & Daftar Instansi */}
          <div className="bg-white dark:bg-[#161B2A] rounded-2xl border border-oxford-200 dark:border-oxford-800 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-oxford-100 dark:border-oxford-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <Search
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-oxford-400"
                />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cari nama instansi..."
                  className="w-full pl-10 pr-9 py-2 bg-oxford-50 dark:bg-oxford-900/60 border border-oxford-200 dark:border-oxford-700 rounded-xl text-sm text-oxford-900 dark:text-white focus:outline-none focus:border-gold-500"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-oxford-400 hover:text-oxford-600"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
              <div className="text-xs text-oxford-500 dark:text-oxford-400">
                Menampilkan <strong>{filtered.length}</strong> dari {items.length} instansi
              </div>
            </div>

            <div className="divide-y divide-oxford-100 dark:divide-oxford-800">
              {filtered.length === 0 ? (
                <div className="p-10 text-center text-sm text-oxford-500">
                  Tidak ada instansi yang cocok dengan pencarian.
                </div>
              ) : (
                filtered.map((item) => {
                  const isEditing = editingName === item.name;
                  return (
                    <div
                      key={item.id + item.name}
                      className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-oxford-50/50 dark:hover:bg-oxford-900/30 transition-colors"
                    >
                      {isEditing ? (
                        <div className="flex-1 space-y-2">
                          <input
                            type="text"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            className="w-full px-3.5 py-2 bg-white dark:bg-oxford-900 border-2 border-gold-500 rounded-xl text-sm font-medium text-oxford-950 dark:text-white focus:outline-none"
                            autoFocus
                          />
                          <label className="inline-flex items-center gap-2 text-xs text-oxford-600 dark:text-oxford-300 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={syncCertificates}
                              onChange={(e) => setSyncCertificates(e.target.checked)}
                              className="rounded border-oxford-300 accent-emerald-600"
                            />
                            <span>
                              Ikut perbarui nama instansi pada profil{" "}
                              <strong>{item.userCount} pengguna</strong> &amp;{" "}
                              <strong>{item.certCount} sertifikat terbit</strong>
                            </span>
                          </label>
                        </div>
                      ) : (
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-bold text-oxford-950 dark:text-white break-words">
                            {item.name}
                          </div>
                          <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-oxford-500 dark:text-oxford-400">
                            <span className="inline-flex items-center gap-1">
                              <Users size={13} /> {item.userCount} pengguna
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <Award size={13} /> {item.certCount} sertifikat
                            </span>
                          </div>
                        </div>
                      )}

                      <div className="flex items-center gap-2 shrink-0">
                        {isEditing ? (
                          <>
                            <button
                              type="button"
                              onClick={() => void handleSaveEdit(item.name)}
                              disabled={isSavingEdit || editValue.trim().length < 3}
                              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 disabled:opacity-50"
                            >
                              {isSavingEdit ? (
                                <Loader2 size={14} className="animate-spin" />
                              ) : (
                                <Check size={14} />
                              )}
                              Simpan
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingName(null)}
                              className="px-3 py-2 rounded-xl border border-oxford-200 dark:border-oxford-700 text-xs font-bold text-oxford-600 dark:text-oxford-300 hover:bg-oxford-100 dark:hover:bg-oxford-800"
                            >
                              Batal
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => startEdit(item)}
                              className="px-3 py-1.5 rounded-xl border border-oxford-200 dark:border-oxford-700 text-xs font-bold text-oxford-700 dark:text-oxford-200 hover:border-gold-500 hover:text-gold-600 flex items-center gap-1.5 transition-colors"
                            >
                              <Pencil size={13} /> Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleDelete(item)}
                              disabled={deletingName === item.name}
                              className="px-3 py-1.5 rounded-xl border border-rose-200 dark:border-rose-900/60 text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center gap-1.5 transition-colors disabled:opacity-50"
                            >
                              {deletingName === item.name ? (
                                <Loader2 size={13} className="animate-spin" />
                              ) : (
                                <Trash2 size={13} />
                              )}
                              Hapus
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
