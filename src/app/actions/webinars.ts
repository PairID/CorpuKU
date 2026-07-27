"use server";

import { sql } from '@/lib/db';
import { Webinar, WebinarQuizQuestion, WebinarRegistration } from '@/lib/types';
import { revalidatePath } from 'next/cache';
import { v4 as uuidv4 } from 'uuid';
import { createKnowledgeItem } from './knowledge';
import { requireAdminSession, requireUserSession } from "./auth";
import { issueEligibleWebinarCertificates, issueWebinarCertificate } from '@/lib/webinar-certificates';
import { sanitizePlainText } from '@/lib/content-security';
import { z } from 'zod';

const optionalUrl = z.union([z.string().url().max(2048), z.literal(''), z.null()]).optional();
const quizQuestionSchema = z.object({
  id: z.string().max(100).optional(), question: z.string().trim().min(3).max(500),
  options: z.array(z.string().trim().min(1).max(300)).min(2).max(10),
  correctAnswer: z.number().int().min(0).max(9),
}).refine(question => question.correctAnswer < question.options.length, { message: 'Jawaban benar tidak valid.' });
const webinarInputSchema = z.object({
  title: z.string().trim().min(5).max(200), description: z.string().max(5000),
  thumbnailUrl: optionalUrl, meetingLink: optionalUrl, materialUrl: optionalUrl, virtualBackgroundUrl: optionalUrl,
  scheduledAt: z.string().refine(value => !Number.isNaN(Date.parse(value)), 'Jadwal tidak valid.'),
  attendanceCode: z.union([z.string().trim().min(4).max(50), z.literal(''), z.null()]).optional(),
  status: z.enum(['draft', 'published', 'completed']).default('draft'),
  quizSettings: z.object({ passingScore: z.number().int().min(0).max(100).default(60), questions: z.array(quizQuestionSchema).min(1).max(100) }).optional(),
  joinWindowMinutes: z.number().int().min(5).max(240).default(30),
  certificateEnabled: z.boolean().default(true), certificateAutoIssue: z.boolean().default(true),
  certificateTemplateType: z.enum(['sertifikat', 'surat_keterangan', 'sttp']).default('sertifikat'),
  certificateNumberPrefix: z.string().trim().min(2).max(20).default('WEB'),
  certificateJp: z.number().int().min(1).max(999).default(2),
});

type WebinarDbRow = {
  id: string; title: string; description: string; thumbnail_url: string | null;
  meeting_link?: string | null; material_url?: string | null; virtual_background_url?: string | null;
  scheduled_at: string | Date; attendance_code?: string | null; status: Webinar['status'];
  quiz_settings?: unknown; join_window_minutes?: number | null; created_at: string | Date; updated_at: string | Date;
  certificate_enabled?: boolean; certificate_auto_issue?: boolean;
  certificate_template_type?: Webinar['certificateTemplateType'];
  certificate_number_prefix?: string; certificate_jp?: number;
};

type RegistrationDbRow = {
  id: string; user_id: string; webinar_id: string; registered_at: string | Date;
  attended: boolean; evaluation_completed: boolean; certificate_generated: boolean;
  evaluation_score?: number | null;
};

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function certificateConfig(data: Partial<Webinar>) {
  const prefix = String(data.certificateNumberPrefix || 'WEB').trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '-').slice(0, 20) || 'WEB';
  const template = ['sertifikat', 'surat_keterangan', 'sttp'].includes(String(data.certificateTemplateType))
    ? data.certificateTemplateType as Webinar['certificateTemplateType']
    : 'sertifikat';
  const rawJp = Number(data.certificateJp ?? 2);
  return {
    enabled: data.certificateEnabled !== false,
    autoIssue: data.certificateAutoIssue !== false,
    template,
    prefix,
    jp: Number.isInteger(rawJp) && rawJp >= 1 && rawJp <= 999 ? rawJp : 2,
  };
}

