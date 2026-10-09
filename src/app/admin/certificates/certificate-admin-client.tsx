"use client";

import { useState } from "react";
import NextImage from "next/image";
import { updateCertificateSettings } from "@/app/actions/courses";
import {
  CertificateView,
  type CertificateData,
  type CertificateTypeConfig,
  type TextElement,
} from "@/components/CertificateView";
import { MediaPicker } from "@/components/MediaPicker";
import {
  Image as ImageIcon,
  Save,
  CheckCircle,
  AlertCircle,
  Plus,
  Trash2,
  Edit2,
  FileText,
  Layers,
  Upload,
  Search,
  Copy,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";

type CertificateKind = NonNullable<CertificateData["certificateType"]>;
export type CertificateSettings = Partial<Record<CertificateKind, CertificateTypeConfig>>;

export default function CertificateAdminClient({
  initialSettings,
}: {
  initialSettings: CertificateSettings;
}) {
  const [settings, setSettings] = useState(initialSettings);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [activeTab, setActiveTab] = useState<
    "sertifikat" | "surat_keterangan" | "sttp"
  >("sertifikat");
  const [activeEditElementId, setActiveEditElementId] = useState<string | null>(
    null,
  );
  const [activePage, setActivePage] = useState<1 | 2>(1); // Which page is being edited
  const [isMediaPickerOpen, setIsMediaPickerOpen] = useState(false);
  const [mediaPickerMode, setMediaPickerMode] = useState<
    "background" | "element"
  >("background");
  const router = useRouter();

  const getOrientation = () => settings[activeTab]?.orientation || "landscape";
  const isPortrait = getOrientation() === "portrait";

  const toggleOrientation = () => {
    const newOrientation = isPortrait ? "landscape" : "portrait";
    setSettings((prev) => ({
      ...prev,
      [activeTab]: { ...prev[activeTab], orientation: newOrientation },
    }));
  };

  const isPage2Enabled = () => settings[activeTab]?.page2?.enabled || false;

  const togglePage2 = () => {
    setSettings((prev) => {
      const page2 = prev[activeTab]?.page2 || {
        enabled: false,
        templateUrl: null,
        elements: [],
      };
      return {
        ...prev,
        [activeTab]: {
          ...prev[activeTab],
          page2: { ...page2, enabled: !page2.enabled },
        },
      };
    });
    // If enabling page2 and currently on page 1, stay on page 1
    // If disabling page2 and currently on page 2, switch to page 1
    if (isPage2Enabled() && activePage === 2) {
      setActivePage(1);
    }
  };

  const handleMediaSelect = (url: string) => {
    if (mediaPickerMode === "background") {
      setSettings((prev) => {
        const typeConfig = prev[activeTab] || {
          orientation: "landscape",
          templateUrl: null,
          elements: [],
        };
        if (activePage === 1) {
          return { ...prev, [activeTab]: { ...typeConfig, templateUrl: url } };
        } else {
          const page2 = typeConfig.page2 || {
            enabled: true,
            templateUrl: null,
            elements: [],
          };
          return {
            ...prev,
            [activeTab]: {
              ...typeConfig,
              page2: { ...page2, templateUrl: url },
            },
          };
        }
      });
    } else if (mediaPickerMode === "element" && activeEditElementId) {
      updateElement(activeEditElementId, { imageUrl: url });
    }
    setIsMediaPickerOpen(false);
  };

  const handleTemplateUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsSaving(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const result = await res.json();
      if (result.success) {
        const url = result.url;
        setSettings((prev) => {
          const typeConfig = prev[activeTab] || {
            orientation: "landscape",
            templateUrl: null,
            elements: [],
          };

          if (activePage === 1) {
            return {
              ...prev,
              [activeTab]: { ...typeConfig, templateUrl: url },
            };
          } else {
            const page2 = typeConfig.page2 || {
              enabled: true,
              templateUrl: null,
              elements: [],
            };
            return {
              ...prev,
              [activeTab]: {
                ...typeConfig,
                page2: { ...page2, templateUrl: url },
              },
            };
          }
        });
      } else {
        alert("Upload gagal: " + result.error);
      }
    } catch (err) {
      console.error("Upload error:", err);
      alert("Gagal mengunggah template.");
    } finally {
      setIsSaving(false);
    }
  };

  const getActiveTemplateUrl = () => {
    if (activePage === 1) return settings[activeTab]?.templateUrl;
    return settings[activeTab]?.page2?.templateUrl;
  };

  const clearActiveTemplate = () => {
    if (activePage === 1) {
      setSettings((prev) => ({
        ...prev,
        [activeTab]: { ...prev[activeTab], templateUrl: null },
      }));
    } else {
      setSettings((prev) => ({
        ...prev,
        [activeTab]: {
          ...prev[activeTab],
          page2: { ...prev[activeTab]?.page2, templateUrl: null },
        },
      }));
    }
  };

  const updateElement = (id: string, updates: Partial<TextElement>) => {
    setSettings((prev) => {
      const typeConfig = prev[activeTab] || {
        orientation: "landscape",
        templateUrl: null,
        elements: [],
      };
      if (activePage === 1) {
        const newElements = (typeConfig.elements || []).map((el) =>
          el.id === id ? { ...el, ...updates } : el,
        );
        return {
          ...prev,
          [activeTab]: { ...typeConfig, elements: newElements },
        };
      } else {
        const page2 = typeConfig.page2 || {
          enabled: true,
          templateUrl: null,
          elements: [],
        };
        const newElements = (page2.elements || []).map((el) =>
          el.id === id ? { ...el, ...updates } : el,
        );
        return {
          ...prev,
          [activeTab]: {
            ...typeConfig,
            page2: { ...page2, elements: newElements },
          },
        };
      }
    });
  };

  const addElement = () => {
    const newId = "e_" + Date.now();
    const newElement = {
      id: newId,
      text: "Teks Baru {{nama}}",
      x: 50,
      y: 50,
      fontSize: 12,
      fontFamily: "bookman",
      fontWeight: "normal",
      color: "#000000",
      textAlign: "center",
      width: 80,
    };

    setSettings((prev) => {
      const typeConfig = prev[activeTab] || {
        orientation: "landscape",
        templateUrl: null,
        elements: [],
      };
      if (activePage === 1) {
        return {
          ...prev,
          [activeTab]: {
            ...typeConfig,
            elements: [...(typeConfig.elements || []), newElement],
          },
        };
      } else {
        const page2 = typeConfig.page2 || {
          enabled: true,
          templateUrl: null,
          elements: [],
        };
        return {
          ...prev,
          [activeTab]: {
            ...typeConfig,
            page2: {
              ...page2,
              elements: [...(page2.elements || []), newElement],
            },
          },
        };
      }
    });
    setActiveEditElementId(newId);
  };

  const addIdentityTableElement = () => {
    const newId = "tabel_identitas_" + Date.now();
    const newElement = {
      id: newId,
      text: "Nama : {{nama}}\nNIP/NIK : {{nip}}\nInstansi : {{instansi}}",
      x: 50,
      y: 40,
      fontSize: 18,
      fontFamily: "bookman",
      fontWeight: "normal",
      color: "#000000",
      textAlign: "left" as const,
      width: 85,
    };

    setSettings((prev) => {
      const typeConfig = prev[activeTab] || {
        orientation: "landscape",
        templateUrl: null,
        elements: [],
      };
      if (activePage === 1) {
        return {
          ...prev,
          [activeTab]: {
            ...typeConfig,
            elements: [...(typeConfig.elements || []), newElement],
          },
        };
      } else {
        const page2 = typeConfig.page2 || {
          enabled: true,
          templateUrl: null,
          elements: [],
        };
        return {
          ...prev,
          [activeTab]: {
            ...typeConfig,
            page2: {
              ...page2,
              elements: [...(page2.elements || []), newElement],
            },
          },
        };
      }
    });
    setActiveEditElementId(newId);
  };

  const addImageElement = () => {
    const newId = "img_" + Date.now();
    const newElement = {
      id: newId,
      type: "image" as const,
      text: "Logo / Tanda Tangan",
      imageUrl: "",
      x: 50,
      y: 80,
      fontSize: 12,
      fontFamily: "bookman",
      fontWeight: "normal",
      color: "#000000",
      textAlign: "center" as const,
      width: 15,
      height: 10,
    };

    setSettings((prev) => {
      const typeConfig = prev[activeTab] || {
        orientation: "landscape",
        templateUrl: null,
        elements: [],
      };
      if (activePage === 1) {
        return {
          ...prev,
          [activeTab]: {
            ...typeConfig,
            elements: [...(typeConfig.elements || []), newElement],
          },
        };
      } else {
        const page2 = typeConfig.page2 || {
          enabled: true,
          templateUrl: null,
          elements: [],
        };
        return {
          ...prev,
          [activeTab]: {
            ...typeConfig,
            page2: {
              ...page2,
              elements: [...(page2.elements || []), newElement],
            },
          },
        };
      }
    });
    setActiveEditElementId(newId);
  };

  const addStudentPhotoElement = () => {
    const newId = "photo_" + Date.now();
    const newElement = {
      id: newId,
      type: "image" as const,
      text: "Foto Peserta (3x4)",
      imageUrl: "{{foto}}",
      x: 80,
      y: 50,
      fontSize: 12,
      fontFamily: "bookman",
      fontWeight: "normal",
      color: "#000000",
      textAlign: "center" as const,
      width: 12,
      height: 16, // Approx 3:4 ratio relative to 100% width/height
    };

    setSettings((prev) => {
      const typeConfig = prev[activeTab] || {
        orientation: "landscape",
        templateUrl: null,
        elements: [],
      };
      if (activePage === 1) {
        return {
          ...prev,
          [activeTab]: {
            ...typeConfig,
            elements: [...(typeConfig.elements || []), newElement],
          },
        };
      } else {
        const page2 = typeConfig.page2 || {
          enabled: true,
          templateUrl: null,
          elements: [],
        };
        return {
          ...prev,
          [activeTab]: {
            ...typeConfig,
            page2: {
              ...page2,
              elements: [...(page2.elements || []), newElement],
            },
          },
        };
      }
    });
    setActiveEditElementId(newId);
  };

  const duplicateElement = (id: string) => {
    const sourceElement = activeElements.find((el) => el.id === id);
    if (!sourceElement) return;

    const newId = (sourceElement.type === "image" ? "img_" : "e_") + Date.now();
    const newElement = {
      ...sourceElement,
      id: newId,
      x: Math.min(100, (sourceElement.x || 0) + 3), // Slightly offset for visibility
      y: Math.min(100, (sourceElement.y || 0) + 3),
    };

    setSettings((prev) => {
      const typeConfig = prev[activeTab] || {
        orientation: "landscape",
        templateUrl: null,
        elements: [],
      };
      if (activePage === 1) {
        return {
          ...prev,
          [activeTab]: {
            ...typeConfig,
            elements: [...(typeConfig.elements || []), newElement],
          },
        };
      } else {
        const page2 = typeConfig.page2 || {
          enabled: true,
          templateUrl: null,
          elements: [],
        };
        return {
          ...prev,
          [activeTab]: {
            ...typeConfig,
            page2: {
              ...page2,
              elements: [...(page2.elements || []), newElement],
            },
          },
        };
      }
    });
    setActiveEditElementId(newId);
  };

  const removeElement = (id: string) => {
    setSettings((prev) => {
      const typeConfig = prev[activeTab] || {
        orientation: "landscape",
        templateUrl: null,
        elements: [],
      };
      if (activePage === 1) {
        return {
          ...prev,
          [activeTab]: {
            ...typeConfig,
            elements: (typeConfig.elements || []).filter(
              (el) => el.id !== id,
            ),
          },
        };
      } else {
        const page2 = typeConfig.page2 || {
          enabled: true,
          templateUrl: null,
          elements: [],
        };
        return {
          ...prev,
          [activeTab]: {
            ...typeConfig,
            page2: {
              ...page2,
              elements: (page2.elements || []).filter(
                (el) => el.id !== id,
              ),
            },
          },
        };
      }
    });
    if (activeEditElementId === id) setActiveEditElementId(null);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setMessage(null);
    try {
      const result = await updateCertificateSettings(settings);
      if (result.success) {
        setMessage({
          type: "success",
          text: "Pengaturan tata letak dan template berhasil disimpan secara global!",
        });
        router.refresh();
      } else {
        setMessage({ type: "error", text: "Gagal menyimpan pengaturan." });
      }
    } catch {
      setMessage({ type: "error", text: "Terjadi kesalahan sistem." });
    }
    setIsSaving(false);

    // Auto-clear message after 4 seconds
    setTimeout(() => setMessage(null), 4000);
  };

  const previewData = {
    certificateNumber: "BPSDM/2026/001-PRVW",
    date: "8 April 2026",
    issueDate: "8 April 2026",
    activityDate: "1 - 5 April 2026",
    studentName: "Budi Santoso, S.STP.",
    nip: "199501012020011001",
    grade: "Penata Muda / III/a",
    position: "Analis Kebijakan Ahli Pertama",
    institution: "Sekretariat Daerah Provinsi Kalimantan Utara",
    courseName: "Kepemimpinan Digital di Pemerintahan",
    hours: 40,
    certificateType: activeTab,
    photoUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=400&h=533",
  };

  const activeElements =
    activePage === 1
      ? settings[activeTab]?.elements || []
      : settings[activeTab]?.page2?.elements || [];

  // Reset to page 1 when switching document type
  const handleTabSwitch = (tabId: CertificateKind) => {
    setActiveTab(tabId);
    setActivePage(1);
    setActiveEditElementId(null);
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 items-start pb-20">
      {/* Left Col: Controls */}
      <div className="space-y-6">
        {/* Global Tab Selection */}
        <div className="bg-white dark:bg-[#161B2A] border border-oxford-200 dark:border-oxford-700 rounded-2xl p-6 shadow-sm">
          <h3 className="font-bold text-lg text-oxford-900 dark:text-white mb-4">
            Pilih Jenis Dokumen
          </h3>
          <div className="flex bg-oxford-100 dark:bg-[#161B2A] p-1 rounded-xl">
            {([
              { id: "sertifikat", label: "Sertifikat Kompetensi" },
              { id: "surat_keterangan", label: "Surat Keterangan" },
              { id: "sttp", label: "STTP" },
            ] satisfies Array<{ id: CertificateKind; label: string }>).map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabSwitch(tab.id)}
                className={`flex-1 py-3 text-sm font-bold rounded-lg transition-all ${activeTab === tab.id ? "bg-white dark:bg-[#161B2A] text-gold-600 shadow-sm border border-oxford-200 dark:border-oxford-700" : "text-oxford-500 dark:text-oxford-400 hover:text-oxford-700 dark:hover:text-oxford-200"}`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Orientation Toggle */}
        <div className="bg-white dark:bg-[#161B2A] border border-oxford-200 dark:border-oxford-700 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="font-bold text-lg text-oxford-900 dark:text-white">
                Orientasi Halaman
              </h3>
              <p className="text-xs text-oxford-500 dark:text-oxford-400">
                Atur orientasi sertifikat sesuai kebutuhan.
              </p>
            </div>
          </div>
          <div className="flex bg-oxford-100 dark:bg-[#161B2A] p-1 rounded-xl mt-4">
            <button
              onClick={() => {
                if (isPortrait) toggleOrientation();
              }}
              className={`flex-1 py-3 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${!isPortrait ? "bg-white dark:bg-[#161B2A] text-gold-600 shadow-sm border border-oxford-200 dark:border-oxford-700" : "text-oxford-500 dark:text-oxford-400 hover:text-oxford-700 dark:hover:text-oxford-200"}`}
            >
              <div className="w-5 h-3.5 border-2 border-current rounded-[2px]" />
              Landscape
            </button>
            <button
              onClick={() => {
                if (!isPortrait) toggleOrientation();
              }}
              className={`flex-1 py-3 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${isPortrait ? "bg-white dark:bg-[#161B2A] text-gold-600 shadow-sm border border-oxford-200 dark:border-oxford-700" : "text-oxford-500 dark:text-oxford-400 hover:text-oxford-700 dark:hover:text-oxford-200"}`}
            >
              <div className="w-3.5 h-5 border-2 border-current rounded-[2px]" />
              Portrait
            </button>
          </div>
        </div>

        {/* Page 2 Toggle */}
        <div className="bg-white dark:bg-[#161B2A] border border-oxford-200 dark:border-oxford-700 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-lg text-oxford-900 dark:text-white flex items-center gap-2">
                <Layers size={18} className="text-oxford-400" />
                Lembar ke-2 (Opsional)
              </h3>
              <p className="text-xs text-oxford-500 dark:text-oxford-400 mt-1">
                Aktifkan halaman belakang atau lampiran sertifikat.
              </p>
            </div>
            <button
              onClick={togglePage2}
              className={`relative w-14 h-7 rounded-full transition-all duration-300 ${isPage2Enabled() ? "bg-gold-500" : "bg-oxford-200 dark:bg-oxford-800"}`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white dark:bg-[#161B2A] rounded-full shadow-md transition-transform duration-300 ${isPage2Enabled() ? "translate-x-7" : "translate-x-0"}`}
              />
            </button>
          </div>

          {/* Page switcher (only if page2 is enabled) */}
          <AnimatePresence>
            {isPage2Enabled() && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="flex bg-oxford-100 dark:bg-[#161B2A] p-1 rounded-xl mt-4">
                  <button
                    onClick={() => {
                      setActivePage(1);
                      setActiveEditElementId(null);
                    }}
                    className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${activePage === 1 ? "bg-white dark:bg-[#161B2A] text-gold-600 shadow-sm border border-oxford-200 dark:border-oxford-700" : "text-oxford-500 dark:text-oxford-400 hover:text-oxford-700 dark:hover:text-oxford-200"}`}
                  >
                    <FileText size={13} /> Halaman 1 (Depan)
                  </button>
                  <button
                    onClick={() => {
                      setActivePage(2);
                      setActiveEditElementId(null);
                    }}
                    className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${activePage === 2 ? "bg-white dark:bg-[#161B2A] text-gold-600 shadow-sm border border-oxford-200 dark:border-oxford-700" : "text-oxford-500 dark:text-oxford-400 hover:text-oxford-700 dark:hover:text-oxford-200"}`}
                  >
                    <FileText size={13} /> Halaman 2 (Belakang)
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="bg-white dark:bg-[#161B2A] border border-oxford-200 dark:border-oxford-700 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-bold text-lg text-oxford-900 dark:text-white">
              Background Image{" "}
              {activePage === 2 && (
                <span className="text-xs text-gold-600 font-normal ml-1">
                  (Hal. 2)
                </span>
              )}
            </h3>
          </div>
          <p className="text-xs text-oxford-500 dark:text-oxford-400 mb-6">
            File gambar {isPortrait ? "portrait" : "landscape"} resolusi tinggi
            (Proporsi A4).
          </p>

          <div className="bg-oxford-50 dark:bg-oxford-950 border-2 border-dashed border-oxford-200 dark:border-oxford-700 rounded-2xl p-6 text-center focus-within:border-gold-500 transition-colors">
            <input
              key={`upload-${activeTab}-${activePage}`} // Force remount per tab+page
              type="file"
              id="admin-template-upload"
              accept="image/*"
              onChange={handleTemplateUpload}
              className="hidden"
            />
            <div className="flex flex-col gap-3 items-center">
              {getActiveTemplateUrl() ? (
                <div className="text-sm font-bold text-emerald-600 mb-2">
                  Templat Kustom Terpasang
                </div>
              ) : null}
              <label
                htmlFor="admin-template-upload"
                className="px-6 py-2.5 bg-oxford-900 text-white rounded-xl font-bold text-sm cursor-pointer hover:bg-oxford-800 transition-colors shadow-sm inline-flex items-center gap-2"
              >
                <ImageIcon size={16} /> Unggah Gambar Bkg (
                {activeTab === "sertifikat"
                  ? "Sertifikat"
                  : activeTab === "surat_keterangan"
                    ? "SukT"
                    : "STTP"}
                {activePage === 2 ? " - Hal.2" : ""})
              </label>
              <button
                onClick={() => {
                  setMediaPickerMode("background");
                  setIsMediaPickerOpen(true);
                }}
                className="px-6 py-2.5 bg-white dark:bg-[#161B2A] border-2 border-oxford-200 dark:border-oxford-700 text-oxford-700 dark:text-oxford-200 rounded-xl font-bold text-sm hover:border-gold-500 hover:text-gold-600 transition-all shadow-sm inline-flex items-center gap-2"
              >
                <Search size={16} /> Pilih dari Galeri
              </button>
              {getActiveTemplateUrl() && (
                <button
                  onClick={clearActiveTemplate}
                  className="text-xs font-bold text-crimson-600 hover:text-crimson-500 mt-2 flex items-center gap-1"
                >
                  <Trash2 size={12} /> Hapus kustom
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-[#161B2A] border border-oxford-200 dark:border-oxford-700 rounded-2xl p-6 shadow-sm">
          <h3 className="font-bold text-lg text-oxford-900 dark:text-white mb-3 flex items-center gap-2">
            <AlertCircle size={18} className="text-gold-500" />
            Daftar Tag yang Didukung
          </h3>
          <p className="text-xs text-oxford-500 dark:text-oxford-400 mb-4">
            Tag ini akan diganti otomatis dengan data pengguna saat sertifikat dicetak.
          </p>
          <div className="bg-oxford-50 dark:bg-oxford-950 border border-oxford-200 dark:border-oxford-700 rounded-xl p-4 text-xs text-oxford-700 dark:text-oxford-200">
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              <div className="flex justify-between border-b border-oxford-100 dark:border-oxford-800 pb-1"><span>Nomor:</span> <code className="text-gold-700 font-bold">{"{{nomor}}"}</code></div>
              <div className="flex justify-between border-b border-oxford-100 dark:border-oxford-800 pb-1"><span>Nama:</span> <code className="text-gold-700 font-bold">{"{{nama}}"}</code></div>
              <div className="flex justify-between border-b border-oxford-100 dark:border-oxford-800 pb-1"><span>NIP:</span> <code className="text-gold-700 font-bold">{"{{nip}}"}</code></div>
              <div className="flex justify-between border-b border-oxford-100 dark:border-oxford-800 pb-1"><span>Pangkat:</span> <code className="text-gold-700 font-bold">{"{{pangkat}}"}</code></div>
              <div className="flex justify-between border-b border-oxford-100 dark:border-oxford-800 pb-1"><span>Jabatan:</span> <code className="text-gold-700 font-bold">{"{{jabatan}}"}</code></div>
              <div className="flex justify-between border-b border-oxford-100 dark:border-oxford-800 pb-1"><span>Instansi:</span> <code className="text-gold-700 font-bold">{"{{instansi}}"}</code></div>
              <div className="flex justify-between border-b border-oxford-100 dark:border-oxford-800 pb-1"><span>Kursus:</span> <code className="text-gold-700 font-bold">{"{{kursus}}"}</code></div>
              <div className="flex justify-between border-b border-oxford-100 dark:border-oxford-800 pb-1"><span>JP:</span> <code className="text-gold-700 font-bold">{"{{jp}}"}</code></div>
              
              <div className="col-span-2 mt-2 font-bold text-emerald-700 text-[10px] uppercase tracking-widest">Data Kelahiran</div>
              <div className="flex justify-between border-b border-oxford-100 dark:border-oxford-800 pb-1"><span>TTL Lengkap:</span> <code className="text-emerald-700 font-bold">{"{{ttl}}"}</code></div>
              <div className="flex justify-between border-b border-oxford-100 dark:border-oxford-800 pb-1"><span>Tempat Akhir:</span> <code className="text-emerald-700 font-bold">{"{{tempat_lahir}}"}</code></div>
              <div className="col-span-2 flex justify-between border-b border-oxford-100 dark:border-oxford-800 pb-1"><span>Tanggal Lahir:</span> <code className="text-emerald-700 font-bold">{"{{tanggal_lahir}}"}</code></div>
              
              <div className="col-span-2 mt-2 font-bold text-violet-700 text-[10px] uppercase tracking-widest">Data Tanggal</div>
              <div className="col-span-2 flex justify-between border-b border-oxford-100 dark:border-oxford-800 pb-1"><span>Tanggal Terbit:</span> <code className="text-violet-700 font-bold">{"{{tanggal_terbit}}"}</code></div>
              <div className="col-span-2 flex justify-between"><span>Tanggal Kegiatan:</span> <code className="text-violet-700 font-bold">{"{{tanggal_kegiatan}}"}</code></div>
            </div>
          </div>
        </div>

        {/* Elements Editor */}
        <div className="bg-white dark:bg-[#161B2A] border border-oxford-200 dark:border-oxford-700 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-lg text-oxford-900 dark:text-white">
                Tata Letak
                {activePage === 2 && (
                  <span className="text-xs text-gold-600 font-normal ml-2">
                    — Halaman 2
                  </span>
                )}
              </h3>
              <p className="text-xs text-oxford-500 dark:text-oxford-400">
                Edit isi letak dan gaya tipe huruf langsung.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={addIdentityTableElement}
                className="p-2 border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 rounded-lg hover:border-emerald-500 hover:bg-emerald-100 flex gap-2 text-xs font-bold items-center transition-colors"
              >
                <FileText size={14} /> + Tabel Identitas
              </button>
              <button
                onClick={addElement}
                className="p-2 border border-oxford-200 dark:border-oxford-700 text-oxford-600 dark:text-oxford-300 rounded-lg hover:border-gold-500 hover:text-gold-600 flex gap-2 text-xs font-bold items-center transition-colors"
              >
                <Plus size={14} /> Teks Baru
              </button>
              <button
                onClick={addImageElement}
                className="p-2 border border-oxford-200 dark:border-oxford-700 text-oxford-600 dark:text-oxford-300 rounded-lg hover:border-violet-500 hover:text-violet-600 flex gap-2 text-xs font-bold items-center transition-colors"
              >
                <Upload size={14} /> Logo/Tanda Tangan
              </button>
              <button
                onClick={addStudentPhotoElement}
                className="p-2 border border-oxford-200 dark:border-oxford-700 text-oxford-600 dark:text-oxford-300 rounded-lg hover:border-emerald-500 hover:text-emerald-600 flex gap-2 text-xs font-bold items-center transition-colors"
              >
                <ImageIcon size={14} /> Foto Peserta
              </button>
            </div>
          </div>

          {activeElements.length === 0 && (
            <div className="text-center py-8 text-oxford-400">
              <Layers size={32} className="mx-auto mb-3 opacity-40" />
              <p className="text-sm font-medium">
                Belum ada elemen di{" "}
                {activePage === 2 ? "halaman 2" : "halaman ini"}.
              </p>
              <p className="text-xs mt-1">
                Klik &quot;Element Baru&quot; untuk menambahkan.
              </p>
            </div>
          )}

          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 pb-4">
            {activeElements.map((el) => (
              <div
                key={el.id}
                className={`border rounded-xl transition-colors ${activeEditElementId === el.id ? "border-gold-500 shadow-md bg-white dark:bg-[#161B2A]" : "border-oxford-200 dark:border-oxford-700 bg-oxford-50 dark:bg-oxford-950/50 hover:border-oxford-300 dark:hover:border-oxford-600"}`}
              >
                <div
                  className="p-3 flex justify-between items-center cursor-pointer group"
                  onClick={() =>
                    setActiveEditElementId(
                      activeEditElementId === el.id ? null : el.id,
                    )
                  }
                >
                  <div className="font-mono text-xs font-bold text-oxford-800 dark:text-oxford-100 line-clamp-1 w-3/4 flex items-center gap-2">
                    {el.type === "image" ? (
                      <ImageIcon
                        size={12}
                        className="text-violet-500 shrink-0"
                      />
                    ) : (
                      <Edit2
                        size={12}
                        className="text-oxford-400 group-hover:text-gold-600 transition-colors shrink-0"
                      />
                    )}
                    <span
                      className={el.type === "image" ? "text-violet-700" : ""}
                    >
                      {el.type === "image" ? `🖼 ${el.text}` : el.text}
                    </span>
                  </div>
                  <div className="flex gap-1.5 items-center">
                    <div className="text-[10px] text-oxford-400 bg-oxford-100 dark:bg-[#161B2A] px-2 py-0.5 rounded group-hover:bg-gold-50">
                      Klik utk Edit
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        duplicateElement(el.id);
                      }}
                      className="text-oxford-400 hover:text-gold-600 p-1 transition-colors"
                      title="Duplikat"
                    >
                      <Copy size={13} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeElement(el.id);
                      }}
                      className="text-oxford-400 hover:text-crimson-500 p-1"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {activeEditElementId === el.id && (
                  <div className="p-4 border-t border-oxford-100 dark:border-oxford-800 bg-white dark:bg-[#161B2A] rounded-b-xl space-y-4">
                    {/* --- IMAGE ELEMENT EDITOR --- */}
                    {el.type === "image" ? (
                      <>
                        <div>
                          <label className="text-[10px] text-oxford-500 dark:text-oxford-400 font-bold uppercase tracking-widest mb-1 block">
                            Label (untuk referensi)
                          </label>
                          <input
                            type="text"
                            value={el.text}
                            onChange={(e) =>
                              updateElement(el.id, { text: e.target.value })
                            }
                            className="w-full text-sm border-oxford-200 dark:border-oxford-700 border rounded-lg p-2 focus:ring-1 focus:border-gold-500"
                            placeholder="cth: Logo Pemprov, TTD Kepala"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-oxford-500 dark:text-oxford-400 font-bold uppercase tracking-widest mb-2 block">
                            Upload Gambar
                          </label>
                          <div className="bg-oxford-50 dark:bg-oxford-950 border-2 border-dashed border-oxford-200 dark:border-oxford-700 rounded-xl p-4 text-center">
                            <input
                              type="file"
                              id={`img-upload-${el.id}`}
                              accept="image/*"
                              className="hidden"
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  if (file.size > 5 * 1024 * 1024) {
                                    alert("Maksimal 5MB");
                                    return;
                                  }

                                  setIsSaving(true);
                                  try {
                                    const formData = new FormData();
                                    formData.append("file", file);
                                    const res = await fetch("/api/upload", {
                                      method: "POST",
                                      body: formData,
                                    });
                                    const result = await res.json();
                                    if (result.success) {
                                      updateElement(el.id, {
                                        imageUrl: result.url,
                                      });
                                    } else {
                                      alert("Gagal upload: " + result.error);
                                    }
                                  } catch {
                                    alert("Error saat mengunggah gambar.");
                                  } finally {
                                    setIsSaving(false);
                                  }
                                }
                              }}
                            />
                            {el.imageUrl ? (
                              <div className="flex flex-col items-center gap-2">
                                <NextImage
                                  src={el.imageUrl}
                                  alt="Preview"
                                  width={160}
                                  height={80}
                                  unoptimized
                                  className="max-h-20 object-contain rounded border border-oxford-200 dark:border-oxford-700"
                                />
                                <div className="flex gap-2">
                                  <label
                                    htmlFor={`img-upload-${el.id}`}
                                    className="text-xs font-bold text-gold-700 hover:text-gold-600 cursor-pointer"
                                  >
                                    Ganti
                                  </label>
                                  <button
                                    onClick={() => {
                                      setActiveEditElementId(el.id);
                                      setMediaPickerMode("element");
                                      setIsMediaPickerOpen(true);
                                    }}
                                    className="text-xs font-bold text-oxford-600 dark:text-oxford-300 hover:text-oxford-900 dark:hover:text-white"
                                  >
                                    Pilih Galeri
                                  </button>
                                  <button
                                    onClick={() =>
                                      updateElement(el.id, { imageUrl: "" })
                                    }
                                    className="text-xs font-bold text-crimson-600 hover:text-crimson-500"
                                  >
                                    Hapus
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex flex-col gap-2">
                                <label
                                  htmlFor={`img-upload-${el.id}`}
                                  className="cursor-pointer flex flex-col items-center gap-2 py-4 bg-oxford-50 dark:bg-oxford-950 border border-dashed border-oxford-200 dark:border-oxford-700 rounded-lg hover:border-gold-300"
                                >
                                  <Upload
                                    size={20}
                                    className="text-oxford-400"
                                  />
                                  <span className="text-xs font-bold text-oxford-600 dark:text-oxford-300">
                                    Unggah Gambar
                                  </span>
                                </label>
                                <button
                                  onClick={() => {
                                    setActiveEditElementId(el.id);
                                    setMediaPickerMode("element");
                                    setIsMediaPickerOpen(true);
                                  }}
                                  className="w-full py-2 bg-white dark:bg-[#161B2A] border border-oxford-200 dark:border-oxford-700 rounded-lg text-xs font-bold text-oxford-700 dark:text-oxford-200 hover:border-gold-500 hover:text-gold-600 transition-all flex items-center justify-center gap-2"
                                >
                                  <Search size={14} /> Pilih dari Galeri Media
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-[10px] text-oxford-500 dark:text-oxford-400 font-bold uppercase tracking-widest block mb-2 flex justify-between">
                              Posisi X (Horizontal) <span>{el.x || 0}%</span>
                            </label>
                            <input
                              type="range"
                              min="0"
                              max="100"
                              value={el.x || 0}
                              onChange={(e) =>
                                updateElement(el.id, {
                                  x: parseInt(e.target.value) || 0,
                                })
                              }
                              className="w-full accent-gold-500"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-oxford-500 dark:text-oxford-400 font-bold uppercase tracking-widest block mb-2 flex justify-between">
                              Posisi Y (Vertical) <span>{el.y || 0}%</span>
                            </label>
                            <input
                              type="range"
                              min="0"
                              max="100"
                              value={el.y || 0}
                              onChange={(e) =>
                                updateElement(el.id, {
                                  y: parseInt(e.target.value) || 0,
                                })
                              }
                              className="w-full accent-gold-500"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-[10px] text-oxford-500 dark:text-oxford-400 font-bold uppercase tracking-widest block mb-2 flex justify-between">
                              Lebar <span>{el.width || 0}%</span>
                            </label>
                            <input
                              type="range"
                              min="1"
                              max="80"
                              value={el.width || 1}
                              onChange={(e) =>
                                updateElement(el.id, {
                                  width: parseInt(e.target.value) || 1,
                                })
                              }
                              className="w-full accent-violet-500"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-oxford-500 dark:text-oxford-400 font-bold uppercase tracking-widest block mb-2 flex justify-between">
                              Tinggi <span>{el.height || 10}%</span>
                            </label>
                            <input
                              type="range"
                              min="1"
                              max="50"
                              value={el.height || 10}
                              onChange={(e) =>
                                updateElement(el.id, {
                                  height: parseInt(e.target.value) || 1,
                                })
                              }
                              className="w-full accent-violet-500"
                            />
                          </div>
                        </div>
                      </>
                    ) : (
                      /* --- TEXT ELEMENT EDITOR (existing) --- */
                      <>
                        <div>
                          <label className="text-[10px] text-oxford-500 dark:text-oxford-400 font-bold uppercase tracking-widest mb-1 block">
                            Teks / Tag Markdown
                          </label>
                          <textarea
                            value={el.text}
                            onChange={(e) =>
                              updateElement(el.id, { text: e.target.value })
                            }
                            className="w-full text-sm border-oxford-200 dark:border-oxford-700 border rounded-lg p-2 focus:ring-1 focus:border-gold-500 resize-y"
                            rows={3}
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-[10px] text-oxford-500 dark:text-oxford-400 font-bold uppercase tracking-widest block mb-2 flex justify-between">
                              Posisi X (Horizontal) <span>{el.x || 0}%</span>
                            </label>
                            <input
                              type="range"
                              min="0"
                              max="100"
                              value={el.x || 0}
                              onChange={(e) =>
                                updateElement(el.id, {
                                  x: parseInt(e.target.value) || 0,
                                })
                              }
                              className="w-full accent-gold-500"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-oxford-500 dark:text-oxford-400 font-bold uppercase tracking-widest block mb-2 flex justify-between">
                              Posisi Y (Vertical) <span>{el.y || 0}%</span>
                            </label>
                            <input
                              type="range"
                              min="0"
                              max="100"
                              value={el.y || 0}
                              onChange={(e) =>
                                updateElement(el.id, {
                                  y: parseInt(e.target.value) || 0,
                                })
                              }
                              className="w-full accent-gold-500"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-[10px] text-oxford-500 dark:text-oxford-400 font-bold uppercase tracking-widest mb-1 block">
                              Ukuran Font
                            </label>
                            <input
                              type="number"
                              value={el.fontSize || 0}
                              onChange={(e) =>
                                updateElement(el.id, {
                                  fontSize: parseInt(e.target.value) || 0,
                                })
                              }
                              className="w-full text-sm border-oxford-200 dark:border-oxford-700 border rounded-lg p-2"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-oxford-500 dark:text-oxford-400 font-bold uppercase tracking-widest mb-1 block">
                              Warna
                            </label>
                            <input
                              type="color"
                              value={el.color}
                              onChange={(e) =>
                                updateElement(el.id, { color: e.target.value })
                              }
                              className="w-full h-9 border border-oxford-200 dark:border-oxford-700 rounded p-0 cursor-pointer"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <select
                              value={el.fontFamily}
                              onChange={(e) =>
                                updateElement(el.id, {
                                  fontFamily: e.target.value,
                                })
                              }
                              className="w-full text-[10px] uppercase font-bold border-oxford-200 dark:border-oxford-700 border rounded p-1.5 focus:border-gold-500"
                            >
                              <option value="bookman">Bookman Old Style</option>
                              <option value="sans">Sans-Serif (Inter)</option>
                              <option value="serif">Serif (Georgia)</option>
                              <option value="mono">Monospace</option>
                            </select>
                          </div>
                          <div>
                            <select
                              value={el.fontWeight}
                              onChange={(e) =>
                                updateElement(el.id, {
                                  fontWeight: e.target.value,
                                })
                              }
                              className="w-full text-[10px] uppercase font-bold border-oxford-200 dark:border-oxford-700 border rounded p-1.5 focus:border-gold-500"
                            >
                              <option value="normal">Reguler</option>
                              <option value="bold">Bold</option>
                            </select>
                          </div>
                          <div>
                            <select
                              value={el.textAlign}
                              onChange={(e) =>
                                updateElement(el.id, {
                                  textAlign: e.target.value as TextElement["textAlign"],
                                })
                              }
                              className="w-full text-[10px] uppercase font-bold border-oxford-200 dark:border-oxford-700 border rounded p-1.5 focus:border-gold-500"
                            >
                              <option value="left">Kiri</option>
                              <option value="center">Tengah</option>
                              <option value="right">Kanan</option>
                              <option value="justify">
                                Justify (Rata Kiri-Kanan)
                              </option>
                            </select>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Save Button */}
        <div className="sticky bottom-6 flex flex-col gap-3">
          <AnimatePresence>
            {message && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className={`p-4 rounded-xl flex items-center gap-3 text-sm font-medium ${message.type === "success" ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-crimson-50 text-crimson-800 border border-crimson-200"}`}
              >
                {message.type === "success" ? (
                  <CheckCircle size={18} />
                ) : (
                  <AlertCircle size={18} />
                )}
                {message.text}
              </motion.div>
            )}
          </AnimatePresence>

          <button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full h-14 bg-gold-500 text-oxford-950 rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-gold-400 transition-all shadow-xl shadow-gold-500/20 disabled:opacity-50 text-base"
          >
            {isSaving ? (
              <div className="w-5 h-5 border-2 border-oxford-900 border-t-transparent rounded-full animate-spin" />
            ) : (
              <Save size={20} />
            )}
            Simpan Formasi Layout Global
          </button>
        </div>
      </div>

      {/* Right Col: Live Preview */}
      <div className="xl:sticky xl:top-28">
        <div className="mb-4 flex items-center justify-between px-2">
          <h3 className="font-bold text-oxford-900 dark:text-white uppercase tracking-widest text-xs flex items-center gap-2">
            <span>Preview Integrasi Layout</span>
            <span className="bg-emerald-100 text-emerald-700 px-2.5 py-0.5 rounded-full lowercase tracking-normal bg-opacity-70">
              {activeTab}
            </span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold tracking-normal ${isPortrait ? "bg-violet-100 text-violet-700" : "bg-blue-100 text-blue-700"}`}
            >
              {isPortrait ? "Portrait" : "Landscape"}
            </span>
          </h3>
        </div>
        {/* 
                  Wrapper div acts as scaling view for a 4K resolution native component.
                  We force wrapper to exact ratio, and content is absolutely expanded so percentages work flawlessly.
                */}
        <div
          className="bg-white dark:bg-[#161B2A] border border-oxford-200 dark:border-oxford-700 rounded-lg shadow-2xl overflow-hidden relative w-full group"
          style={{ aspectRatio: isPortrait ? "1 / 1.414" : "1.414 / 1" }}
        >
          <div className="absolute inset-0 origin-top-left font-sans text-oxford-400 flex items-center justify-center">
            Memuat Render Real-Time...
          </div>
          <div className="absolute inset-0 z-10 bg-white dark:bg-[#161B2A] overflow-y-auto">
            <CertificateView data={previewData} config={settings[activeTab]} />
          </div>
        </div>
        <div className="mt-4 p-4 bg-oxford-50 dark:bg-oxford-950 border border-oxford-200 dark:border-oxford-700 rounded-xl flex gap-3 items-start">
          <div className="p-1 bg-white dark:bg-[#161B2A] border border-oxford-200 dark:border-oxford-700 text-oxford-600 dark:text-oxford-300 rounded-lg shrink-0 mt-0.5">
            <AlertCircle size={14} />
          </div>
          <p className="text-xs text-oxford-600 dark:text-oxford-300 leading-relaxed font-medium">
            Live Preview menampilkan letak elemen secara akurat berdasarkan
            koordinat presentase X dan Y, sehingga tidak akan meleset di
            perangkat manapun atau saat dicetak ke PDF proporsi kertas standar
            A4.
            {isPage2Enabled() &&
              " Scroll preview ke bawah untuk melihat halaman 2."}
          </p>
        </div>
      </div>

      <MediaPicker
        isOpen={isMediaPickerOpen}
        onClose={() => setIsMediaPickerOpen(false)}
        onSelect={handleMediaSelect}
        allowedTypes={["image/"]}
      />
    </div>
  );
}
