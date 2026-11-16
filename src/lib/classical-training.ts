/**
 * ============================================================================
 * Classical Facilitation Training Shared Business Logic
 * BPSDM Provinsi Kalimantan Utara
 * ============================================================================
 * Pure domain functions for attendance tracking, JP calculations, 4-stage sequential
 * evaluations, certificate eligibility, and profile data verification.
 */

export interface EvaluationState {
  evalNarasumberCompleted: boolean;
  evalOrganizerCompleted: boolean;
  evalUnderstandingCompleted: boolean;
  evalSkmCompleted: boolean;
}

export type EvaluationStage = "narasumber" | "organizer" | "understanding" | "skm";

export interface ClassicalCertificateEligibilityParams {
  trainingType?: string;
  attendanceThreshold?: number;
  attendancePercentage: number;
  statementAccepted: boolean;
  evalNarasumberCompleted?: boolean;
  evalOrganizerCompleted?: boolean;
  evalUnderstandingCompleted?: boolean;
  evalSkmCompleted?: boolean;
  allEvaluationsCompleted?: boolean;
}

export interface EligibilityResult {
  eligible: boolean;
  reasons: string[];
  reason?: string;
  attendanceMet: boolean;
  statementMet: boolean;
  evaluationsMet: boolean;
  attendancePercentage?: number;
  attendanceThreshold?: number;
  allEvaluationsCompleted?: boolean;
  statementAccepted?: boolean;
  trainingType?: string;
}

/**
 * Calculates attendance percentage: (attendedJp / totalClassJp) * 100%
 * Rounds to 2 decimal places. Handles division by zero gracefully by returning 0.
 * Strictly preserves fractional accuracy (e.g., 79.5% remains 79.5%, never rounded to 80%).
 */
export function calculateAttendancePercentage(attendedJp: number, totalClassJp: number): number {
  if (!totalClassJp || totalClassJp <= 0 || !attendedJp || attendedJp <= 0) {
    return 0;
  }
  const pct = (attendedJp / totalClassJp) * 100;
  return Math.min(100, Math.round(pct * 100) / 100);
}

/**
 * Checks if attendance percentage meets or exceeds threshold (default 80%)
 */
export function isAttendanceThresholdMet(attendancePercentage: number, threshold: number = 80): boolean {
  return typeof attendancePercentage === "number" && !isNaN(attendancePercentage) && attendancePercentage >= threshold;
}

/**
 * Accumulates attended JP from attendance records, ensuring session idempotence.
 */
export function accumulateAttendedJp(
  sessions: Array<{ id?: string; lessonId?: string; jp?: number }>,
  attendances: Array<{ lessonId: string }>
): { attendedJp: number; totalClassJp: number; attendancePercentage: number } {
  const totalClassJp = sessions.reduce((sum, s) => sum + Math.max(0, Number(s.jp || 0)), 0);
  const attendedLessonIds = new Set(attendances.map((a) => a.lessonId));
  const attendedJp = sessions
    .filter((s) => attendedLessonIds.has(s.lessonId || s.id || ""))
    .reduce((sum, s) => sum + Math.max(0, Number(s.jp || 0)), 0);

  return {
    attendedJp,
    totalClassJp,
    attendancePercentage: calculateAttendancePercentage(attendedJp, totalClassJp),
  };
}

/**
 * Determines the next required evaluation stage in the 4-stage sequential workflow.
 */
export function getNextEvaluationStage(state: EvaluationState): EvaluationStage | "completed" {
  if (!state.evalNarasumberCompleted) return "narasumber";
  if (!state.evalOrganizerCompleted) return "organizer";
  if (!state.evalUnderstandingCompleted) return "understanding";
  if (!state.evalSkmCompleted) return "skm";
  return "completed";
}

/**
 * Validates whether a participant is allowed to submit a specific evaluation stage.
 */