async function syncToKMS(webinar: Partial<Pick<Webinar, 'title' | 'scheduledAt'>> & { thumbnail_url?: string | null }, assetUrl: string, type: string) {
  if (!assetUrl) return;
  
  try {
    const title = `[Webinar Asset] ${type}: ${webinar.title || 'Webinar'}`;
    const eventDate = webinar.scheduledAt ? new Date(webinar.scheduledAt).toLocaleDateString('id-ID') : '-';
    const description = `Asset ${type} dari webinar "${webinar.title || 'Webinar'}" yang diselenggarakan pada ${eventDate}.`;
    
    await createKnowledgeItem({
      title,
      description,
      category: 'Webinar Materials',
      thumbnailUrl: type === 'Thumbnail' ? assetUrl : webinar.thumbnail_url,
      videoUrl: null,
      privacy: 'public',
      status: 'published',
      tags: ['webinar', type.toLowerCase()]
    });
  } catch (error) {
    console.error("Failed to sync to KMS:", error);
  }
}

export async function getWebinars(): Promise<Webinar[]> {
  try {
    const rows = await sql`
      SELECT id, title, description, thumbnail_url, scheduled_at, status,
             join_window_minutes, created_at, updated_at
      FROM webinars
      WHERE status = 'published' 
      ORDER BY scheduled_at ASC
    `;
    return rows.map(mapPublicWebinarRow);
  } catch (error) {
    console.error("Failed to fetch webinars:", error);
    return [];
  }
}

export async function getAdminWebinars(): Promise<Webinar[]> {
  try {
    await requireAdminSession();

    const rows = await sql`
      SELECT * FROM webinars 
      ORDER BY created_at DESC
    `;
    return rows.map(row => mapWebinarRow(row, true));
  } catch (error) {
    console.error("Failed to fetch admin webinars:", error);
    return [];
  }
}

/** Public webinar data. Secrets and answer keys are deliberately omitted. */
export async function getWebinar(id: string): Promise<Webinar | null> {
  try {
    const rows = await sql`
      SELECT id, title, description, thumbnail_url, scheduled_at, status,
             join_window_minutes, created_at, updated_at
      FROM webinars WHERE id = ${id} AND status <> 'draft'
    `;
    if (rows.length === 0) return null;
    return mapPublicWebinarRow(rows[0]);
  } catch (error) {
    console.error(`Failed to fetch webinar ${id}:`, error);
    return null;
  }
}

export async function getAdminWebinar(id: string): Promise<Webinar | null> {
  try {
    await requireAdminSession();
    const rows = await sql`SELECT * FROM webinars WHERE id = ${id}`;
    return rows[0] ? mapWebinarRow(rows[0], true) : null;
  } catch (error) {
    console.error(`Failed to fetch admin webinar ${id}:`, error);
    return null;
  }
}

export async function getParticipantWebinar(id: string): Promise<Webinar | null> {
  try {
    const session = await requireUserSession();
    const rows = await sql`
      SELECT w.id, w.title, w.description, w.thumbnail_url,
             CASE WHEN CURRENT_TIMESTAMP >= w.scheduled_at - (COALESCE(w.join_window_minutes, 30) * INTERVAL '1 minute')
                  THEN w.meeting_link ELSE NULL END AS meeting_link,
             w.material_url, w.virtual_background_url, w.scheduled_at,
             NULL AS attendance_code, w.status, w.quiz_settings,
             w.join_window_minutes, w.certificate_enabled, w.certificate_auto_issue,
             w.certificate_template_type, w.certificate_number_prefix, w.certificate_jp,
             w.created_at, w.updated_at
      FROM webinars w
      JOIN webinar_registrations wr ON wr.webinar_id = w.id
      WHERE w.id = ${id} AND wr.user_id = ${session.user.id}
    `;
    return rows[0] ? mapWebinarRow(rows[0], false) : null;
  } catch (error) {
    console.error(`Failed to fetch participant webinar ${id}:`, error);
    return null;
  }
}

