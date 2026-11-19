import { SkmAnswer } from './types';

export interface EvaluationCriterion {
  id: number;
  criterion: string;
  question: string;
  options: {
    key: 'A' | 'B' | 'C' | 'D';
    text: string;
    score: number;
  }[];
}

export interface ComprehensionOption {
  text: string;
  correct: boolean;
}

export interface ComprehensionQuestion {
  id: number;
  question: string;
  options: ComprehensionOption[];
}

export interface CourseEvaluationConfig {
  enableUnderstanding?: boolean;
  narasumber?: EvaluationCriterion[];
  organizer?: EvaluationCriterion[];
  understanding?: ComprehensionQuestion[];
  skm?: EvaluationCriterion[];
}

export const DEFAULT_COMPREHENSION_QUESTIONS: ComprehensionQuestion[] = [
  {
    id: 1,
    question: "Apakah prinsip utama dalam penyusunan instrumen fasilitasi pelatihan klasikal bagi ASN?",
    options: [
      { text: "Berorientasi hasil, terstruktur, andragogis, dan terukur", correct: true },
      { text: "Hanya menitikberatkan pada ceramah satu arah", correct: false },
      { text: "Tidak memerlukan presensi jam pelajaran", correct: false },
      { text: "Menghindari evaluasi bertahap", correct: false },
    ],
  },
  {
    id: 2,
    question: "Berapa batas minimal persentase kehadiran JP untuk syarat penerbitan sertifikat pelatihan klasikal?",
    options: [
      { text: "50% dari total JP", correct: false },
      { text: "70% dari total JP", correct: false },
      { text: "80% dari total JP", correct: true },
      { text: "100% tanpa toleransi", correct: false },
    ],
  },
  {
    id: 3,
    question: "Survei Kepuasan Masyarakat (SKM) dalam pelatihan mengacu pada regulasi:",
    options: [
      { text: "PermenPANRB No. 14 Tahun 2017", correct: true },
      { text: "Permendagri No. 1 Tahun 2000", correct: false },
      { text: "Perpres Pengadaan Barang & Jasa", correct: false },
      { text: "UU Cipta Kerja", correct: false },
    ],
  },
];

/**
 * 9 Unsur Standar Survei Kepuasan Masyarakat (SKM) berdasarkan PermenPANRB No. 14 Tahun 2017
 */
export const SKM_QUESTIONS: EvaluationCriterion[] = [
  {
    id: 1,
    criterion: "Kesesuaian Persyaratan",
    question: "Bagaimana pendapat Saudara tentang kesesuaian persyaratan pelayanan dengan jenis pelayanannya?",
    options: [
      { key: "A", text: "Sangat Sesuai", score: 4 },
      { key: "B", text: "Sesuai", score: 3 },
      { key: "C", text: "Kurang Sesuai", score: 2 },
      { key: "D", text: "Tidak Sesuai", score: 1 },
    ],
  },
  {
    id: 2,
    criterion: "Kemudahan Prosedur",
    question: "Bagaimana pendapat Saudara tentang kemudahan prosedur pelayanan di unit ini?",
    options: [
      { key: "A", text: "Sangat Mudah", score: 4 },
      { key: "B", text: "Mudah", score: 3 },
      { key: "C", text: "Kurang Mudah", score: 2 },
      { key: "D", text: "Tidak Mudah", score: 1 },
    ],
  },
  {
    id: 3,
    criterion: "Kecepatan Waktu Pelayanan",
    question: "Bagaimana pendapat Saudara tentang kecepatan waktu dalam memberikan pelayanan?",
    options: [
      { key: "A", text: "Sangat Cepat", score: 4 },
      { key: "B", text: "Cepat", score: 3 },
      { key: "C", text: "Kurang Cepat", score: 2 },
      { key: "D", text: "Tidak Cepat", score: 1 },
    ],
  },
  {
    id: 4,
    criterion: "Kewajaran Biaya / Tarif",
    question: "Bagaimana pendapat Saudara tentang kewajaran biaya/tarif dalam pelayanan ini?",
    options: [
      { key: "A", text: "Gratis (Sangat Sesuai)", score: 4 },
      { key: "B", text: "Murah", score: 3 },
      { key: "C", text: "Cukup Mahal", score: 2 },
      { key: "D", text: "Sangat Mahal", score: 1 },
    ],
  },
  {
    id: 5,
    criterion: "Kesesuaian Materi & Tema",
    question: "Bagaimana pendapat Saudara tentang materi/substansi yang disampaikan dengan tema pembinaan?",
    options: [
      { key: "A", text: "Sangat Sesuai", score: 4 },
      { key: "B", text: "Sesuai", score: 3 },
      { key: "C", text: "Kurang Sesuai", score: 2 },
      { key: "D", text: "Tidak Sesuai", score: 1 },
    ],
  },
  {
    id: 6,
    criterion: "Kompetensi Narasumber",
    question: "Bagaimana pendapat Saudara tentang kompetensi atau penguasaan materi yang disampaikan narasumber?",
    options: [
      { key: "A", text: "Sangat Baik", score: 4 },
      { key: "B", text: "Baik", score: 3 },
      { key: "C", text: "Kurang Baik", score: 2 },
      { key: "D", text: "Tidak Baik", score: 1 },
    ],
  },
  {
    id: 7,
    criterion: "Perilaku & Sikap Petugas/Host",
    question: "Bagaimana pendapat Saudara tentang sikap dan perilaku narasumber/panitia dalam memfasilitasi acara?",
    options: [
      { key: "A", text: "Sangat Baik & Ramah", score: 4 },
      { key: "B", text: "Baik", score: 3 },
      { key: "C", text: "Kurang Baik", score: 2 },
      { key: "D", text: "Tidak Baik", score: 1 },
    ],
  },
  {
    id: 8,
    criterion: "Kualitas Sarana & Sistem Siaran",
    question: "Bagaimana pendapat Saudara tentang sarana, prasarana, dan sistem siaran streaming/ruangan acara?",
    options: [
      { key: "A", text: "Sangat Lancar & Baik", score: 4 },
      { key: "B", text: "Baik", score: 3 },
      { key: "C", text: "Kurang Baik", score: 2 },
      { key: "D", text: "Tidak Baik", score: 1 },
    ],
  },
  {
    id: 9,
    criterion: "Kemanfaatan & Tindak Lanjut",
    question: "Bagaimana pendapat Saudara tentang tindak lanjut dan kemanfaatan materi pelaksanaan kegiatan ini?",
    options: [
      { key: "A", text: "Sangat Bermanfaat", score: 4 },
      { key: "B", text: "Bermanfaat", score: 3 },
      { key: "C", text: "Kurang Bermanfaat", score: 2 },
      { key: "D", text: "Tidak Bermanfaat", score: 1 },
    ],
  },
];

