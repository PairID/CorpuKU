"use server";

import { sql } from "@/lib/db";
import { requireAdminSession } from "./auth";

export interface AboutUsData {
  taglines: string[];
  title: string;
  subtitle: string;
  vision: string;
  mission: string;
  values: string;
  leaders: AboutMember[];
  kabids: AboutMember[];
  kasubbags: AboutMember[];
  functionals: AboutMember[];
}

type AboutMember =
  | { name: string; role: string; nip?: string; rank?: string; image?: string }
  | Record<string, string>;

const defaultData: AboutUsData = {
  taglines: ["BerAKHLAK", "Bangga Melayani Bangsa"],
  title: "Badan Pengembangan Sumber Daya Manusia Provinsi Kalimantan Utara",
  subtitle: "Menciptakan Aparatur Sipil Negara yang kompeten, berdaya saing global, dan menjunjung tinggi nilai-nilai integritas untuk kemajuan penyelenggaraan pemerintahan di Provinsi Kalimantan Utara.",
  vision: "Mewujudkan SDM Aparatur yang Unggul dan Mandiri melalui ekosistem pembelajaran terintegrasi (Corporate University).",
  mission: "Menyelenggarakan pelatihan manajerial, teknis, fungsional, serta sertifikasi yang akuntabel dan inovatif.",
  values: "Berakar pada budaya kerja BerAKHLAK untuk mencetak birokrat profesional berkelas dunia.",
  leaders: [
    { name: "H. ROHADI, S.E., M.AP.", role: "Kepala BPSDM", nip: "196605021992031010", rank: "Pembina Utama Madya (IV/d)" },
    { name: "SIPTA MEYLINA, S.Psi., M.M.", role: "Sekretaris", nip: "197805212005012010", rank: "Pembina Tingkat I (IV/b)" }
  ],
  kabids: [
    { name: "ANDIN SITI AISYAH, SP., M.M.", role: "Kabid Pengembangan Kompetensi Teknis", nip: "197405072001122005", rank: "Pembina (IV/a)" },
    { name: "Hj. INTAN ROKHMAH, S.E., M.AP.", role: "Kabid Sertifikasi, Kelembagaan, Pengembangan Kompetensi Manajerial & Fungsional", nip: "198011081994032001", rank: "Pembina Tingkat I (IV/b)" }
  ],
  kasubbags: [
    { name: "NURAINI LESTARI, S.STP.", role: "Kasubbag Umum & Kepegawaian", nip: "199211242014062001", rank: "Penata Tingkat I (III/d)" },
    { name: "ENGGAR ARIEF SETIAWAN, S.STP.", role: "Kasubbag Perencanaan & Keuangan", nip: "199510252017081001", rank: "Penata (III/c)" },
    { name: "MURTIWI, S.E.", role: "Kasubbid (Kompetensi Teknis)", nip: "197705151996022002", rank: "Penata Tingkat I (III/d)" },
    { name: "KATIMIN, S.AP.", role: "Kasubbid (Kompetensi Teknis)", nip: "197007162009041001", rank: "Penata Tingkat I (III/d)" },
    { name: "SAPARIANA, S.E.", role: "Kasubbid (Manajerial & Fungsional)", nip: "197602222008032002", rank: "Penata (III/c)" }
  ],
  functionals: [
    { name: "Dra. Hj. MARDIANA ARSJAD, M.H.", role: "Widyaiswara Ahli Madya" },
    { name: "WAHYUTIO HANDAYANI, S.Pd., M.Pd.", role: "Widyaiswara Ahli Madya" },
    { name: "ENDRO MARIJANTO, S.Pd., M.B.A.", role: "Widyaiswara Ahli Muda" },
    { name: "H. BUDIANTO, S.Kep., Ns., M.HP.", role: "Widyaiswara Ahli Muda" },
    { name: "HARY KURNIAWAN AR, S.T., M.A.P.", role: "Widyaiswara Ahli Muda" },
    { name: "ADY ZULKIFLI, S.T.", role: "Widyaiswara Ahli Muda" },
    { name: "MELTIANA, S.IP., M.Si", role: "Widyaiswara Ahli Pertama" },
    { name: "BELLA WAHYU FEBRIANTI, S.I.Kom", role: "Arsiparis Ahli Pertama" }
  ]
};

export async function getAboutUsData(): Promise<AboutUsData> {
  try {
    const data = await sql`SELECT content FROM about_us WHERE id = 'main'`;
    if (data.length === 0) return defaultData;
    
    let content = data[0].content;
    if (typeof content === 'string') content = JSON.parse(content);
    return content as AboutUsData;
  } catch (error) {
    console.error("Error reading about data from DB:", error);
    return defaultData;
  }
}

export async function saveAboutUsData(newData: AboutUsData) {
  try {
    await requireAdminSession();
    await sql`
        INSERT INTO about_us (id, content, last_updated)
        VALUES ('main', ${JSON.stringify(newData)}, ${new Date().toISOString()})
        ON CONFLICT (id) DO UPDATE SET content = EXCLUDED.content, last_updated = EXCLUDED.last_updated
    `;
    return { success: true };
  } catch (error: unknown) {
    console.error("Error saving about data to DB:", error);
    return { success: false, error: error instanceof Error ? error.message : "Gagal menyimpan profil." };
  }
}