export async function createWebinar(input: unknown): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    await requireAdminSession();
    const parsed = webinarInputSchema.safeParse(input);
    if (!parsed.success) return { success: false, error: 'Data webinar tidak valid.' };
    const data = {
      ...parsed.data,
      title: sanitizePlainText(parsed.data.title),
      description: sanitizePlainText(parsed.data.description),
    };
    if (data.title.length < 5) return { success: false, error: 'Judul webinar tidak valid.' };

    const id = uuidv4();
    const certificate = certificateConfig(data);
    await sql`
      INSERT INTO webinars (
        id, title, description, thumbnail_url, meeting_link, 
        material_url, virtual_background_url, scheduled_at, attendance_code, status, quiz_settings, join_window_minutes,
        certificate_enabled, certificate_auto_issue, certificate_template_type, certificate_number_prefix, certificate_jp
      ) VALUES (
        ${id}, ${data.title}, ${data.description}, ${data.thumbnailUrl || null}, ${data.meetingLink || null},
        ${data.materialUrl || null}, ${data.virtualBackgroundUrl || null}, ${data.scheduledAt}, ${data.attendanceCode || null}, ${data.status || 'draft'},
        ${JSON.stringify(data.quizSettings || null)},
        ${data.joinWindowMinutes || 30}, ${certificate.enabled}, ${certificate.autoIssue}, ${certificate.template}, ${certificate.prefix}, ${certificate.jp}
      )
    `;
    
    revalidatePath('/admin/webinars');
    revalidatePath('/webinars');
 
    // Sync to KMS
    if (data.thumbnailUrl) await syncToKMS(data, data.thumbnailUrl, 'Thumbnail');
    if (data.materialUrl) await syncToKMS(data, data.materialUrl, 'Material');
    if (data.virtualBackgroundUrl) await syncToKMS(data, data.virtualBackgroundUrl, 'Virtual Background');

    return { success: true, id };
  } catch (error: unknown) {
    console.error("Failed to create webinar:", error);
    return { success: false, error: errorMessage(error, 'Gagal membuat webinar.') };
  }
}

export async function updateWebinar(id: string, input: unknown): Promise<{ success: boolean; error?: string }> {
  try {
    await requireAdminSession();
    if (!/^[A-Za-z0-9_-]{1,255}$/.test(id)) return { success: false, error: 'ID webinar tidak valid.' };
    const parsed = webinarInputSchema.partial().safeParse(input);
    if (!parsed.success || Object.keys(parsed.data).length === 0) return { success: false, error: 'Data webinar tidak valid.' };
    const data = {
      ...parsed.data,
      ...(parsed.data.title !== undefined ? { title: sanitizePlainText(parsed.data.title) } : {}),
      ...(parsed.data.description !== undefined ? { description: sanitizePlainText(parsed.data.description) } : {}),
    };
    if (data.title !== undefined && data.title.length < 5) return { success: false, error: 'Judul webinar tidak valid.' };
    const certificate = certificateConfig(data);

    await sql`
      UPDATE webinars SET 
        title = COALESCE(${data.title !== undefined ? data.title : null}, title),
        description = COALESCE(${data.description !== undefined ? data.description : null}, description),
        thumbnail_url = COALESCE(${data.thumbnailUrl !== undefined ? data.thumbnailUrl : null}, thumbnail_url),
        meeting_link = COALESCE(${data.meetingLink !== undefined ? data.meetingLink : null}, meeting_link),
        material_url = COALESCE(${data.materialUrl !== undefined ? data.materialUrl : null}, material_url),
        virtual_background_url = COALESCE(${data.virtualBackgroundUrl !== undefined ? data.virtualBackgroundUrl : null}, virtual_background_url),
        scheduled_at = COALESCE(${data.scheduledAt !== undefined ? data.scheduledAt : null}, scheduled_at),
        attendance_code = COALESCE(${data.attendanceCode !== undefined ? data.attendanceCode : null}, attendance_code),
        status = COALESCE(${data.status !== undefined ? data.status : null}, status),
        quiz_settings = COALESCE(${data.quizSettings !== undefined ? JSON.stringify(data.quizSettings) : null}, quiz_settings),
        join_window_minutes = COALESCE(${data.joinWindowMinutes !== undefined ? data.joinWindowMinutes : null}, join_window_minutes),
        certificate_enabled = COALESCE(${data.certificateEnabled !== undefined ? certificate.enabled : null}, certificate_enabled),
        certificate_auto_issue = COALESCE(${data.certificateAutoIssue !== undefined ? certificate.autoIssue : null}, certificate_auto_issue),
        certificate_template_type = COALESCE(${data.certificateTemplateType !== undefined ? certificate.template : null}, certificate_template_type),
        certificate_number_prefix = COALESCE(${data.certificateNumberPrefix !== undefined ? certificate.prefix : null}, certificate_number_prefix),
        certificate_jp = COALESCE(${data.certificateJp !== undefined ? certificate.jp : null}, certificate_jp),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${id}
    `;
    
    revalidatePath('/admin/webinars');
    revalidatePath('/webinars');
    revalidatePath(`/webinars/${id}`);
    revalidatePath(`/dashboard/webinars/${id}`);

    // Sync to KMS if changed
    if (data.thumbnailUrl) {
      const webinar = await getAdminWebinar(id);
      if (webinar) await syncToKMS(webinar, data.thumbnailUrl, 'Thumbnail');
    }
    if (data.materialUrl) {
      const webinar = await getAdminWebinar(id);
      if (webinar) await syncToKMS(webinar, data.materialUrl, 'Material');
    }
    if (data.virtualBackgroundUrl) {
      const webinar = await getAdminWebinar(id);
      if (webinar) await syncToKMS(webinar, data.virtualBackgroundUrl, 'Virtual Background');
    }

    const autoIssue = await sql`SELECT certificate_enabled, certificate_auto_issue FROM webinars WHERE id = ${id}`;
    if (autoIssue[0]?.certificate_enabled && autoIssue[0]?.certificate_auto_issue) {
      await issueEligibleWebinarCertificates(id);
    }

    return { success: true };
  } catch (error: unknown) {
    console.error("Failed to update webinar:", error);
    return { success: false, error: errorMessage(error, 'Gagal memperbarui webinar.') };
  }
}

