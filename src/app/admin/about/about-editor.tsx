"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { saveAboutUsData, AboutUsData } from "@/app/actions/about";
import { Save, Plus, Trash2, Upload } from "lucide-react";

type OrganizationMember = {
  [key: string]: string | undefined;
  name: string;
  role: string;
  nip?: string;
  rank?: string;
  image?: string;
};

export default function AboutEditor({ initialData }: { initialData: AboutUsData }) {
  const router = useRouter();
  const [data, setData] = useState<AboutUsData>(initialData);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    const res = await saveAboutUsData(data);
    setIsSaving(false);
    if (res.success) {
      alert("Profil berhasil diperbarui!");
      router.refresh();
    } else {
      alert("Gagal merubah profil: " + res.error);
    }
  };

  const handleFieldChange = (key: keyof AboutUsData, value: AboutUsData[keyof AboutUsData]) => {
    setData((prev) => ({ ...prev, [key]: value }));
  };

  // Generic List Manager
  const renderListEditor = (
    listKey: "leaders" | "kabids" | "kasubbags" | "functionals",
    fields: string[],
    labels: string[]
  ) => {
    const list = data[listKey] as OrganizationMember[];

    const handleUpdateItem = (idx: number, field: string, val: string) => {
      const newList = [...list];
      newList[idx] = { ...newList[idx], [field]: val };
      handleFieldChange(listKey, newList);
    };

    const handleRemoveItem = (idx: number) => {
      const newList = list.filter((_, i) => i !== idx);
      handleFieldChange(listKey, newList);
    };

    const handleAddItem = () => {
      const newItem: Record<string, string> = {};
      fields.forEach(f => newItem[f] = "");
      handleFieldChange(listKey, [...list, newItem]);
    };

    const onFileChange = async (idx: number, field: string, file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      
      try {
        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });
        const result = await res.json();
        if (result.url) {
          handleUpdateItem(idx, field, result.url);
        } else {
          alert("Gagal mengunggah file: " + (result.error || "Pesan tidak diketahui"));
        }
      } catch {
        alert("Kesalahan jaringan saat mengunggah.");
      }
    };

    return (
      <div className="bg-white dark:bg-[#161B2A] p-6 rounded-xl shadow-sm border border-oxford-200 dark:border-oxford-700 mb-8">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-lg text-oxford-900 dark:text-white capitalize">{listKey}</h3>
          <button 
            onClick={handleAddItem}
            className="flex items-center gap-2 px-3 py-1.5 bg-oxford-100 dark:bg-[#161B2A] text-oxford-700 dark:text-oxford-200 hover:bg-oxford-200 dark:hover:bg-oxford-800 rounded-lg text-sm font-bold transition-colors"
          >
            <Plus size={16} /> Tambah
          </button>
        </div>
        <div className="space-y-4">
          {list.map((item, idx) => (
            <div key={idx} className="flex gap-4 items-start p-4 bg-oxford-50 dark:bg-oxford-950 border border-oxford-100 dark:border-oxford-800 rounded-lg relative group">
              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                {fields.map((field, fIdx) => (
                  <div key={field}>
                    <label className="block text-xs font-bold text-oxford-500 dark:text-oxford-400 mb-1">{labels[fIdx]}</label>
                    {field === "image" ? (
                      <div className="space-y-2">
                        {item[field] && (
                          <div className="relative w-16 h-16 rounded-full overflow-hidden border border-oxford-200 dark:border-oxford-700 shadow-sm mb-1 bg-white dark:bg-[#161B2A]">
                            <Image fill unoptimized src={item[field]} alt="Preview" className="object-cover" />
                          </div>
                        )}
                        <div className="flex gap-2">
                          <input 
                            type="text" 
                            placeholder="Atau tempel URL..."
                            value={item[field] || ""} 
                            onChange={(e) => handleUpdateItem(idx, field, e.target.value)}
                            className="flex-1 border border-oxford-200 dark:border-oxford-700 rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500 bg-white dark:bg-[#161B2A]"
                          />
                          <label className="flex items-center justify-center w-10 h-10 border border-oxford-200 dark:border-oxford-700 rounded-lg bg-white dark:bg-[#161B2A] hover:bg-oxford-100 dark:hover:bg-[#161B2A] cursor-pointer transition-colors shadow-sm" title="Upload Foto">
                            <Upload size={16} className="text-oxford-600 dark:text-oxford-300" />
                            <input 
                              type="file" 
                              className="hidden" 
                              accept="image/*"
                              onChange={(e) => e.target.files?.[0] && onFileChange(idx, field, e.target.files[0])}
                            />
                          </label>
                        </div>
                      </div>
                    ) : (
                      <input 
                        type="text" 
                        value={item[field] || ""} 
                        onChange={(e) => handleUpdateItem(idx, field, e.target.value)}
                        className="w-full border border-oxford-200 dark:border-oxford-700 rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500 bg-white dark:bg-[#161B2A]"
                      />
                    )}
                  </div>
                ))}
              </div>
              <button 
                onClick={() => handleRemoveItem(idx)}
                className="mt-6 p-2 text-crimson-500 hover:bg-crimson-50 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                title="Hapus"
              >
                <Trash2 size={18} />
              </button>
            </div>
          ))}
          {list.length === 0 && <p className="text-sm text-oxford-400 text-center py-4">Belum ada data.</p>}
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-4xl pb-20">
        
      {/* Teks Umum */}
      <div className="bg-white dark:bg-[#161B2A] p-6 rounded-xl shadow-sm border border-oxford-200 dark:border-oxford-700 mb-8">
        <h3 className="font-bold text-lg text-oxford-900 dark:text-white mb-4">Informasi Umum</h3>
        
        <div className="space-y-4">
            <div>
                <label className="block text-sm font-bold text-oxford-700 dark:text-oxford-200 mb-2">Nama Instansi (Title)</label>
                <input 
                  type="text" 
                  value={data.title} 
                  onChange={(e) => handleFieldChange("title", e.target.value)}
                  className="w-full border border-oxford-200 dark:border-oxford-700 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-gold-500"
                />
            </div>

            <div>
                <label className="block text-sm font-bold text-oxford-700 dark:text-oxford-200 mb-2">Penjelasan / Moto Utama (Subtitle)</label>
                <textarea 
                  value={data.subtitle} 
                  onChange={(e) => handleFieldChange("subtitle", e.target.value)}
                  className="w-full border border-oxford-200 dark:border-oxford-700 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-gold-500 h-24"
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                    <label className="block text-sm font-bold text-oxford-700 dark:text-oxford-200 mb-2">Visi</label>
                    <textarea 
                    value={data.vision} 
                    onChange={(e) => handleFieldChange("vision", e.target.value)}
                    className="w-full border border-oxford-200 dark:border-oxford-700 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-gold-500 h-24 text-sm"
                    />
                </div>
                <div>
                    <label className="block text-sm font-bold text-oxford-700 dark:text-oxford-200 mb-2">Misi</label>
                    <textarea 
                    value={data.mission} 
                    onChange={(e) => handleFieldChange("mission", e.target.value)}
                    className="w-full border border-oxford-200 dark:border-oxford-700 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-gold-500 h-24 text-sm"
                    />
                </div>
                <div>
                    <label className="block text-sm font-bold text-oxford-700 dark:text-oxford-200 mb-2">Budaya / Pelayanan</label>
                    <textarea 
                    value={data.values} 
                    onChange={(e) => handleFieldChange("values", e.target.value)}
                    className="w-full border border-oxford-200 dark:border-oxford-700 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-gold-500 h-24 text-sm"
                    />
                </div>
            </div>
        </div>
      </div>

      {/* Editor Arrays */}
      {renderListEditor("leaders", ["name", "role", "nip", "rank", "image"], ["Nama Lengkap", "Jabatan", "NIP", "Pangkat/Golongan", "URL Foto (Opsional)"])}
      {renderListEditor("kabids", ["name", "role", "nip", "rank", "image"], ["Nama Lengkap", "Jabatan", "NIP", "Pangkat/Golongan", "URL Foto (Opsional)"])}
      {renderListEditor("kasubbags", ["name", "role", "nip", "rank", "image"], ["Nama Lengkap", "Jabatan", "NIP", "Pangkat/Golongan", "URL Foto (Opsional)"])}
      {renderListEditor("functionals", ["name", "role", "image"], ["Nama Lengkap", "Peran Fungsional", "URL Foto (Opsional)"])}

      {/* Floating Save Action */}
      <div className="fixed bottom-0 left-0 right-0 lg:left-64 p-4 bg-white dark:bg-[#161B2A]/80 backdrop-blur-md border-t border-oxford-200 dark:border-oxford-700 flex justify-end px-8 z-50">
        <button 
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 px-8 py-3 bg-gold-500 hover:bg-gold-400 text-oxford-950 font-bold rounded-xl shadow-lg transition-colors disabled:opacity-50"
        >
          <Save size={20} />
          {isSaving ? "Menyimpan..." : "Simpan Perubahan Organisasi"}
        </button>
      </div>

    </div>
  );
}