export function validateEvaluationSubmission(
  currentState: EvaluationState,
  stageToSubmit: EvaluationStage
): { allowed: boolean; error?: string } {
  const nextRequired = getNextEvaluationStage(currentState);
  if (nextRequired === "completed") {
    return { allowed: false, error: "Seluruh tahapan evaluasi telah selesai disubmit." };
  }
  if (stageToSubmit !== nextRequired) {
    const stageNames: Record<EvaluationStage, string> = {
      narasumber: "Evaluasi Narasumber",
      organizer: "Evaluasi Kualitas Penyelenggaraan",
      understanding: "Evaluasi Pemahaman Materi (Kuis)",
      skm: "Survei Kepuasan Masyarakat (SKM)",
    };
    return {
      allowed: false,
      error: `Urutan evaluasi tidak valid. Anda harus menyelesaikan ${stageNames[nextRequired]} terlebih dahulu.`,
    };
  }
  return { allowed: true };
}

/**
 * Validates certificate eligibility contract for classical facilitation training.
 */
export function checkClassicalCertificateEligibility(
  params: ClassicalCertificateEligibilityParams
): EligibilityResult {
  const isClassical = params.trainingType === "classical_facilitation";
  const threshold = params.attendanceThreshold ?? 80;
  const reasons: string[] = [];

  // Gate 1: Statement Acceptance
  const statementMet = params.statementAccepted === true;
  if (isClassical && !statementMet) {
    reasons.push("Pernyataan kebenaran data profil belum disetujui oleh peserta.");
  }

  // Gate 2: Attendance Threshold (minimal 80%)
  const attendanceMet = isAttendanceThresholdMet(params.attendancePercentage, threshold);
  if (isClassical && !attendanceMet) {
    reasons.push(
      `Kehadiran peserta (${params.attendancePercentage}%) belum memenuhi syarat minimal ${threshold}% total JP.`
    );
  }

  // Gate 3: 4-Stage Sequential Evaluations Completion
  const evaluationsMet = Boolean(
    params.allEvaluationsCompleted ??
      (params.evalNarasumberCompleted &&
        params.evalOrganizerCompleted &&
        params.evalUnderstandingCompleted &&
        params.evalSkmCompleted)
  );

  if (isClassical && !evaluationsMet) {
    reasons.push("Seluruh rangkaian 4 tahap evaluasi pelatihan belum lengkap.");
  }

  const eligible = isClassical ? statementMet && attendanceMet && evaluationsMet : true;

  return {
    eligible,
    reasons,
    reason: reasons.length > 0 ? reasons[0] : undefined,
    attendanceMet,
    statementMet,
    evaluationsMet,
    attendancePercentage: params.attendancePercentage,
    attendanceThreshold: threshold,
    allEvaluationsCompleted: evaluationsMet,
    statementAccepted: statementMet,
    trainingType: params.trainingType,
  };
}

/**
 * Sanitizes participant NIP or NIK to digits only.
 */
export function sanitizeParticipantNip(raw?: string | null): string {
  if (typeof raw !== "string") return "";
  return raw.trim().replace(/\D/g, "");
}

/**
 * Validates participant profile data and statement agreement before enrollment.
 */
export function validateParticipantStatement(payload: {
  name?: string;
  nip?: string;
  institution?: string;
  statementAccepted: boolean;
}): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!payload.name || payload.name.trim().length < 3) {
    errors.push("Nama lengkap minimal 3 karakter.");
  }
  const cleanNip = sanitizeParticipantNip(payload.nip);
  if (cleanNip.length !== 18 && cleanNip.length !== 16) {
    errors.push("NIP harus 18 digit atau NIK harus 16 digit angka.");
  }
  if (!payload.institution || payload.institution.trim().length < 2) {
    errors.push("Instansi asal harus diisi.");
  }
  if (payload.statementAccepted !== true) {
    errors.push("Checklist pernyataan kebenaran data profil wajib dicentang sebelum mendaftar.");
  }
  return { valid: errors.length === 0, errors };
}