export async function deleteWebinar(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    await requireAdminSession();

    await sql`DELETE FROM webinars WHERE id = ${id}`;
    revalidatePath('/admin/webinars');
    revalidatePath('/webinars');
    return { success: true };
  } catch (error: unknown) {
    console.error("Failed to delete webinar:", error);
    return { success: false, error: errorMessage(error, 'Gagal menghapus webinar.') };
  }
}

// ================= Registrations =================

export async function getWebinarRegistration(webinarId: string): Promise<WebinarRegistration | null> {
  try {
    const session = await requireUserSession();

    const rows = await sql`
      SELECT * FROM webinar_registrations WHERE webinar_id = ${webinarId} AND user_id = ${session.user.id}
    `;
    if (rows.length === 0) return null;
    return mapRegistrationRow(rows[0]);
  } catch (error) {
    console.error("Failed to fetch registration:", error);
    return null;
  }
}

export async function registerForWebinar(webinarId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await requireUserSession();
    const webinar = await sql`SELECT id FROM webinars WHERE id = ${webinarId} AND status = 'published'`;
    if (!webinar[0]) return { success: false, error: "Webinar tidak tersedia untuk pendaftaran." };

    const id = uuidv4();
    await sql`
      INSERT INTO webinar_registrations (id, user_id, webinar_id)
      VALUES (${id}, ${session.user.id}, ${webinarId})
      ON CONFLICT (user_id, webinar_id) DO NOTHING
    `;
    
    revalidatePath(`/webinars/${webinarId}`);
    revalidatePath(`/dashboard/webinars/${webinarId}`);
    return { success: true };
  } catch (error: unknown) {
    console.error("Failed to register for webinar:", error);
    return { success: false, error: errorMessage(error, 'Gagal mendaftar webinar.') };
  }
}