/**
 * Pertanyaan Evaluasi Narasumber / Fasilitator Sesi
 */
export const NARASUMBER_EVALUATION_QUESTIONS: EvaluationCriterion[] = [
  {
    id: 1,
    criterion: "Penguasaan Materi",
    question: "Sejauh mana narasumber menguasai substansi materi yang disampaikan?",
    options: [
      { key: "A", text: "Sangat Menguasai", score: 4 },
      { key: "B", text: "Menguasai", score: 3 },
      { key: "C", text: "Cukup Menguasai", score: 2 },
      { key: "D", text: "Kurang Menguasai", score: 1 },
    ],
  },
  {
    id: 2,
    criterion: "Metode & Kejelasan Penyampaian",
    question: "Bagaimana sistematika penyampaian dan kejelasan artikulasi narasumber?",
    options: [
      { key: "A", text: "Sangat Jelas & Menarik", score: 4 },
      { key: "B", text: "Jelas", score: 3 },
      { key: "C", text: "Cukup Jelas", score: 2 },
      { key: "D", text: "Kurang Jelas", score: 1 },
    ],
  },
  {
    id: 3,
    criterion: "Interaktivitas & Fasilitasi",
    question: "Bagaimana kemampuan narasumber dalam memfasilitasi diskusi dan menjawab pertanyaan peserta?",
    options: [
      { key: "A", text: "Sangat Interaktif & Komprehensif", score: 4 },
      { key: "B", text: "Interaktif", score: 3 },
      { key: "C", text: "Cukup Interaktif", score: 2 },
      { key: "D", text: "Kurang Interaktif", score: 1 },
    ],
  },
  {
    id: 4,
    criterion: "Ketepatan Waktu",
    question: "Bagaimana disiplin waktu dan pemanfaatan alokasi JP oleh narasumber?",
    options: [
      { key: "A", text: "Sangat Tepat Waktu & Efektif", score: 4 },
      { key: "B", text: "Tepat Waktu", score: 3 },
      { key: "C", text: "Kurang Tepat Waktu", score: 2 },
      { key: "D", text: "Tidak Tepat Waktu", score: 1 },
    ],
  },
];

/**
 * Pertanyaan Evaluasi Kualitas Penyelenggaraan Pelatihan
 */
