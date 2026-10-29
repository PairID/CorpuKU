/**
 * Dynamic Syllabus & Dynamic JP Calculator (CorpuKU Bangkom ASN)
 * 
 * Menghitung estimasi durasi belajar dan ekuivalensi Jam Pelajaran (JP) secara dinamis
 * SETELAH silabus dan struktur modul pembelajaran selesai disusun oleh AI.
 * 
 * Standar Acuan:
 * - 1 JP = 45 Menit (Standar LAN RI / BPSDM / Kemendagri).
 * - Perhitungan beban belajar riil:
 *   1. Waktu baca modul teks (~120 kata/menit) + pendalaman instruksional (5 menit/modul).
 *   2. Refleksi butir pembelajaran (2 menit per learning point).
 *   3. Titik rawan temuan audit (3 menit per common pitfall).
 *   4. Pengujian SOP verifikasi mandiri (4 menit per checklist item).
 *   5. Analisis komponen kertas kerja HPS (8 menit).
 *   6. Uji kasus situasional (5 menit per soal SJT C3-C4).
 */

import {
  type LearningModule,
  type ActionableToolkits,
  type SituationalQuizItem,
  type OnDemandCoursePackage
} from './on-demand-learning';

export interface DurationBreakdown {
  moduleReadingMinutes: number;
  learningPointsMinutes: number;
  pitfallsMinutes: number;
  checklistVerificationMinutes: number;
  hpsWorksheetMinutes: number;
  situationalQuizMinutes: number;
  totalCalculatedMinutes: number;
  equivalentJp: number;
}

export const MINUTES_PER_JP = 45; // 1 Jam Pelajaran LAN RI = 45 menit

/**
 * Menghitung estimasi durasi belajar dan ekuivalensi JP secara dinamis
 */
export function calculateDynamicDurationAndJp(course: {
  modules?: LearningModule[];
  actionableToolkits?: ActionableToolkits;
  situationalJudgmentQuiz?: SituationalQuizItem[];
}): DurationBreakdown {
  const modules = course.modules || [];
  const toolkits = course.actionableToolkits;
  const quizzes = course.situationalJudgmentQuiz || [];

  // 1. Durasi Baca Modul & Pendalaman Instruksional
  let totalWords = 0;
  let totalLearningPoints = 0;
  let totalPitfalls = 0;

  for (const mod of modules) {
    const words = (mod.contentBody || '').trim().split(/\s+/).filter(Boolean).length;
    totalWords += words;
    totalLearningPoints += (mod.learningPoints || []).length;
    totalPitfalls += (mod.commonPitfalls || []).length;
  }

  // Waktu baca: ~120 kata per menit + 5 menit per modul untuk refleksi dan pemahaman
  const moduleReadingMinutes = Math.round(totalWords / 120) + (modules.length * 5);
  const learningPointsMinutes = totalLearningPoints * 2;
  const pitfallsMinutes = totalPitfalls * 3;

  // 2. Actionable Toolkits
  const checklists = toolkits?.selfVerificationChecklist || [];
  const checklistVerificationMinutes = checklists.length * 4;

  const hpsComponents = toolkits?.hpsWorksheetStructure?.components || [];
  const hpsWorksheetMinutes = hpsComponents.length > 0 ? 8 : 0;

  // 3. Situational Judgment Quiz (Kasus dilema situasional C3-C4)
  const situationalQuizMinutes = quizzes.length * 5;

  // Total Menit
  const totalCalculatedMinutes =
    moduleReadingMinutes +
    learningPointsMinutes +
    pitfallsMinutes +
    checklistVerificationMinutes +
    hpsWorksheetMinutes +
    situationalQuizMinutes;

  // Ekuivalensi JP (Pembulatan ke integer terdekat, minimal 1 JP)
  // ponytail: 1 JP LAN RI = 45 menit. Rumus: Math.max(1, Math.round(totalMinutes / 45))
  const equivalentJp = Math.max(1, Math.round(totalCalculatedMinutes / MINUTES_PER_JP));

  return {
    moduleReadingMinutes,
    learningPointsMinutes,
    pitfallsMinutes,
    checklistVerificationMinutes,
    hpsWorksheetMinutes,
    situationalQuizMinutes,
    totalCalculatedMinutes,
    equivalentJp
  };
}

/**
 * Memperbarui paket kursus dengan hasil kalkulasi durasi & JP dinamis
 */
export function applyDynamicJpToCourse(course: OnDemandCoursePackage): OnDemandCoursePackage {
  const breakdown = calculateDynamicDurationAndJp(course);

  return {
    ...course,
    curriculumMeta: {
      ...course.curriculumMeta,
      estimatedDurationMinutes: breakdown.totalCalculatedMinutes,
      equivalentJp: breakdown.equivalentJp
    }
  };
}