export async function attendWebinar(webinarId: string, attendanceCode: string): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await requireUserSession();
    const code = attendanceCode.trim();
    if (!code || code.length > 50) {
      return { success: false, error: "Kode presensi tidak valid" };
    }

    const attemptRows = await sql`
      INSERT INTO webinar_attendance_attempts (user_id, webinar_id, window_started_at, attempt_count)
      VALUES (${session.user.id}, ${webinarId}, CURRENT_TIMESTAMP, 1)
      ON CONFLICT (user_id, webinar_id) DO UPDATE SET
        window_started_at = CASE
          WHEN webinar_attendance_attempts.window_started_at < CURRENT_TIMESTAMP - INTERVAL '15 minutes'
          THEN CURRENT_TIMESTAMP ELSE webinar_attendance_attempts.window_started_at END,
        attempt_count = CASE
          WHEN webinar_attendance_attempts.window_started_at < CURRENT_TIMESTAMP - INTERVAL '15 minutes'
          THEN 1 ELSE webinar_attendance_attempts.attempt_count + 1 END
      RETURNING attempt_count
    `;
    if (Number(attemptRows[0]?.attempt_count || 0) > 10) {
      return { success: false, error: "Terlalu banyak percobaan. Coba lagi dalam 15 menit." };
    }

    const result = await sql`
      UPDATE webinar_registrations wr
      SET attended = true, attended_at = COALESCE(attended_at, CURRENT_TIMESTAMP)
      FROM webinars w
      WHERE wr.webinar_id = w.id
        AND wr.webinar_id = ${webinarId}
        AND wr.user_id = ${session.user.id}
        AND w.attendance_code = ${code}
        AND CURRENT_TIMESTAMP >= w.scheduled_at - (COALESCE(w.join_window_minutes, 30) * INTERVAL '1 minute')
        AND CURRENT_TIMESTAMP <= w.scheduled_at + INTERVAL '6 hours'
      RETURNING wr.id
    `;

    if (result.length === 0) {
      return { success: false, error: "Kode salah atau waktu presensi sudah ditutup." };
    }

    await sql`DELETE FROM webinar_attendance_attempts WHERE user_id = ${session.user.id} AND webinar_id = ${webinarId}`;

    revalidatePath(`/dashboard/webinars/${webinarId}`);
    return { success: true };
  } catch (error: unknown) {
    console.error("Failed to mark attendance:", error);
    return { success: false, error: errorMessage(error, 'Gagal menyimpan presensi.') };
  }
}

export async function submitWebinarEvaluation(webinarId: string, answers: number[]): Promise<{ success: boolean; score?: number; error?: string }> {
  try {
    const session = await requireUserSession();
    if (!Array.isArray(answers) || answers.length > 100 || answers.some(answer => !Number.isInteger(answer))) {
      return { success: false, error: "Jawaban evaluasi tidak valid." };
    }

    const webinarRows = await sql`
      SELECT quiz_settings, certificate_enabled, certificate_auto_issue FROM webinars WHERE id = ${webinarId}
    `;
    if (!webinarRows[0]) return { success: false, error: "Webinar tidak ditemukan." };

    const quizSettings = normalizeQuizSettings(webinarRows[0].quiz_settings);
    if (answers.length !== quizSettings.questions.length) {
      return { success: false, error: "Semua pertanyaan wajib dijawab." };
    }

    const correct = quizSettings.questions.reduce((count, question, index) =>
      count + (answers[index] === question.correctAnswer ? 1 : 0), 0);
    const score = Math.round((correct / quizSettings.questions.length) * 100);
    if (score < quizSettings.passingScore) {
      return { success: false, score, error: `Nilai minimum ${quizSettings.passingScore}. Nilai Anda ${score}.` };
    }

    const result = await sql`
      UPDATE webinar_registrations 
      SET evaluation_completed = true,
          evaluation_score = ${score},
          evaluation_answers = ${JSON.stringify(answers)},
          evaluation_completed_at = COALESCE(evaluation_completed_at, CURRENT_TIMESTAMP)
      WHERE webinar_id = ${webinarId} AND user_id = ${session.user.id} AND attended = true
      RETURNING id
    `;

    if (result.length === 0) {
      return { success: false, error: "Hanya peserta yang telah hadir (presensi) yang dapat mengisi evaluasi." };
    }


    if (webinarRows[0].certificate_enabled && webinarRows[0].certificate_auto_issue) {
      await issueWebinarCertificate(session.user.id, webinarId);
    }

    revalidatePath(`/dashboard/webinars/${webinarId}`);
    return { success: true, score };
  } catch (error: unknown) {
    console.error("Failed to submit evaluation:", error);
    return { success: false, error: errorMessage(error, 'Gagal menyimpan evaluasi.') };
  }
}

