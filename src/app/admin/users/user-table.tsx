"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import {
  Search,
  Mail,
  ShieldAlert,
  BadgeCheck,
  UserPlus,
  Users,
  Upload,
  KeyRound,
  Trash2,
  X,
  Check,
  AlertCircle,
  FileSpreadsheet,
  Download,
  RotateCcw,
  Eye,
  EyeOff,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  updateUserRole,
  createUser,
  createUsersBatch,
  resetPassword,
  resetPasswordToNip,
  deleteUser,
  type CreateUserInput,
  type BatchUserInput,
} from "@/app/actions/users";
import {
  createBatchJob,
  updateBatchJobProgress,
  finishBatchJob,
  getActiveBatchJobs,
  deleteBatchJob,
  type BatchJob,
} from "@/app/actions/batch";
import { useRouter } from "next/navigation";
import { PANGKAT_GOLONGAN } from "@/lib/constants";
import { exportExcel, parseSpreadsheet, type SpreadsheetRow } from "@/lib/excel-client";

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  nip: string;
  username: string;
  role: string;
  createdAt: Date;
}

type ModalType = "create" | "batch" | "reset-password" | null;

// ===== PROGRESS BANNER =====

function BatchProgressBanner({
  jobs,
  onRefresh,
}: {
  jobs: BatchJob[];
  onRefresh: () => void;
}) {
  if (jobs.length === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] w-full max-w-2xl px-4 animate-slide-up">
      {jobs.map((job) => {
        const percent = Math.round((job.processedItems / job.totalItems) * 100);
        return (
          <div
            key={job.id}
            className="bg-oxford-900 border border-oxford-800 rounded-2xl shadow-2xl p-4 sm:p-5 flex flex-col gap-4 text-white"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gold-500 text-oxford-950 rounded-xl flex items-center justify-center animate-pulse">
                  <RotateCcw className="animate-spin-slow" size={20} />
                </div>
                <div className="min-w-0">
                  <h4 className="font-bold text-sm truncate">
                    Memproses: {job.filename}
                  </h4>
                  <p className="text-[10px] text-oxford-400 font-medium">
                    Batch Upload {job.type === "users" ? "Pengguna" : job.type}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xl font-black text-gold-500">
                  {percent}%
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="h-1.5 w-full bg-oxford-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gold-500 transition-all duration-500 ease-out"
                  style={{ width: `${percent}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] font-bold uppercase tracking-wider">
                <div className="flex gap-4">
                  <span className="text-emerald-400">
                    {job.successCount} Berhasil
                  </span>
                  <span className="text-crimson-400">
                    {job.failureCount} Gagal
                  </span>
                </div>
                <span className="text-oxford-400">
                  {job.processedItems} / {job.totalItems} Data
                </span>
              </div>
            </div>

            {job.status === "completed" && (
              <div className="flex items-center justify-between pt-2 border-t border-oxford-800">
                <span className="text-xs text-emerald-400 font-bold flex items-center gap-1">
                  <Check size={14} /> Selesai! Klik segarkan untuk melihat data
                  baru.
                </span>
                <button
                  onClick={async () => {
                    await deleteBatchJob(job.id);
                    onRefresh();
                  }}
                  className="px-3 py-1 bg-white dark:bg-[#161B2A]/10 hover:bg-white dark:hover:bg-[#161B2A]/20 rounded-lg text-xs transition-colors"
                >
                  Tutup
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ===== MAIN COMPONENT =====

export default function UserTable({ users }: { users: AdminUser[] }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const router = useRouter();

  const [sortConfig, setSortConfig] = useState<{
    key: keyof AdminUser;
    direction: "asc" | "desc";
  } | null>({ key: "createdAt", direction: "desc" });
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [activeJobs, setActiveJobs] = useState<BatchJob[]>([]);

  const fetchActiveJobs = useCallback(async () => {
    const jobs = await getActiveBatchJobs();
    setActiveJobs(jobs);
  }, []);

  useEffect(() => {
    const initialTimer = window.setTimeout(() => void fetchActiveJobs(), 0);
    const interval = window.setInterval(() => void fetchActiveJobs(), 3000);
    return () => {
      window.clearTimeout(initialTimer);
      window.clearInterval(interval);
    };
  }, [fetchActiveJobs]);

  const showNotification = useCallback(
    (type: "success" | "error", message: string) => {
      setNotification({ type, message });
      setTimeout(() => setNotification(null), 4000);
    },
    [],
  );

  const sortedUsers = useMemo(() => {
    let items = [...users];

    // Search Filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      items = items.filter(
        (u) =>
          (u.name || "").toLowerCase().includes(query) ||
          (u.email || "").toLowerCase().includes(query) ||
          (u.nip || "").toLowerCase().includes(query) ||
          (u.username || "").toLowerCase().includes(query),
      );
    }

    // Role Filter
    if (roleFilter !== "all") {
      items = items.filter((u) => u.role === roleFilter);
    }

    // Sorting
    if (sortConfig) {
      items.sort((a, b) => {
        const normalizeValue = (value: AdminUser[keyof AdminUser]) =>
          value instanceof Date ? value.getTime() : String(value ?? "").toLowerCase();
        const aVal = normalizeValue(a[sortConfig.key]);
        const bVal = normalizeValue(b[sortConfig.key]);

        if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    }

    return items;
  }, [users, searchQuery, roleFilter, sortConfig]);

  const totalPages = Math.ceil(sortedUsers.length / rowsPerPage);
  const currentUsers = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return sortedUsers.slice(start, start + rowsPerPage);
  }, [sortedUsers, currentPage, rowsPerPage]);

  const handleSort = (key: keyof AdminUser) => {
    let direction: "asc" | "desc" = "asc";
    if (
      sortConfig &&
      sortConfig.key === key &&
      sortConfig.direction === "asc"
    ) {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  const handleRoleChange = async (
    userId: string,
    newRole: "student" | "instructor" | "admin",
  ) => {
    setUpdatingId(userId);
    const result = await updateUserRole(userId, newRole);
    if (result.success) {
      showNotification("success", "Peran pengguna berhasil diperbarui.");
      router.refresh();
    } else {
      showNotification("error", result.error || "Gagal memperbarui peran.");
    }
    setUpdatingId(null);
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus pengguna "${userName}"?`))
      return;
    setUpdatingId(userId);
    const result = await deleteUser(userId);
    if (result.success) {
      showNotification("success", `Pengguna "${userName}" berhasil dihapus.`);
      router.refresh();
    } else {
      showNotification("error", result.error || "Gagal menghapus pengguna.");
    }
    setUpdatingId(null);
  };

  const handleResetToNip = async (userId: string, userName: string) => {
    if (!confirm(`Buat password sementara baru untuk "${userName}" dan hentikan seluruh sesi aktif?`)) return;
    setUpdatingId(userId);
    const result = await resetPasswordToNip(userId);
    if (result.success) {
      showNotification(
        "success",
        `Password sementara "${userName}": ${result.temporaryPassword}. Salin sekarang dan kirim melalui kanal aman.`,
      );
    } else {
      showNotification("error", result.error || "Gagal mereset password.");
    }
    setUpdatingId(null);
  };

  const formatRole = (role: string) => {
    switch (role) {
      case "admin":
        return { bg: "bg-crimson-100 text-crimson-700", label: "Admin" };
      case "instructor":
        return { bg: "bg-indigo-100 text-indigo-700", label: "Instruktur" };
      default:
        return { bg: "bg-oxford-100 dark:bg-[#161B2A] text-oxford-700 dark:text-oxford-200", label: "Siswa" };
    }
  };

  return (
    <div className="flex flex-col flex-1 h-full">
      <BatchProgressBanner
        jobs={activeJobs}
        onRefresh={() => {
          fetchActiveJobs();
          router.refresh();
        }}
      />
      {/* Floating Notification */}
      {notification && (
        <div
          className={`fixed top-6 right-6 z-[100] flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-2xl border text-sm font-bold animate-slide-in-right ${
            notification.type === "success"
              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
              : "bg-crimson-50 text-crimson-800 border-crimson-200"
          }`}
        >
          {notification.type === "success" ? (
            <Check size={18} />
          ) : (
            <AlertCircle size={18} />
          )}
          {notification.message}
          <button
            onClick={() => setNotification(null)}
            className="ml-2 opacity-60 hover:opacity-100"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-oxford-400"
            size={18}
          />
          <input
            type="text"
            placeholder="Cari nama, email, NIP..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="pl-10 pr-4 py-2 bg-white dark:bg-[#161B2A] border border-oxford-200 dark:border-oxford-700 rounded-lg text-sm focus:outline-none focus:border-gold-500 focus:ring-4 focus:ring-gold-500/10 transition-all w-full sm:w-64 text-oxford-900 dark:text-white"
          />
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <select
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-4 py-2.5 bg-white dark:bg-[#161B2A] border border-oxford-200 dark:border-oxford-700 rounded-lg text-sm focus:outline-none focus:border-gold-500 text-oxford-700 dark:text-oxford-200"
          >
            <option value="all">Semua Peran</option>
            <option value="student">Siswa</option>
            <option value="instructor">Instruktur</option>
            <option value="admin">Admin</option>
          </select>

          <button
            onClick={() => setActiveModal("create")}
            className="flex items-center gap-2 px-4 py-2.5 bg-oxford-900 text-white rounded-lg text-sm font-bold hover:bg-oxford-800 transition-colors shadow-sm"
          >
            <UserPlus size={16} /> Tambah User
          </button>
          <button
            onClick={() => setActiveModal("batch")}
            className="flex items-center gap-2 px-4 py-2.5 bg-gold-500 text-oxford-950 rounded-lg text-sm font-bold hover:bg-gold-400 transition-colors shadow-sm"
          >
            <Upload size={16} /> Batch Upload
          </button>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="flex items-center gap-6 mb-6">
        <div className="flex items-center gap-2 text-sm text-oxford-500 dark:text-oxford-400">
          <Users size={16} />
          <span>
            <span className="font-bold text-oxford-900 dark:text-white">{users.length}</span>{" "}
            total pengguna
          </span>
        </div>
        {searchQuery && (
          <div className="text-sm text-oxford-500 dark:text-oxford-400">
            <span className="font-bold text-oxford-900 dark:text-white">
              {sortedUsers.length}
            </span>{" "}
            hasil ditemukan
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-[#161B2A] rounded-2xl border border-oxford-200 dark:border-oxford-700 shadow-sm overflow-hidden flex-1">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-oxford-50 dark:bg-oxford-950 text-xs font-semibold text-oxford-500 dark:text-oxford-400 uppercase tracking-wider border-b border-oxford-200 dark:border-oxford-700">
                <th
                  className="p-5 pl-6 cursor-pointer hover:bg-oxford-100 dark:hover:bg-[#161B2A] transition-colors group/th"
                  onClick={() => handleSort("name")}
                >
                  <div className="flex items-center gap-2">
                    Profil Pengguna
                    <ArrowUpDown
                      size={14}
                      className={`opacity-0 group-hover/th:opacity-100 transition-opacity ${sortConfig?.key === "name" ? "opacity-100 text-gold-600" : "text-oxford-300"}`}
                    />
                  </div>
                </th>
                <th
                  className="p-5 cursor-pointer hover:bg-oxford-100 dark:hover:bg-[#161B2A] transition-colors group/th"
                  onClick={() => handleSort("nip")}
                >
                  <div className="flex items-center gap-2">
                    NIP / Username
                    <ArrowUpDown
                      size={14}
                      className={`opacity-0 group-hover/th:opacity-100 transition-opacity ${sortConfig?.key === "nip" ? "opacity-100 text-gold-600" : "text-oxford-300"}`}
                    />
                  </div>
                </th>
                <th
                  className="p-5 cursor-pointer hover:bg-oxford-100 dark:hover:bg-[#161B2A] transition-colors group/th"
                  onClick={() => handleSort("createdAt")}
                >
                  <div className="flex items-center gap-2">
                    Tanggal Mendaftar
                    <ArrowUpDown
                      size={14}
                      className={`opacity-0 group-hover/th:opacity-100 transition-opacity ${sortConfig?.key === "createdAt" ? "opacity-100 text-gold-600" : "text-oxford-300"}`}
                    />
                  </div>
                </th>
                <th
                  className="p-5 cursor-pointer hover:bg-oxford-100 dark:hover:bg-[#161B2A] transition-colors group/th"
                  onClick={() => handleSort("role")}
                >
                  <div className="flex items-center gap-2">
                    Hak Akses
                    <ArrowUpDown
                      size={14}
                      className={`opacity-0 group-hover/th:opacity-100 transition-opacity ${sortConfig?.key === "role" ? "opacity-100 text-gold-600" : "text-oxford-300"}`}
                    />
                  </div>
                </th>
                <th className="p-5 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-oxford-100">
              {currentUsers.map((user) => {
                const roleMeta = formatRole(user.role);
                return (
                  <tr
                    key={user.id}
                    className="hover:bg-oxford-50 dark:hover:bg-oxford-950/50 transition-colors group"
                  >
                    <td className="p-5 pl-6">
                      <p className="font-bold text-oxford-900 dark:text-white mb-0.5">
                        {user.name}
                      </p>
                      <p className="text-xs text-oxford-500 dark:text-oxford-400 flex items-center gap-1">
                        <Mail size={12} /> {user.email}
                      </p>
                    </td>
                    <td className="p-5">
                      <code className="text-xs bg-oxford-100 dark:bg-[#161B2A] text-oxford-700 dark:text-oxford-200 px-2 py-1 rounded font-mono">
                        {user.nip || "-"}
                      </code>
                    </td>
                    <td className="p-5">
                      <p className="text-sm text-oxford-500 dark:text-oxford-400">
                        {new Date(user.createdAt).toLocaleDateString("id-ID", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </p>
                    </td>
                    <td className="p-5">
                      <div className="flex items-center gap-4">
                        <span
                          className={`inline-block px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${roleMeta.bg}`}
                        >
                          {roleMeta.label}
                        </span>

                        <div className="flex bg-oxford-50 dark:bg-oxford-950 border border-oxford-200 dark:border-oxford-700 rounded-lg overflow-hidden opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleRoleChange(user.id, "student")}
                            disabled={updatingId === user.id}
                            className={`px-3 py-1.5 text-xs font-bold transition-colors ${user.role === "student" ? "bg-oxford-200 dark:bg-oxford-800 text-oxford-500 dark:text-oxford-400 cursor-not-allowed hidden" : "text-oxford-600 dark:text-oxford-300 hover:bg-white dark:hover:bg-[#161B2A] hover:text-black"}`}
                            title="Jadikan Siswa"
                          >
                            Siswa
                          </button>
                          <button
                            onClick={() =>
                              handleRoleChange(user.id, "instructor")
                            }
                            disabled={updatingId === user.id}
                            className={`px-3 py-1.5 text-xs font-bold transition-colors border-l border-oxford-200 dark:border-oxford-700 ${user.role === "instructor" ? "bg-oxford-200 dark:bg-oxford-800 text-oxford-500 dark:text-oxford-400 cursor-not-allowed hidden" : "text-indigo-600 hover:bg-white dark:hover:bg-[#161B2A] hover:text-indigo-700"}`}
                            title="Instruktur"
                          >
                            <BadgeCheck size={14} className="inline mr-1" />
                            Instruktur
                          </button>
                          <button
                            onClick={() => handleRoleChange(user.id, "admin")}
                            disabled={updatingId === user.id}
                            className={`px-3 py-1.5 text-xs font-bold transition-colors border-l border-oxford-200 dark:border-oxford-700 ${user.role === "admin" ? "bg-oxford-200 dark:bg-oxford-800 text-oxford-500 dark:text-oxford-400 cursor-not-allowed hidden" : "text-crimson-600 hover:bg-white dark:hover:bg-[#161B2A] hover:text-crimson-700"}`}
                            title="Admin"
                          >
                            <ShieldAlert size={14} className="inline mr-1" />
                            Admin
                          </button>
                        </div>
                        {updatingId === user.id && (
                          <span className="text-xs text-oxford-400">
                            Loading...
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-5">
                      <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => {
                            setSelectedUser(user);
                            setActiveModal("reset-password");
                          }}
                          className="p-2 text-oxford-400 hover:text-gold-600 hover:bg-gold-50 rounded-lg transition-colors"
                          title="Reset Password"
                        >
                          <KeyRound size={16} />
                        </button>
                        <button
                          onClick={() => handleResetToNip(user.id, user.name)}
                          className="p-2 text-oxford-400 hover:text-oxford-700 dark:hover:text-oxford-200 hover:bg-oxford-100 dark:hover:bg-[#161B2A] rounded-lg transition-colors"
                          title="Reset Password ke NIP"
                        >
                          <RotateCcw size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user.id, user.name)}
                          className="p-2 text-oxford-400 hover:text-crimson-600 hover:bg-crimson-50 rounded-lg transition-colors"
                          title="Hapus Pengguna"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {currentUsers.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="p-10 text-center text-oxford-500 dark:text-oxford-400 italic"
                  >
                    Tidak ada akun pengguna yang ditemukan.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination Controls */}
      <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 bg-white dark:bg-[#161B2A] p-4 rounded-xl border border-oxford-200 dark:border-oxford-700">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-oxford-500 dark:text-oxford-400 uppercase tracking-wider">
            Tampilkan
          </span>
          <select
            value={rowsPerPage}
            onChange={(e) => {
              setRowsPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="bg-oxford-50 dark:bg-oxford-950 border border-oxford-200 dark:border-oxford-700 rounded-lg px-3 py-1.5 text-xs font-bold text-oxford-700 dark:text-oxford-200 focus:outline-none focus:border-gold-500 transition-colors"
          >
            <option value={10}>10 Baris</option>
            <option value={20}>20 Baris</option>
            <option value={50}>50 Baris</option>
            <option value={100}>100 Baris</option>
          </select>
          <span className="text-xs text-oxford-400">
            Menampilkan{" "}
            <span className="font-bold text-oxford-900 dark:text-white">
              {sortedUsers.length > 0 ? (currentPage - 1) * rowsPerPage + 1 : 0}
            </span>{" "}
            -{" "}
            <span className="font-bold text-oxford-900 dark:text-white">
              {Math.min(currentPage * rowsPerPage, sortedUsers.length)}
            </span>{" "}
            dari{" "}
            <span className="font-bold text-oxford-900 dark:text-white">
              {sortedUsers.length}
            </span>
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="p-2 rounded-lg border border-oxford-200 dark:border-oxford-700 text-oxford-600 dark:text-oxford-300 hover:bg-oxford-50 dark:hover:bg-oxford-950 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft size={18} />
          </button>

          <div className="flex items-center gap-1 mx-2">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum = i + 1;
              if (totalPages > 5) {
                if (currentPage > 3) pageNum = currentPage - 2 + i;
                if (pageNum + 4 > totalPages) pageNum = totalPages - 4 + i;
                if (pageNum < 1) pageNum = i + 1;
              }
              if (pageNum > totalPages) return null;

              return (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`w-9 h-9 flex items-center justify-center rounded-lg text-sm font-bold transition-all ${currentPage === pageNum ? "bg-oxford-900 text-white shadow-md" : "text-oxford-500 dark:text-oxford-400 hover:bg-oxford-50 dark:hover:bg-oxford-950 hover:text-oxford-900 dark:hover:text-white"}`}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages || totalPages === 0}
            className="p-2 rounded-lg border border-oxford-200 dark:border-oxford-700 text-oxford-600 dark:text-oxford-300 hover:bg-oxford-50 dark:hover:bg-oxford-950 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* Modals */}
      {activeModal === "create" && (
        <CreateUserModal
          onClose={() => setActiveModal(null)}
          onSuccess={(msg) => {
            showNotification("success", msg);
            router.refresh();
          }}
          onError={(msg) => showNotification("error", msg)}
        />
      )}
      {activeModal === "batch" && (
        <BatchUploadModal
          onClose={() => setActiveModal(null)}
          onSuccess={(msg) => {
            showNotification("success", msg);
            router.refresh();
          }}
          onError={(msg) => showNotification("error", msg)}
        />
      )}
      {activeModal === "reset-password" && selectedUser && (
        <ResetPasswordModal
          user={selectedUser}
          onClose={() => {
            setActiveModal(null);
            setSelectedUser(null);
          }}
          onSuccess={(msg) => showNotification("success", msg)}
          onError={(msg) => showNotification("error", msg)}
        />
      )}
    </div>
  );
}

// ===== MODAL BACKDROP =====

function ModalBackdrop({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-oxford-950/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-white dark:bg-[#161B2A] rounded-2xl shadow-2xl border border-oxford-200 dark:border-oxford-700 w-full max-w-lg max-h-[90vh] overflow-y-auto animate-scale-in">
        {children}
      </div>
    </div>
  );
}

// ===== CREATE USER MODAL =====

function CreateUserModal({
  onClose,
  onSuccess,
  onError,
}: {
  onClose: () => void;
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<CreateUserInput>({
    name: "",
    nip: "",
    email: "",
    password: "",
    role: "student",
    instansiAsal: "",
    jabatan: "",
    pangkat: "",
    golongan: "",
    tempatLahir: "",
    tanggalLahir: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState(false);

  const handleAutoPassword = () => {
    const bytes = new Uint8Array(10);
    crypto.getRandomValues(bytes);
    const random = Array.from(bytes, (value) => value.toString(36)).join("").slice(0, 12);
    setForm((current) => ({ ...current, password: `Ck9${random}aA` }));
    setGeneratedPassword(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const result = await createUser(form);
    if (result.success) {
      onSuccess(
        `Pengguna "${form.name}" berhasil dibuat. Username: ${form.nip}`,
      );
      onClose();
    } else {
      onError(result.error || "Gagal membuat pengguna.");
    }
    setLoading(false);
  };

  return (
    <ModalBackdrop onClose={onClose}>
      <div className="p-6 border-b border-oxford-200 dark:border-oxford-700 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-oxford-900 text-gold-500 rounded-xl flex items-center justify-center">
            <UserPlus size={20} />
          </div>
          <div>
            <h2 className="font-bold text-lg text-oxford-900 dark:text-white">
              Tambah Pengguna Baru
            </h2>
            <p className="text-xs text-oxford-500 dark:text-oxford-400">
              Username menggunakan NIP; password wajib kuat dan berbeda dari NIP
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 text-oxford-400 hover:text-oxford-600 dark:hover:text-oxford-300 hover:bg-oxford-100 dark:hover:bg-[#161B2A] rounded-lg transition-colors"
        >
          <X size={20} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-5">
        <div>
          <label className="block text-sm font-bold text-oxford-900 dark:text-white mb-1.5">
            Nama Lengkap
          </label>
          <input
            type="text"
            required
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="Contoh: Budi Santoso"
            className="w-full px-4 py-2.5 border border-oxford-200 dark:border-oxford-700 rounded-xl text-sm focus:outline-none focus:border-gold-500 focus:ring-4 focus:ring-gold-500/10 transition-all text-oxford-900 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-oxford-900 dark:text-white mb-1.5">
            NIP{" "}
            <span className="font-normal text-oxford-400">
              (akan menjadi Username)
            </span>
          </label>
          <input
            type="text"
            required
            value={form.nip}
            onChange={(e) => {
              setForm((f) => ({ ...f, nip: e.target.value }));
              setGeneratedPassword(false);
            }}
            placeholder="Contoh: 199001012020011001"
            className="w-full px-4 py-2.5 border border-oxford-200 dark:border-oxford-700 rounded-xl text-sm focus:outline-none focus:border-gold-500 focus:ring-4 focus:ring-gold-500/10 transition-all text-oxford-900 dark:text-white font-mono"
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-oxford-900 dark:text-white mb-1.5">
            Email
          </label>
          <input
            type="email"
            required
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            placeholder="Contoh: budi@instansi.go.id"
            className="w-full px-4 py-2.5 border border-oxford-200 dark:border-oxford-700 rounded-xl text-sm focus:outline-none focus:border-gold-500 focus:ring-4 focus:ring-gold-500/10 transition-all text-oxford-900 dark:text-white"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-sm font-bold text-oxford-900 dark:text-white">
              Password
            </label>
            <button
              type="button"
              onClick={handleAutoPassword}
              className="text-xs font-bold text-gold-600 hover:text-gold-500 disabled:text-oxford-300 disabled:cursor-not-allowed flex items-center gap-1"
            >
              <RotateCcw size={12} /> Buat Password Aman
            </button>
          </div>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              required
              minLength={10}
              maxLength={128}
              value={form.password}
              onChange={(e) => {
                setForm((f) => ({ ...f, password: e.target.value }));
                setGeneratedPassword(false);
              }}
              placeholder="Minimal 10 karakter"
              className={`w-full px-4 py-2.5 pr-10 border rounded-xl text-sm focus:outline-none focus:border-gold-500 focus:ring-4 focus:ring-gold-500/10 transition-all text-oxford-900 dark:text-white ${generatedPassword ? "border-emerald-300 bg-emerald-50/50" : "border-oxford-200 dark:border-oxford-700"}`}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-oxford-400 hover:text-oxford-600 dark:hover:text-oxford-300"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <p className="text-xs text-oxford-400 mt-1">
            Gunakan huruf besar, huruf kecil, dan angka. Password tidak pernah disimpan sebagai teks biasa.
          </p>
        </div>

        <div>
          <label className="block text-sm font-bold text-oxford-900 dark:text-white mb-1.5">
            Peran
          </label>
          <select
            value={form.role}
            onChange={(e) =>
              setForm((f) => ({ ...f, role: e.target.value as CreateUserInput["role"] }))
            }
            className="w-full px-4 py-2.5 border border-oxford-200 dark:border-oxford-700 rounded-xl text-sm focus:outline-none focus:border-gold-500 text-oxford-700 dark:text-oxford-200"
          >
            <option value="student">Siswa</option>
            <option value="instructor">Instruktur</option>
            <option value="admin">Admin</option>
          </select>
        </div>

        {/* Divider */}
        <div className="border-t border-oxford-100 dark:border-oxford-800 pt-1">
          <p className="text-[11px] font-bold text-oxford-400 uppercase tracking-wider mb-3">
            Data Kepegawaian <span className="font-normal">(opsional)</span>
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-oxford-900 dark:text-white mb-1.5">
                Perangkat Daerah / Instansi
              </label>
              <input
                type="text"
                value={form.instansiAsal || ""}
                onChange={(e) =>
                  setForm((f) => ({ ...f, instansiAsal: e.target.value }))
                }
                placeholder="Contoh: Dinas Pendidikan Kaltara"
                className="w-full px-4 py-2.5 border border-oxford-200 dark:border-oxford-700 rounded-xl text-sm focus:outline-none focus:border-gold-500 focus:ring-4 focus:ring-gold-500/10 transition-all text-oxford-900 dark:text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-bold text-oxford-900 dark:text-white mb-1.5">
                  Jabatan
                </label>
                <input
                  type="text"
                  value={form.jabatan || ""}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, jabatan: e.target.value }))
                  }
                  placeholder="Contoh: Kepala Bidang"
                  className="w-full px-4 py-2.5 border border-oxford-200 dark:border-oxford-700 rounded-xl text-sm focus:outline-none focus:border-gold-500 focus:ring-4 focus:ring-gold-500/10 transition-all text-oxford-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-oxford-900 dark:text-white mb-1.5">
                  Pangkat / Golongan
                </label>
                <select
                  value={form.pangkat || ""}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, pangkat: e.target.value }))
                  }
                  className="w-full px-4 py-2.5 border border-oxford-200 dark:border-oxford-700 rounded-xl text-sm focus:outline-none focus:border-gold-500 text-oxford-700 dark:text-oxford-200"
                >
                  <option value="">Pilih Pangkat/Golongan</option>
                  {PANGKAT_GOLONGAN.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-bold text-oxford-900 dark:text-white mb-1.5">
                  Tempat Lahir
                </label>
                <input
                  type="text"
                  value={form.tempatLahir || ""}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, tempatLahir: e.target.value }))
                  }
                  placeholder="Contoh: Tanjung Selor"
                  className="w-full px-4 py-2.5 border border-oxford-200 dark:border-oxford-700 rounded-xl text-sm focus:outline-none focus:border-gold-500 focus:ring-4 focus:ring-gold-500/10 transition-all text-oxford-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-oxford-900 dark:text-white mb-1.5">
                  Tanggal Lahir
                </label>
                <input
                  type="text"
                  value={form.tanggalLahir || ""}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, tanggalLahir: e.target.value }))
                  }
                  placeholder="Contoh: 15 Mei 1985"
                  className="w-full px-4 py-2.5 border border-oxford-200 dark:border-oxford-700 rounded-xl text-sm focus:outline-none focus:border-gold-500 focus:ring-4 focus:ring-gold-500/10 transition-all text-oxford-900 dark:text-white"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 border border-oxford-200 dark:border-oxford-700 text-oxford-700 dark:text-oxford-200 font-bold rounded-xl text-sm hover:bg-oxford-50 dark:hover:bg-oxford-950 transition-colors"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 py-3 bg-oxford-900 text-white font-bold rounded-xl text-sm hover:bg-oxford-800 transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              "Menyimpan..."
            ) : (
              <>
                <UserPlus size={16} /> Simpan
              </>
            )}
          </button>
        </div>
      </form>
    </ModalBackdrop>
  );
}

// ===== BATCH UPLOAD MODAL =====

function BatchUploadModal({
  onClose,
  onSuccess,
  onError,
}: {
  onClose: () => void;
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<BatchUserInput[]>([]);
  const [results, setResults] = useState<
    | {
        index: number;
        success: boolean;
        error?: string;
        nip: string;
        name: string;
      }[]
    | null
  >(null);
  const [fileName, setFileName] = useState("");

  const handleDownloadTemplate = async () => {
    try {
      const templateData: SpreadsheetRow[] = [
        {
          Nama: "Budi Santoso",
          NIP: "199001012020011001",
          Email: "budi@instansi.go.id",
          Password: "CorpuKU2026A!",
          Peran: "student",
          "Perangkat Daerah": "Dinas Pendidikan Kaltara",
          Jabatan: "Kepala Bidang",
          Pangkat: "Pembina",
          Golongan: "IV/a",
          "Tempat Lahir": "Tanjung Selor",
          "Tanggal Lahir": "1 Januari 1985",
        },
        {
          Nama: "Siti Rahayu",
          NIP: "199203082021012002",
          Email: "siti@instansi.go.id",
          Password: "CorpuKU2026B!",
          Peran: "instructor",
          "Perangkat Daerah": "BPSDM Kaltara",
          Jabatan: "Widyaiswara",
          Pangkat: "Penata",
          Golongan: "III/c",
          "Tempat Lahir": "Tarakan",
          "Tanggal Lahir": "15 Maret 1992",
        },
      ];

      await exportExcel([{ name: "Pengguna", rows: templateData }], "template_batch_user_corpuku.xlsx");
    } catch (err) {
      console.error("Download error:", err);
      onError("Gagal men-generate template Excel.");
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);

    try {
        const jsonData = await parseSpreadsheet(file);
        const parsed: BatchUserInput[] = jsonData
          .map((row) => ({
            name: String(
              row["Nama"] || row["nama"] || row["Name"] || "",
            ).trim(),
            nip: String(row["NIP"] || row["nip"] || "").trim(),
            email: String(row["Email"] || row["email"] || "").trim(),
            password: String(row["Password"] || row["password"] || "").trim(),
            role: String(
              row["Peran"] ||
                row["peran"] ||
                row["Role"] ||
                row["role"] ||
                "student",
            )
              .trim()
              .toLowerCase() as BatchUserInput["role"],
            instansiAsal:
              String(
                row["Perangkat Daerah"] ||
                  row["perangkat_daerah"] ||
                  row["Instansi"] ||
                  row["instansi"] ||
                  "",
              ).trim() || undefined,
            jabatan:
              String(row["Jabatan"] || row["jabatan"] || "").trim() ||
              undefined,
            pangkat:
              String(row["Pangkat"] || row["pangkat"] || "").trim() ||
              undefined,
            golongan:
              String(row["Golongan"] || row["golongan"] || "").trim() ||
              undefined,
            tempatLahir:
              String(row["Tempat Lahir"] || row["tempat_lahir"] || "").trim() ||
              undefined,
            tanggalLahir:
              String(
                row["Tanggal Lahir"] || row["tanggal_lahir"] || "",
              ).trim() || undefined,
          }))
          .filter((u) => u.name || u.nip || u.email);

        setPreview(parsed);
        setResults(null);
    } catch (error) {
      onError(error instanceof Error ? error.message : "Gagal membaca file Excel. Pastikan format file benar.");
    }
  };

  const handleSubmit = async () => {
    if (preview.length === 0) {
      onError("Tidak ada data untuk diproses.");
      return;
    }
    setLoading(true);

    // 1. Create a persistent job in DB
    let jobId = "";
    try {
      const jobRes = await createBatchJob({
        filename: fileName,
        type: "users",
        totalItems: preview.length,
        dataPayload: preview,
      });
      jobId = jobRes.id;
    } catch (err) {
      console.error("Failed to create batch job:", err);
    }

    const chunkSize = 50;
    let finalSuccessCount = 0;
    let finalFailCount = 0;
    let processedItems = 0;
    setResults([]);

    for (let i = 0; i < preview.length; i += chunkSize) {
      const chunk = preview.slice(i, i + chunkSize);
      try {
        const result = await createUsersBatch(chunk);
        processedItems += chunk.length;

        const errors = result.results.filter((r) => !r.success);
        finalSuccessCount += chunk.length - errors.length;
        finalFailCount += errors.length;

        // 2. Update DB progress
        if (jobId) {
          await updateBatchJobProgress(jobId, {
            processedItems,
            successCount: finalSuccessCount,
            failureCount: finalFailCount,
            errorLog: errors.map((e) => ({ nip: e.nip, error: e.error })),
          });
        }

        // Update local UI
        const adjustedResults = result.results.map((r) => ({
          ...r,
          index: r.index + i,
        }));
        setResults((prev) => [...(prev || []), ...adjustedResults]);
      } catch (err) {
        console.error(`Chunk ${i} failed:`, err);
        finalFailCount += chunk.length;
        processedItems += chunk.length;

        if (jobId) {
          await updateBatchJobProgress(jobId, {
            processedItems,
            failureCount: finalFailCount,
            errorLog: [{ error: `Sistem Error pada batch baris ${i + 1}` }],
          });
        }
      }
    }

    // 3. Mark as finished in DB
    if (jobId) {
      await finishBatchJob(
        jobId,
        finalFailCount === preview.length ? "failed" : "completed",
      );
    }

    setLoading(false);
    onSuccess(
      `Pemrosesan selesai. ${finalSuccessCount} berhasil, ${finalFailCount} gagal.`,
    );
  };

  return (
    <ModalBackdrop onClose={onClose}>
      <div className="p-6 border-b border-oxford-200 dark:border-oxford-700 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gold-500 text-oxford-950 rounded-xl flex items-center justify-center">
            <Upload size={20} />
          </div>
          <div>
            <h2 className="font-bold text-lg text-oxford-900 dark:text-white">
              Batch Upload Pengguna
            </h2>
            <p className="text-xs text-oxford-500 dark:text-oxford-400">
              Upload file Excel (.xlsx) untuk menambah pengguna
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 text-oxford-400 hover:text-oxford-600 dark:hover:text-oxford-300 hover:bg-oxford-100 dark:hover:bg-[#161B2A] rounded-lg transition-colors"
        >
          <X size={20} />
        </button>
      </div>

      <div className="p-6 space-y-5">
        {/* Template Download */}
        <div className="bg-oxford-50 dark:bg-oxford-950 border border-oxford-200 dark:border-oxford-700 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-bold text-oxford-700 dark:text-oxford-200 uppercase tracking-wider">
              Format Kolom Excel
            </p>
            <button
              onClick={handleDownloadTemplate}
              className="flex items-center gap-1 text-xs font-bold text-gold-600 hover:text-gold-500 transition-colors"
            >
              <Download size={12} /> Unduh Template .xlsx
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[11px] text-oxford-600 dark:text-oxford-300">
              <thead>
                <tr className="border-b border-oxford-200 dark:border-oxford-700 text-oxford-500 dark:text-oxford-400">
                  <th className="px-2 py-1.5 text-left font-bold">Nama</th>
                  <th className="px-2 py-1.5 text-left font-bold">NIP</th>
                  <th className="px-2 py-1.5 text-left font-bold">Email</th>
                  <th className="px-2 py-1.5 text-left font-bold">Password</th>
                  <th className="px-2 py-1.5 text-left font-bold">Peran</th>
                  <th className="px-2 py-1.5 text-left font-bold">
                    Perangkat Daerah
                  </th>
                  <th className="px-2 py-1.5 text-left font-bold">Jabatan</th>
                  <th className="px-2 py-1.5 text-left font-bold">Pangkat</th>
                  <th className="px-2 py-1.5 text-left font-bold">Golongan</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="px-2 py-1">Budi Santoso</td>
                  <td className="px-2 py-1 font-mono">19900101...</td>
                  <td className="px-2 py-1">budi@...</td>
                  <td className="px-2 py-1 text-oxford-400 italic">(kosong)</td>
                  <td className="px-2 py-1">student</td>
                  <td className="px-2 py-1">Dinas Pendidikan</td>
                  <td className="px-2 py-1">Kepala Bidang</td>
                  <td className="px-2 py-1">Pembina</td>
                  <td className="px-2 py-1">IV/a</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-[10px] text-oxford-400 mt-2">
            * Password kosong = NIP sebagai default. Peran: student / instructor
            / admin. Kolom Perangkat Daerah, Jabatan, Pangkat, Golongan boleh
            dikosongkan.
          </p>
        </div>

        {/* File Upload */}
        <div>
          <label className="block text-sm font-bold text-oxford-900 dark:text-white mb-1.5">
            Upload File Excel
          </label>
          <label className="flex items-center justify-center gap-2 px-4 py-4 border-2 border-dashed border-oxford-300 dark:border-oxford-600 rounded-xl cursor-pointer hover:border-gold-500 hover:bg-gold-50/30 transition-all">
            <FileSpreadsheet size={20} className="text-oxford-400" />
            <span className="text-sm text-oxford-500 dark:text-oxford-400">
              {fileName || "Klik untuk pilih file .xlsx"}
            </span>
            <input
              type="file"
              accept=".xlsx,.csv"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
        </div>

        {/* Preview Table */}
        {preview.length > 0 && (
          <div className="border border-oxford-200 dark:border-oxford-700 rounded-xl overflow-hidden">
            <div className="bg-oxford-50 dark:bg-oxford-950 px-4 py-2.5 border-b border-oxford-200 dark:border-oxford-700 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <p className="text-xs font-bold text-oxford-700 dark:text-oxford-200">
                  {preview.length} data siap diproses
                </p>
                {loading && (
                  <div className="flex items-center gap-2">
                    <div className="w-24 bg-oxford-200 dark:bg-oxford-800 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-gold-500 h-full transition-all duration-300"
                        style={{
                          width: `${((results?.length || 0) / preview.length) * 100}%`,
                        }}
                      />
                    </div>
                    <span className="text-[10px] font-bold text-gold-600">
                      {Math.round(
                        ((results?.length || 0) / preview.length) * 100,
                      )}
                      %
                    </span>
                  </div>
                )}
              </div>
              {!loading && (
                <button
                  onClick={() => {
                    setPreview([]);
                    setResults(null);
                    setFileName("");
                  }}
                  className="text-xs text-oxford-400 hover:text-oxford-600 dark:hover:text-oxford-300"
                >
                  Reset
                </button>
              )}
            </div>
            <div className="overflow-x-auto max-h-48 overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-white dark:bg-[#161B2A]">
                  <tr className="text-oxford-500 dark:text-oxford-400 border-b border-oxford-100 dark:border-oxford-800">
                    <th className="px-3 py-2 text-left">#</th>
                    <th className="px-3 py-2 text-left">Nama</th>
                    <th className="px-3 py-2 text-left">NIP</th>
                    <th className="px-3 py-2 text-left">Email</th>
                    <th className="px-3 py-2 text-left">Peran</th>
                    <th className="px-3 py-2 text-left">Perangkat Daerah</th>
                    <th className="px-3 py-2 text-left">Jabatan</th>
                    <th className="px-3 py-2 text-left">Pangkat / Gol</th>
                    {results && <th className="px-3 py-2 text-left">Status</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-oxford-50">
                  {preview.map((u, i) => (
                    <tr
                      key={i}
                      className={
                        results?.[i]?.success === false
                          ? "bg-crimson-50/30"
                          : ""
                      }
                    >
                      <td className="px-3 py-2 text-oxford-400">{i + 1}</td>
                      <td className="px-3 py-2 font-medium text-oxford-900 dark:text-white">
                        {u.name}
                      </td>
                      <td className="px-3 py-2 text-oxford-600 dark:text-oxford-300 font-mono">
                        {u.nip}
                      </td>
                      <td className="px-3 py-2 text-oxford-600 dark:text-oxford-300">{u.email}</td>
                      <td className="px-3 py-2">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${u.role === "admin" ? "bg-crimson-100 text-crimson-700" : u.role === "instructor" ? "bg-indigo-100 text-indigo-700" : "bg-oxford-100 dark:bg-[#161B2A] text-oxford-700 dark:text-oxford-200"}`}
                        >
                          {u.role || "student"}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-oxford-600 dark:text-oxford-300 text-[11px]">
                        {u.instansiAsal || (
                          <span className="text-oxford-300 italic">-</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-oxford-600 dark:text-oxford-300 text-[11px]">
                        {u.jabatan || (
                          <span className="text-oxford-300 italic">-</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-oxford-600 dark:text-oxford-300 text-[11px]">
                        {[u.pangkat, u.golongan]
                          .filter(Boolean)
                          .join(" / ") || (
                          <span className="text-oxford-300 italic">-</span>
                        )}
                      </td>
                      {results && (
                        <td className="px-3 py-2">
                          {results[i]?.success ? (
                            <span className="text-emerald-600 font-bold flex items-center gap-1">
                              <Check size={12} /> OK
                            </span>
                          ) : (
                            <span
                              className="text-crimson-600 text-[10px]"
                              title={results[i]?.error}
                            >
                              {results[i]?.error}
                            </span>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 border border-oxford-200 dark:border-oxford-700 text-oxford-700 dark:text-oxford-200 font-bold rounded-xl text-sm hover:bg-oxford-50 dark:hover:bg-oxford-950 transition-colors"
          >
            {results ? "Tutup" : "Batal"}
          </button>
          {preview.length > 0 && !results && (
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="flex-1 py-3 bg-gold-500 text-oxford-950 font-bold rounded-xl text-sm hover:bg-gold-400 transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                "Memproses..."
              ) : (
                <>
                  <Upload size={16} /> Proses {preview.length} Pengguna
                </>
              )}
            </button>
          )}
          {results && (
            <button
              onClick={() => {
                onClose();
              }}
              className="flex-1 py-3 bg-oxford-900 text-white font-bold rounded-xl text-sm hover:bg-oxford-800 transition-colors flex items-center justify-center gap-2"
            >
              <Check size={16} /> Selesai
            </button>
          )}
        </div>
      </div>
    </ModalBackdrop>
  );
}

// ===== RESET PASSWORD MODAL =====

function ResetPasswordModal({
  user,
  onClose,
  onSuccess,
  onError,
}: {
  user: AdminUser;
  onClose: () => void;
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleResetCustom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 10) {
      onError("Password minimal 10 karakter.");
      return;
    }
    setLoading(true);
    const result = await resetPassword(user.id, newPassword);
    if (result.success) {
      onSuccess(`Password "${user.name}" berhasil direset.`);
      onClose();
    } else {
      onError(result.error || "Gagal mereset password.");
    }
    setLoading(false);
  };

  const handleResetToNip = async () => {
    setLoading(true);
    const result = await resetPasswordToNip(user.id);
    if (result.success) {
      onSuccess(`Password sementara "${user.name}": ${result.temporaryPassword}. Salin sekarang dan kirim melalui kanal aman.`);
      onClose();
    } else {
      onError(result.error || "Gagal mereset password.");
    }
    setLoading(false);
  };

  return (
    <ModalBackdrop onClose={onClose}>
      <div className="p-6 border-b border-oxford-200 dark:border-oxford-700 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gold-500 text-oxford-950 rounded-xl flex items-center justify-center">
            <KeyRound size={20} />
          </div>
          <div>
            <h2 className="font-bold text-lg text-oxford-900 dark:text-white">
              Reset Password
            </h2>
            <p className="text-xs text-oxford-500 dark:text-oxford-400">
              {user.name} — {user.nip}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 text-oxford-400 hover:text-oxford-600 dark:hover:text-oxford-300 hover:bg-oxford-100 dark:hover:bg-[#161B2A] rounded-lg transition-colors"
        >
          <X size={20} />
        </button>
      </div>

      <div className="p-6 space-y-5">
        {/* Quick Reset to NIP */}
        <button
          onClick={handleResetToNip}
          disabled={loading}
          className="w-full flex items-center justify-between p-4 border-2 border-dashed border-oxford-200 dark:border-oxford-700 rounded-xl hover:border-gold-500 hover:bg-gold-50/30 transition-all group disabled:opacity-60"
        >
          <div className="flex items-center gap-3">
            <RotateCcw
              size={20}
              className="text-oxford-400 group-hover:text-gold-600 transition-colors"
            />
            <div className="text-left">
              <p className="text-sm font-bold text-oxford-900 dark:text-white">Reset ke NIP</p>
              <p className="text-xs text-oxford-500 dark:text-oxford-400">
                Password ={" "}
                <code className="bg-oxford-100 dark:bg-[#161B2A] px-1 rounded">{user.nip}</code>
              </p>
            </div>
          </div>
          <span className="text-xs font-bold text-gold-600 opacity-0 group-hover:opacity-100 transition-opacity">
            Klik untuk reset
          </span>
        </button>

        <div className="relative flex items-center">
          <div className="flex-1 border-t border-oxford-200 dark:border-oxford-700" />
          <span className="px-3 text-xs text-oxford-400 font-bold uppercase tracking-wider">
            atau
          </span>
          <div className="flex-1 border-t border-oxford-200 dark:border-oxford-700" />
        </div>

        {/* Custom Password */}
        <form onSubmit={handleResetCustom} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-oxford-900 dark:text-white mb-1.5">
              Password Baru (Custom)
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimal 6 karakter..."
                minLength={6}
                className="w-full px-4 py-2.5 pr-10 border border-oxford-200 dark:border-oxford-700 rounded-xl text-sm focus:outline-none focus:border-gold-500 focus:ring-4 focus:ring-gold-500/10 transition-all text-oxford-900 dark:text-white"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-oxford-400 hover:text-oxford-600 dark:hover:text-oxford-300"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 border border-oxford-200 dark:border-oxford-700 text-oxford-700 dark:text-oxford-200 font-bold rounded-xl text-sm hover:bg-oxford-50 dark:hover:bg-oxford-950 transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading || !newPassword}
              className="flex-1 py-3 bg-oxford-900 text-white font-bold rounded-xl text-sm hover:bg-oxford-800 transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                "Menyimpan..."
              ) : (
                <>
                  <KeyRound size={16} /> Set Password
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </ModalBackdrop>
  );
}