export const ORGANIZER_EVALUATION_QUESTIONS: EvaluationCriterion[] = [
  {
    id: 1,
    criterion: "Kesiapan & Pelayanan Panitia",
    question: "Bagaimana keramahan, responsivitas, dan pelayanan panitia penyelenggara?",
    options: [
      { key: "A", text: "Sangat Ramah & Sigap", score: 4 },
      { key: "B", text: "Baik & Responsif", score: 3 },
      { key: "C", text: "Cukup Baik", score: 2 },
      { key: "D", text: "Kurang Baik", score: 1 },
    ],
  },
  {
    id: 2,
    criterion: "Fasilitas & Kebersihan Ruang Kelas",
    question: "Bagaimana kenyamanan, pendingin ruangan (AC), dan kebersihan ruang pelatihan?",
    options: [
      { key: "A", text: "Sangat Nyaman & Bersih", score: 4 },
      { key: "B", text: "Nyaman & Bersih", score: 3 },
      { key: "C", text: "Cukup Bersih", score: 2 },
      { key: "D", text: "Kurang Memadai", score: 1 },
    ],
  },
  {
    id: 3,
    criterion: "Sarana Audio-Visual & Jaringan Internet",
    question: "Bagaimana kualitas suara pengeras suara, proyektor, dan koneksi internet WiFi?",
    options: [
      { key: "A", text: "Sangat Jelas & Lancar", score: 4 },
      { key: "B", text: "Jelas & Lancar", score: 3 },
      { key: "C", text: "Kadang Terkendala", score: 2 },
      { key: "D", text: "Sering Terkendala", score: 1 },
    ],
  },
  {
    id: 4,
    criterion: "Kualitas & Ketepatan Konsumsi",
    question: "Bagaimana ketepatan waktu penyajian, rasa, dan higienitas konsumsi/snack?",
    options: [
      { key: "A", text: "Sangat Memuaskan & Higienis", score: 4 },
      { key: "B", text: "Baik & Cukup", score: 3 },
      { key: "C", text: "Cukup", score: 2 },
      { key: "D", text: "Kurang Memuaskan", score: 1 },
    ],
  },
  {
    id: 5,
    criterion: "Ketertiban & Kepatuhan Jadwal",
    question: "Bagaimana kepatuhan panitia terhadap susunan acara (rundown) pelatihan?",
    options: [
      { key: "A", text: "Sangat Tertib Sesuai Jadwal", score: 4 },
      { key: "B", text: "Tertib", score: 3 },
      { key: "C", text: "Cukup Tertib", score: 2 },
      { key: "D", text: "Tidak Tertib", score: 1 },
    ],
  },
];

export interface SkmScoreResult {
  score: number;
  quality: 'A' | 'B' | 'C' | 'D' | 'N/A';
  rawTotal: number;
  maxScore: number;
}

/**
 * Hitung skor skala 0-100 dan predikat mutu dari jawaban SKM atau evaluasi berbobot skala 1-4
 * Sesuai PermenPANRB No. 14 Tahun 2017
 */
export function calculateSkmScore(
  answers: (SkmAnswer | { score: number; questionId?: number | string })[] | null | undefined
): SkmScoreResult {
  if (!Array.isArray(answers) || answers.length === 0) {
    return { score: 0, quality: 'N/A', rawTotal: 0, maxScore: 0 };
  }
  const rawTotal = answers.reduce((sum, item) => sum + (Number(item?.score) || 0), 0);
  const maxScore = answers.length * 4;
  const score = maxScore > 0 ? Math.round((rawTotal / maxScore) * 100) : 0;

  // PermenPANRB Quality Mapping
  let quality: 'A' | 'B' | 'C' | 'D' | 'N/A' = 'N/A';
  if (score >= 88.31) quality = 'A'; // Sangat Baik
  else if (score >= 76.61) quality = 'B'; // Baik
  else if (score >= 65.0) quality = 'C'; // Kurang Baik
  else if (score > 0) quality = 'D'; // Tidak Baik

  return { score, quality, rawTotal, maxScore };
}

/**
 * Mengembalikan salinan default konfigurasi evaluasi 3 tahap (Narasumber, Penyelenggara, SKM)
 */
export function getDefaultCourseEvaluationConfig(): Required<CourseEvaluationConfig> {
  return {
    enableUnderstanding: false,
    narasumber: NARASUMBER_EVALUATION_QUESTIONS.map((q) => ({
      ...q,
      options: q.options.map((o) => ({ ...o })),
    })),
    organizer: ORGANIZER_EVALUATION_QUESTIONS.map((q) => ({
      ...q,
      options: q.options.map((o) => ({ ...o })),
    })),
    understanding: DEFAULT_COMPREHENSION_QUESTIONS.map((q) => ({
      ...q,
      options: q.options.map((o) => ({ ...o })),
    })),
    skm: SKM_QUESTIONS.map((q) => ({
      ...q,
      options: q.options.map((o) => ({ ...o })),
    })),
  };
}