// Helpers to map DB snake_case to camelCase
function mapWebinarRow(input: Record<string, unknown>, includeAnswers = true): Webinar {
  const row = input as unknown as WebinarDbRow;
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    thumbnailUrl: row.thumbnail_url,
    meetingLink: row.meeting_link || null,
    materialUrl: row.material_url || null,
    virtualBackgroundUrl: row.virtual_background_url || null,
    scheduledAt: new Date(row.scheduled_at).toISOString(),
    attendanceCode: includeAnswers ? row.attendance_code || null : null,
    status: row.status,
    quizSettings: mapQuizSettingsForClient(row.quiz_settings, includeAnswers),
    joinWindowMinutes: row.join_window_minutes || 30,
    certificateEnabled: row.certificate_enabled !== false,
    certificateAutoIssue: row.certificate_auto_issue !== false,
    certificateTemplateType: row.certificate_template_type || 'sertifikat',
    certificateNumberPrefix: row.certificate_number_prefix || 'WEB',
    certificateJp: row.certificate_jp || 2,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

function mapPublicWebinarRow(input: Record<string, unknown>): Webinar {
  const row = input as unknown as WebinarDbRow;
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    thumbnailUrl: row.thumbnail_url,
    meetingLink: null,
    materialUrl: null,
    virtualBackgroundUrl: null,
    scheduledAt: new Date(row.scheduled_at).toISOString(),
    attendanceCode: null,
    status: row.status,
    quizSettings: undefined,
    joinWindowMinutes: row.join_window_minutes || 30,
    certificateEnabled: false,
    certificateAutoIssue: false,
    certificateTemplateType: 'sertifikat',
    certificateNumberPrefix: 'WEB',
    certificateJp: 2,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

const FALLBACK_QUESTIONS: Required<WebinarQuizQuestion>[] = [
  { id: 'default-1', question: 'Berapa JP yang didapatkan dari webinar ini?', options: ['1 JP', '2 JP', '3 JP', '4 JP'], correctAnswer: 1 },
  { id: 'default-2', question: 'Siapa penyelenggara utama kegiatan webinar ini?', options: ['BPSDM Kaltara', 'Dinas Pendidikan', 'Sekretariat Daerah', 'Bappeda'], correctAnswer: 0 },
];

function normalizeQuizSettings(value: unknown): { passingScore: number; questions: Required<WebinarQuizQuestion>[] } {
  const settings = value && typeof value === 'object' ? value as { passingScore?: unknown; questions?: unknown } : {};
  const questions = Array.isArray(settings.questions) ? settings.questions : [];
  const normalized = questions.flatMap((item, index) => {
    if (!item || typeof item !== 'object') return [];
    const question = item as Record<string, unknown>;
    if (typeof question.question !== 'string' || !Array.isArray(question.options) || !Number.isInteger(question.correctAnswer)) return [];
    const options = question.options.filter((option): option is string => typeof option === 'string').slice(0, 10);
    const correctAnswer = Number(question.correctAnswer);
    if (options.length < 2 || correctAnswer < 0 || correctAnswer >= options.length) return [];
    return [{ id: typeof question.id === 'string' ? question.id : `question-${index + 1}`, question: question.question, options, correctAnswer }];
  });
  const passingScore = typeof settings.passingScore === 'number' && settings.passingScore >= 0 && settings.passingScore <= 100
    ? Math.round(settings.passingScore)
    : 60;
  return { passingScore, questions: normalized.length ? normalized : FALLBACK_QUESTIONS };
}

function mapQuizSettingsForClient(value: unknown, includeAnswers: boolean) {
  const settings = normalizeQuizSettings(value);
  return {
    passingScore: settings.passingScore,
    questions: settings.questions.map(question => includeAnswers ? question : {
      id: question.id,
      question: question.question,
      options: question.options,
    }),
  };
}

function mapRegistrationRow(input: Record<string, unknown>): WebinarRegistration {
  const row = input as unknown as RegistrationDbRow;
  return {
    id: row.id,
    userId: row.user_id,
    webinarId: row.webinar_id,
    registeredAt: new Date(row.registered_at).toISOString(),
    attended: row.attended,
    evaluationCompleted: Boolean(row.evaluation_completed && row.evaluation_score !== null && row.evaluation_score !== undefined),
    certificateGenerated: row.certificate_generated,
    evaluationScore: row.evaluation_score,
  };
}
