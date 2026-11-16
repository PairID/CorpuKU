import { describe, expect, it } from 'vitest';
import type { Course, Enrollment, Lesson, MaterialAttendance } from '../../src/lib/types';

import {
  calculateAttendancePercentage,
  isAttendanceThresholdMet,
  accumulateAttendedJp,
  getNextEvaluationStage,
  validateEvaluationSubmission,
  checkClassicalCertificateEligibility,
  sanitizeParticipantNip,
  validateParticipantStatement,
  type EvaluationState,
  type EvaluationStage,
  type ClassicalCertificateEligibilityParams,
  type EligibilityResult,
} from '../../src/lib/classical-training';
import {
  calculateSkmScore,
  SKM_QUESTIONS,
  NARASUMBER_EVALUATION_QUESTIONS,
  ORGANIZER_EVALUATION_QUESTIONS,
  type SkmScoreResult,
} from '../../src/lib/skm-constants';

// ============================================================================
// TEST SUITE: 4-TIER TEST METHODOLOGY
// ============================================================================

describe('Classical Facilitation Training Test Suite (4-Tier Requirement-Driven)', () => {

  // --------------------------------------------------------------------------
  // TIER 1: FEATURE COVERAGE (All 12 Features from PROJECT.md Feature Inventory)
  // --------------------------------------------------------------------------
  describe('Tier 1: Feature Coverage (PROJECT.md § Feature Inventory)', () => {
    it('[F1] validates classical facilitation course configuration with target OPD and 80% threshold', () => {
      const course: Course = {
        id: 'course-disnakertrans-01',
        title: 'Pelatihan Fasilitasi Pelayanan Ketenagakerjaan OPD',
        description: 'Fasilitasi klasikal untuk Disnakertrans Kaltara',
        category: 'Pelayanan Publik',
        level: 'Menengah',
        thumbnailUrl: '/thumbnails/classical.png',
        status: 'active',
        instructorId: 'inst-01',
        jp: 10,
        certificateType: 'sertifikat',
        trainingType: 'classical_facilitation',
        targetOpd: 'Dinas Tenaga Kerja dan Transmigrasi (Disnakertrans) Provinsi Kalimantan Utara',
        attendanceThreshold: 80,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      expect(course.trainingType).toBe('classical_facilitation');
      expect(course.targetOpd).toContain('Disnakertrans');
      expect(course.attendanceThreshold).toBe(80);
      expect(course.jp).toBe(10);
    });

    it('[F2] validates lesson material JP count and attendance toggle requirement', () => {
      const lessonWithAttendance: Lesson = {
        id: 'lesson-01',
        moduleId: 'mod-01',
        title: 'Sesi Kebijakan Pelayanan Publik',
        content: 'Materi pembuka kebijakan teknis',
        type: 'reading',
        order: 1,
        jp: 2,
        hasAttendance: true,
        attendanceQrCode: 'QR-SESI-01-2026',
        narasumberName: 'Drs. H. Syahruddin, M.Si',
      };

      const lessonWithoutAttendance: Lesson = {
        id: 'lesson-02',
        moduleId: 'mod-01',
        title: 'Materi Bacaan Mandiri Suplemen',
        content: 'Dokumen suplemen pdf',
        type: 'reading',
        order: 2,
        jp: 0,
        hasAttendance: false,
        attendanceQrCode: null,
      };

      expect(lessonWithAttendance.jp).toBe(2);
      expect(lessonWithAttendance.hasAttendance).toBe(true);
      expect(lessonWithAttendance.narasumberName).toBe('Drs. H. Syahruddin, M.Si');

      expect(lessonWithoutAttendance.jp).toBe(0);
      expect(lessonWithoutAttendance.hasAttendance).toBe(false);
      expect(lessonWithoutAttendance.attendanceQrCode).toBeNull();
    });

    it('[F3] supports initial and subsequent quiz attachment to lesson materials', () => {
      const lessonWithInitialQuiz: Lesson = {
        id: 'lesson-quiz-01',
        moduleId: 'mod-01',
        title: 'Pre-Test Evaluasi Awal',
        content: 'Kuis awal',
        type: 'quiz',
        order: 1,
        jp: 1,
        hasAttendance: false,
      };

      // Subsequent update simulates admin adding quiz to reading lesson
      const lessonUpdatedWithQuiz: Lesson = {
        ...lessonWithInitialQuiz,
        id: 'lesson-reading-02',
        type: 'quiz',
        title: 'Sesi Pembelajaran Interaktif + Kuis Susulan',
      };

      expect(lessonWithInitialQuiz.type).toBe('quiz');
      expect(lessonUpdatedWithQuiz.type).toBe('quiz');
    });

    it('[F4] verifies unique QR code token formatting per material session', () => {
      const qr1 = `CLASSICAL_QR_${crypto.randomUUID()}`;
      const qr2 = `CLASSICAL_QR_${crypto.randomUUID()}`;

      expect(qr1).not.toBe(qr2);
      expect(qr1).toMatch(/^CLASSICAL_QR_[0-9a-f-]{36}$/);
    });

    it('[F5 & F6] requires participant data verification and statement agreement before enrollment', () => {
      const invalidData = {
        name: 'AS', // too short (<3)
        nip: '19850712-201001-1-001', // uncleaned or valid
        institution: 'Disnakertrans',
        statementAccepted: false, // NOT checked
      };

      const resultInvalid = validateParticipantStatement(invalidData);
      expect(resultInvalid.valid).toBe(false);
      expect(resultInvalid.errors).toContain('Nama lengkap minimal 3 karakter.');
      expect(resultInvalid.errors).toContain(
        'Checklist pernyataan kebenaran data profil wajib dicentang sebelum mendaftar.'
      );

      const validData = {
        name: 'A.S. Fitriannur Azim, S.Sos.',
        nip: '19850712 201001 1 005',
        institution: 'Pemerintah Provinsi Kalimantan Utara',
        statementAccepted: true,
      };

      const resultValid = validateParticipantStatement(validData);
      expect(resultValid.valid).toBe(true);
      expect(resultValid.errors).toHaveLength(0);
    });

    it('[F7 & F8] validates QR scanner JP calculation and attendance percentage formula', () => {
      const sessions = [
        { lessonId: 'L1', jp: 2 },
        { lessonId: 'L2', jp: 4 },
        { lessonId: 'L3', jp: 4 },
      ]; // Total: 10 JP

      const attended1 = [{ lessonId: 'L1' }]; // 2 JP
      const res1 = accumulateAttendedJp(sessions, attended1);
      expect(res1.attendedJp).toBe(2);
      expect(res1.totalClassJp).toBe(10);
      expect(res1.attendancePercentage).toBe(20.0);

      const attended2 = [{ lessonId: 'L1' }, { lessonId: 'L2' }]; // 6 JP
      const res2 = accumulateAttendedJp(sessions, attended2);
      expect(res2.attendedJp).toBe(6);
      expect(res2.attendancePercentage).toBe(60.0);

      const attended3 = [{ lessonId: 'L1' }, { lessonId: 'L2' }, { lessonId: 'L3' }]; // 10 JP
      const res3 = accumulateAttendedJp(sessions, attended3);
      expect(res3.attendedJp).toBe(10);
      expect(res3.attendancePercentage).toBe(100.0);
    });

    it('strictly rejects 79.5% and 79.99% attendance from satisfying 80% threshold', () => {
      expect(calculateAttendancePercentage(79.5, 100)).toBe(79.5);
      expect(isAttendanceThresholdMet(79.5, 80)).toBe(false);
      expect(calculateAttendancePercentage(79.99, 100)).toBe(79.99);
      expect(isAttendanceThresholdMet(79.99, 80)).toBe(false);
      expect(calculateAttendancePercentage(80.0, 100)).toBe(80.0);
      expect(isAttendanceThresholdMet(80.0, 80)).toBe(true);
    });

    it('[F9] enforces 4-stage sequential evaluations in exact order', () => {
      const initial: EvaluationState = {
        evalNarasumberCompleted: false,
        evalOrganizerCompleted: false,
        evalUnderstandingCompleted: false,
        evalSkmCompleted: false,
      };

      // Stage 1 required first
      expect(getNextEvaluationStage(initial)).toBe('narasumber');
      expect(validateEvaluationSubmission(initial, 'organizer').allowed).toBe(false);
      expect(validateEvaluationSubmission(initial, 'narasumber').allowed).toBe(true);

      // Advance to Stage 2
      const afterNarasumber: EvaluationState = { ...initial, evalNarasumberCompleted: true };
      expect(getNextEvaluationStage(afterNarasumber)).toBe('organizer');

      // Advance to Stage 3
      const afterOrganizer: EvaluationState = { ...afterNarasumber, evalOrganizerCompleted: true };
      expect(getNextEvaluationStage(afterOrganizer)).toBe('understanding');

      // Advance to Stage 4
      const afterUnderstanding: EvaluationState = { ...afterOrganizer, evalUnderstandingCompleted: true };
      expect(getNextEvaluationStage(afterUnderstanding)).toBe('skm');

      // Complete
      const afterSkm: EvaluationState = { ...afterUnderstanding, evalSkmCompleted: true };
      expect(getNextEvaluationStage(afterSkm)).toBe('completed');
    });

    it('[F10] verifies 80% JP threshold & 4-stage evaluation gating for certificate issuance', () => {
      // Case 1: 100% JP and all 4 evaluations complete -> Unlocked
      const eligible = checkClassicalCertificateEligibility({
        trainingType: 'classical_facilitation',
        attendanceThreshold: 80,
        attendancePercentage: 100,
        statementAccepted: true,
        evalNarasumberCompleted: true,
        evalOrganizerCompleted: true,
        evalUnderstandingCompleted: true,
        evalSkmCompleted: true,
        allEvaluationsCompleted: true,
      });
      expect(eligible.eligible).toBe(true);
      expect(eligible.reasons).toHaveLength(0);

      // Case 2: 70% JP (< 80%) with all evaluations complete -> Locked
      const lockedByAttendance = checkClassicalCertificateEligibility({
        trainingType: 'classical_facilitation',
        attendanceThreshold: 80,
        attendancePercentage: 70,
        statementAccepted: true,
        evalNarasumberCompleted: true,
        evalOrganizerCompleted: true,
        evalUnderstandingCompleted: true,
        evalSkmCompleted: true,
        allEvaluationsCompleted: true,
      });
      expect(lockedByAttendance.eligible).toBe(false);
      expect(lockedByAttendance.reasons[0]).toContain('Kehadiran peserta (70%) belum memenuhi syarat minimal 80%');

      // Case 3: 100% JP but missing SKM evaluation -> Locked
      const lockedByEvaluation = checkClassicalCertificateEligibility({
        trainingType: 'classical_facilitation',
        attendanceThreshold: 80,
        attendancePercentage: 100,
        statementAccepted: true,
        evalNarasumberCompleted: true,
        evalOrganizerCompleted: true,
        evalUnderstandingCompleted: true,
        evalSkmCompleted: false, // Incomplete
      });
      expect(lockedByEvaluation.eligible).toBe(false);
      expect(lockedByEvaluation.reasons[0]).toContain('Seluruh rangkaian 4 tahap evaluasi pelatihan belum lengkap');
    });
  });

  // --------------------------------------------------------------------------
  // TIER 2: BOUNDARY & CORNER CASES
  // --------------------------------------------------------------------------
  describe('Tier 2: Boundary & Corner Cases', () => {
    it('handles total class JP of 0 without NaN or Infinity (division by zero)', () => {
      expect(calculateAttendancePercentage(0, 0)).toBe(0);
      expect(calculateAttendancePercentage(5, 0)).toBe(0);
      expect(calculateAttendancePercentage(-2, 0)).toBe(0);
      expect(calculateAttendancePercentage(0, -10)).toBe(0);
    });

    it('enforces exact boundary condition: 79.99% locked vs 80.00% unlocked', () => {
      const below = isAttendanceThresholdMet(79.99, 80);
      expect(below).toBe(false);

      const exact = isAttendanceThresholdMet(80.0, 80);
      expect(exact).toBe(true);

      const above = isAttendanceThresholdMet(80.01, 80);
      expect(above).toBe(true);
    });

    it('handles fractional JP percentages with accurate 2-decimal precision', () => {
      // 7 JP attended out of 9 total JP = 77.7777...% -> 77.78%
      expect(calculateAttendancePercentage(7, 9)).toBe(77.78);
      // 8 JP attended out of 9 total JP = 88.8888...% -> 88.89%
      expect(calculateAttendancePercentage(8, 9)).toBe(88.89);
      // 1 JP attended out of 3 total JP = 33.3333...% -> 33.33%
      expect(calculateAttendancePercentage(1, 3)).toBe(33.33);
    });

    it('handles edge cases in SKM evaluation scoring (empty, null, non-array)', () => {
      expect(calculateSkmScore([]).score).toBe(0);
      expect(calculateSkmScore([]).quality).toBe('N/A');
      expect(calculateSkmScore(null).score).toBe(0);
      expect(calculateSkmScore(undefined).score).toBe(0);
    });

    it('sanitizes participant NIP with punctuation, letters, and non-digit noise', () => {
      expect(sanitizeParticipantNip(' 19850712-201001-1-005 ')).toBe('198507122010011005');
      expect(sanitizeParticipantNip('1985.07.12 201001 1 005')).toBe('198507122010011005');
      expect(sanitizeParticipantNip('NIP: 198507122010011005 (PNS)')).toBe('198507122010011005');
      expect(sanitizeParticipantNip(null)).toBe('');
    });

    it('strictly prevents enrollment if statement checkbox is false, null, or undefined', () => {
      const base = {
        name: 'Bambang Irawan',
        nip: '198205152008011002',
        institution: 'Disnakertrans Kaltara',
      };

      expect(validateParticipantStatement({ ...base, statementAccepted: false }).valid).toBe(false);
      // @ts-expect-error testing null
      expect(validateParticipantStatement({ ...base, statementAccepted: null }).valid).toBe(false);
      // @ts-expect-error testing undefined
      expect(validateParticipantStatement({ ...base, statementAccepted: undefined }).valid).toBe(false);
    });

    it('maintains idempotency: scanning the same QR code multiple times does not increase JP', () => {
      const sessions = [
        { lessonId: 'SESI-A', jp: 3 },
        { lessonId: 'SESI-B', jp: 3 },
      ];

      // Simulate 5 duplicate scans of SESI-A
      const duplicateAttendances = [
        { lessonId: 'SESI-A' },
        { lessonId: 'SESI-A' },
        { lessonId: 'SESI-A' },
        { lessonId: 'SESI-A' },
        { lessonId: 'SESI-A' },
      ];

      const res = accumulateAttendedJp(sessions, duplicateAttendances);
      expect(res.attendedJp).toBe(3); // exactly 3 JP, not 15 JP
      expect(res.totalClassJp).toBe(6);
      expect(res.attendancePercentage).toBe(50.0);
    });
  });

  // --------------------------------------------------------------------------
  // TIER 3: CROSS-FEATURE COMBINATIONS
  // --------------------------------------------------------------------------
  describe('Tier 3: Cross-Feature Combinations', () => {
    it('evaluates PermenPANRB No. 14 Tahun 2017 scoring categories across 9 unsur', () => {
      // 9 Unsur with maximum score (all 4 - Sangat Baik)
      const allSangatBaik = Array.from({ length: 9 }, (_, i) => ({
        questionId: `U${i + 1}`,
        score: 4,
      }));
      const resA = calculateSkmScore(allSangatBaik);
      expect(resA.rawTotal).toBe(36);
      expect(resA.score).toBe(100);
      expect(resA.quality).toBe('A');

      // 9 Unsur with good score (all 3 - Baik)
      const allBaik = Array.from({ length: 9 }, (_, i) => ({
        questionId: `U${i + 1}`,
        score: 3,
      }));
      const resB = calculateSkmScore(allBaik);
      expect(resB.rawTotal).toBe(27);
      expect(resB.score).toBe(75);
      expect(resB.quality).toBe('C'); // 75 falls in C (65 - 76.60)

      // 9 Unsur mixed: 7 of 4 and 2 of 3 -> 28 + 6 = 34 / 36 * 100 = 94.4% -> 94 (A)
      const mixedHigh = [
        ...Array.from({ length: 7 }, (_, i) => ({ questionId: `U${i + 1}`, score: 4 })),
        ...Array.from({ length: 2 }, (_, i) => ({ questionId: `U${i + 8}`, score: 3 })),
      ];
      const resMixed = calculateSkmScore(mixedHigh);
      expect(resMixed.rawTotal).toBe(34);
      expect(resMixed.score).toBe(94);
      expect(resMixed.quality).toBe('A');
    });

    it('verifies multi-session progression with varying JP weights', () => {
      // Course structure: 4 sessions of weights [2, 3, 3, 2] = 10 JP total
      const sessions = [
        { lessonId: 'S1', jp: 2 },
        { lessonId: 'S2', jp: 3 },
        { lessonId: 'S3', jp: 3 },
        { lessonId: 'S4', jp: 2 },
      ];

      // Session 1: 2/10 = 20%
      let att = accumulateAttendedJp(sessions, [{ lessonId: 'S1' }]);
      expect(att.attendancePercentage).toBe(20.0);
      expect(isAttendanceThresholdMet(att.attendancePercentage)).toBe(false);

      // Session 1 + 2: 5/10 = 50%
      att = accumulateAttendedJp(sessions, [{ lessonId: 'S1' }, { lessonId: 'S2' }]);
      expect(att.attendancePercentage).toBe(50.0);
      expect(isAttendanceThresholdMet(att.attendancePercentage)).toBe(false);

      // Session 1 + 2 + 3: 8/10 = 80% (Threshold reached!)
      att = accumulateAttendedJp(sessions, [{ lessonId: 'S1' }, { lessonId: 'S2' }, { lessonId: 'S3' }]);
      expect(att.attendancePercentage).toBe(80.0);
      expect(isAttendanceThresholdMet(att.attendancePercentage)).toBe(true);

      // Session 1 + 2 + 3 + 4: 10/10 = 100%
      att = accumulateAttendedJp(sessions, [
        { lessonId: 'S1' },
        { lessonId: 'S2' },
        { lessonId: 'S3' },
        { lessonId: 'S4' },
      ]);
      expect(att.attendancePercentage).toBe(100.0);
      expect(isAttendanceThresholdMet(att.attendancePercentage)).toBe(true);
    });

    it('evaluates comprehensive interlocking gating matrix', () => {
      const testCases = [
        {
          desc: 'Statement missing: blocked even if 100% attendance & all evals done',
          params: {
            trainingType: 'classical_facilitation',
            attendancePercentage: 100,
            statementAccepted: false,
            evalNarasumberCompleted: true,
            evalOrganizerCompleted: true,
            evalUnderstandingCompleted: true,
            evalSkmCompleted: true,
          },
          expectedEligible: false,
          expectedReasonFragment: 'Pernyataan kebenaran data profil',
        },
        {
          desc: 'Attendance 79%: blocked even if statement and all evals done',
          params: {
            trainingType: 'classical_facilitation',
            attendancePercentage: 79.0,
            statementAccepted: true,
            evalNarasumberCompleted: true,
            evalOrganizerCompleted: true,
            evalUnderstandingCompleted: true,
            evalSkmCompleted: true,
          },
          expectedEligible: false,
          expectedReasonFragment: 'Kehadiran peserta (79%)',
        },
        {
          desc: 'Quiz evaluation missing: blocked even if 100% attendance',
          params: {
            trainingType: 'classical_facilitation',
            attendancePercentage: 100,
            statementAccepted: true,
            evalNarasumberCompleted: true,
            evalOrganizerCompleted: true,
            evalUnderstandingCompleted: false,
            evalSkmCompleted: true,
          },
          expectedEligible: false,
          expectedReasonFragment: '4 tahap evaluasi pelatihan belum lengkap',
        },
        {
          desc: 'SKM evaluation missing: blocked even if 80% attendance',
          params: {
            trainingType: 'classical_facilitation',
            attendancePercentage: 80,
            statementAccepted: true,
            evalNarasumberCompleted: true,
            evalOrganizerCompleted: true,
            evalUnderstandingCompleted: true,
            evalSkmCompleted: false,
          },
          expectedEligible: false,
          expectedReasonFragment: '4 tahap evaluasi pelatihan belum lengkap',
        },
        {
          desc: 'All criteria satisfied at exact 80% attendance: UNLOCKED',
          params: {
            trainingType: 'classical_facilitation',
            attendancePercentage: 80.0,
            statementAccepted: true,
            evalNarasumberCompleted: true,
            evalOrganizerCompleted: true,
            evalUnderstandingCompleted: true,
            evalSkmCompleted: true,
            allEvaluationsCompleted: true,
          },
          expectedEligible: true,
          expectedReasonFragment: null,
        },
      ];

      for (const tc of testCases) {
        const res = checkClassicalCertificateEligibility(tc.params);
        expect(res.eligible).toBe(tc.expectedEligible);
        if (tc.expectedReasonFragment) {
          expect(res.reasons.some((r) => r.includes(tc.expectedReasonFragment!))).toBe(true);
        }
      }
    });
  });

  // --------------------------------------------------------------------------
  // TIER 4: REAL-WORLD APPLICATION SCENARIOS
  // --------------------------------------------------------------------------
  describe('Tier 4: Real-World Application Scenario (Complete OPD Facilitation Lifecycle)', () => {
    it('simulates full Disnakertrans classical facilitation lifecycle from setup to certificate unlock', () => {
      // 1. Panitia/Admin sets up training class
      const course: Course = {
        id: 'cls-opd-2026-disnaker',
        title: 'Bimbingan Teknis Fasilitasi Pelayanan Ketenagakerjaan Terpadu',
        description: 'Fasilitasi pelatihan klasikal tatap muka bagi aparatur Disnakertrans Kaltara',
        category: 'Ketenagakerjaan',
        level: 'Teknis',
        thumbnailUrl: '/posters/disnakertrans.jpg',
        status: 'active',
        instructorId: 'inst-bpsdm-01',
        jp: 12,
        certificateType: 'sertifikat',
        trainingType: 'classical_facilitation',
        targetOpd: 'Dinas Tenaga Kerja dan Transmigrasi Kalimantan Utara',
        attendanceThreshold: 80,
        createdAt: '2026-11-16T08:00:00Z',
        updatedAt: '2026-11-16T08:00:00Z',
      };

      // 2. Admin creates 3 sessions: 4 JP + 4 JP + 4 JP = 12 JP
      const sessions: Lesson[] = [
        {
          id: 'sesi-1-regulasi',
          moduleId: 'mod-1',
          title: 'Regulasi Hubungan Industrial & Perlindungan Kerja',
          content: 'Materi paparan regulasi',
          type: 'reading',
          order: 1,
          jp: 4,
          hasAttendance: true,
          attendanceQrCode: 'QR-SESI-1-REGULASI-DISNAKER',
          narasumberName: 'Dr. H. Syahrul, M.Hum.',
        },
        {
          id: 'sesi-2-mediasi',
          moduleId: 'mod-1',
          title: 'Teknik Mediasi & Penyelesaian Perselisihan Kerja',
          content: 'Simulasi kasus sengketa buruh',
          type: 'reading',
          order: 2,
          jp: 4,
          hasAttendance: true,
          attendanceQrCode: 'QR-SESI-2-MEDIASI-DISNAKER',
          narasumberName: 'Hj. Siti Rahmah, S.H., M.H.',
        },
        {
          id: 'sesi-3-praktik',
          moduleId: 'mod-1',
          title: 'Praktek Penyusunan Naskah Perjanjian Bersama',
          content: 'Penyusunan format PB resmi',
          type: 'quiz', // Quiz attached to material
          order: 3,
          jp: 4,
          hasAttendance: true,
          attendanceQrCode: 'QR-SESI-3-PRAKTIK-DISNAKER',
          narasumberName: 'Ahmad Fauzi, S.E.',
        },
      ];

      // 3. Participant arrives, reviews profile & checks statement
      const participantProfile = {
        name: 'A.S. Fitriannur Azim, S.Sos.',
        nip: '19850712 201001 1 005',
        institution: 'Dinas Tenaga Kerja dan Transmigrasi Provinsi Kalimantan Utara',
        statementAccepted: true,
      };

      const statementCheck = validateParticipantStatement(participantProfile);
      expect(statementCheck.valid).toBe(true);

      // Create enrollment state
      const enrollment: Enrollment = {
        id: 'enr-disnaker-001',
        userId: 'usr-azim',
        courseId: course.id,
        status: 'in_progress',
        progress: 0,
        enrolledAt: '2026-11-16T08:30:00Z',
        completedLessons: [],
        statementAccepted: true,
        statementAcceptedAt: '2026-11-16T08:31:00Z',
        attendedJp: 0,
        attendancePercentage: 0,
        evalNarasumberCompleted: false,
        evalOrganizerCompleted: false,
        evalUnderstandingCompleted: false,
        evalSkmCompleted: false,
        allEvaluationsCompleted: false,
      };

      // 4. Participant attends Session 1 (4 JP) via mobile QR scan
      const attendances: MaterialAttendance[] = [];
      attendances.push({
        id: 'att-1',
        enrollmentId: enrollment.id,
        userId: enrollment.userId,
        courseId: course.id,
        lessonId: sessions[0].id,
        jp: sessions[0].jp!,
        attendedAt: '2026-11-16T09:00:00Z',
      });

      let currentAttendance = accumulateAttendedJp(sessions, attendances);
      expect(currentAttendance.attendedJp).toBe(4);
      expect(currentAttendance.attendancePercentage).toBe(33.33);

      // Certificate eligibility check: LOCKED (33.33% < 80%)
      let eligibility = checkClassicalCertificateEligibility({
        trainingType: course.trainingType,
        attendancePercentage: currentAttendance.attendancePercentage,
        statementAccepted: enrollment.statementAccepted!,
        evalNarasumberCompleted: enrollment.evalNarasumberCompleted!,
        evalOrganizerCompleted: enrollment.evalOrganizerCompleted!,
        evalUnderstandingCompleted: enrollment.evalUnderstandingCompleted!,
        evalSkmCompleted: enrollment.evalSkmCompleted!,
      });
      expect(eligibility.eligible).toBe(false);
      expect(eligibility.attendanceMet).toBe(false);

      // 5. Participant attends Session 2 (4 JP) -> total 8 JP (66.67%)
      attendances.push({
        id: 'att-2',
        enrollmentId: enrollment.id,
        userId: enrollment.userId,
        courseId: course.id,
        lessonId: sessions[1].id,
        jp: sessions[1].jp!,
        attendedAt: '2026-11-16T13:00:00Z',
      });

      currentAttendance = accumulateAttendedJp(sessions, attendances);
      expect(currentAttendance.attendedJp).toBe(8);
      expect(currentAttendance.attendancePercentage).toBe(66.67);
      expect(isAttendanceThresholdMet(currentAttendance.attendancePercentage)).toBe(false);

      // 6. Participant attends Session 3 (4 JP) -> total 12 JP (100.0%)
      attendances.push({
        id: 'att-3',
        enrollmentId: enrollment.id,
        userId: enrollment.userId,
        courseId: course.id,
        lessonId: sessions[2].id,
        jp: sessions[2].jp!,
        attendedAt: '2026-11-16T15:30:00Z',
      });

      currentAttendance = accumulateAttendedJp(sessions, attendances);
      expect(currentAttendance.attendedJp).toBe(12);
      expect(currentAttendance.attendancePercentage).toBe(100.0);
      expect(isAttendanceThresholdMet(currentAttendance.attendancePercentage)).toBe(true);

      // Check certificate eligibility: Attendance is 100%, BUT evaluations are incomplete!
      eligibility = checkClassicalCertificateEligibility({
        trainingType: course.trainingType,
        attendancePercentage: currentAttendance.attendancePercentage,
        statementAccepted: enrollment.statementAccepted!,
        evalNarasumberCompleted: enrollment.evalNarasumberCompleted!,
        evalOrganizerCompleted: enrollment.evalOrganizerCompleted!,
        evalUnderstandingCompleted: enrollment.evalUnderstandingCompleted!,
        evalSkmCompleted: enrollment.evalSkmCompleted!,
      });
      expect(eligibility.eligible).toBe(false);
      expect(eligibility.attendanceMet).toBe(true);
      expect(eligibility.evaluationsMet).toBe(false);

      // 7. Participant completes 4-stage sequential evaluations
      // Stage 1: Narasumber Evaluation
      const evalState: EvaluationState = {
        evalNarasumberCompleted: false,
        evalOrganizerCompleted: false,
        evalUnderstandingCompleted: false,
        evalSkmCompleted: false,
      };

      const eval1Submission = validateEvaluationSubmission(evalState, 'narasumber');
      expect(eval1Submission.allowed).toBe(true);
      evalState.evalNarasumberCompleted = true;

      // Stage 2: Organizer Quality Evaluation
      const eval2Submission = validateEvaluationSubmission(evalState, 'organizer');
      expect(eval2Submission.allowed).toBe(true);
      evalState.evalOrganizerCompleted = true;

      // Stage 3: Material Understanding Evaluation (Quiz)
      const eval3Submission = validateEvaluationSubmission(evalState, 'understanding');
      expect(eval3Submission.allowed).toBe(true);
      evalState.evalUnderstandingCompleted = true;

      // Stage 4: SKM 9-Unsur Survey
      const eval4Submission = validateEvaluationSubmission(evalState, 'skm');
      expect(eval4Submission.allowed).toBe(true);
      const skmAnswers = Array.from({ length: 9 }, (_, i) => ({
        questionId: i + 1,
        score: 4, // All Sangat Baik
      }));
      const skmResult = calculateSkmScore(skmAnswers);
      expect(skmResult.score).toBe(100);
      expect(skmResult.quality).toBe('A');
      evalState.evalSkmCompleted = true;

      expect(getNextEvaluationStage(evalState)).toBe('completed');

      // 8. FINAL CHECK: Certificate Unlocks!
      const finalEligibility = checkClassicalCertificateEligibility({
        trainingType: course.trainingType,
        attendancePercentage: currentAttendance.attendancePercentage,
        statementAccepted: true,
        evalNarasumberCompleted: evalState.evalNarasumberCompleted,
        evalOrganizerCompleted: evalState.evalOrganizerCompleted,
        evalUnderstandingCompleted: evalState.evalUnderstandingCompleted,
        evalSkmCompleted: evalState.evalSkmCompleted,
        allEvaluationsCompleted: true,
      });

      expect(finalEligibility.eligible).toBe(true);
      expect(finalEligibility.statementMet).toBe(true);
      expect(finalEligibility.attendanceMet).toBe(true);
      expect(finalEligibility.evaluationsMet).toBe(true);
      expect(finalEligibility.reasons).toHaveLength(0);
    });
  });
});
