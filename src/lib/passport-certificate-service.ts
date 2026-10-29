import { sql } from './db';

const ROMAN_MONTHS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];

export interface ParticipantCertificateInfo {
  name: string;
  nip?: string | null;
  rank?: string | null;
  position?: string | null;
  institution?: string | null;
  phone?: string | null;
  email?: string | null;
}

export interface ReserveCertificateOptions {
  trainingName: string;
  batchCode?: string;
  category?: string;
  trainingType?: string;
  jp?: number;
  activityDate?: Date | string | null;
  participant: ParticipantCertificateInfo;
}

export interface ReservedCertificateResult {
  certificateNumber: string;
  sequenceNumber: number;
  source: 'passport_api' | 'local_counter';
  verificationUrl?: string;
}

export interface PassportIntegrationConfig {
  apiUrl: string;
  apiKey: string;
  enabled: boolean;
  source: 'database' | 'env';
}

/**
 * Mengambil konfigurasi integrasi aktif:
 * Prioritas 1: Database (`certificate_settings` WHERE type = 'passport_integration')
 * Prioritas 2: Fallback ke environment variable `PASSPORT_API_URL` & `PASSPORT_API_KEY`
 */
export async function getActivePassportConfig(): Promise<PassportIntegrationConfig | null> {
  // 1. Cek dari database (Prioritas Utama — Dinamis tanpa restart server)
  try {
    const row = await sql`
      SELECT settings FROM certificate_settings WHERE type = 'passport_integration' LIMIT 1
    `;
    const settings = row[0]?.settings as { apiUrl?: string; apiKey?: string; enabled?: boolean } | undefined;
    if (settings && typeof settings === 'object') {
      if (settings.enabled === false) {
        return null; // Dinonaktifkan secara eksplisit oleh admin
      }
      if (settings.apiUrl && settings.apiKey) {
        return {
          apiUrl: settings.apiUrl.trim(),
          apiKey: settings.apiKey.trim(),
          enabled: true,
          source: 'database',
        };
      }
    }
  } catch (err) {
    console.warn('[PassportConfig] Gagal membaca konfigurasi DB, mencoba env fallback:', err);
  }

  // 2. Fallback ke environment variable
  const envUrl = process.env.PASSPORT_API_URL?.trim();
  const envKey = process.env.PASSPORT_API_KEY?.trim();
  if (envUrl && envKey) {
    return {
      apiUrl: envUrl,
      apiKey: envKey,
      enabled: true,
      source: 'env',
    };
  }

  return null;
}

/**
 * Memesan nomor sertifikat resmi standar BPSDM Kaltara (Satu Pintu).
 * 
 * 1. Prioritas Utama: Mengontak Master Register di ASN Learning Passport via REST API.
 *    Jika sukses, nomor resmi didapat dan ASN Learning Passport langsung mencatat
 *    ini ke buku register alumni pelatihan & profil paspor ASN peserta.
 * 
 * 2. Fallback Otomatis: Jika ASN Learning Passport offline atau belum dikonfigurasi,
 *    sistem menggunakan atomic increment pada tabel `certificate_counters` lokal CorpuKU.
 *    Aplikasi dijamin zero-downtime, tidak pernah gagal menerbitkan sertifikat.
 */
export async function reserveOfficialCertificateNumber(
  options: ReserveCertificateOptions
): Promise<ReservedCertificateResult> {
  const activityDate = options.activityDate ? new Date(options.activityDate) : new Date();
  const year = activityDate.getFullYear();
  const monthIdx = activityDate.getMonth();
  const romanMonth = ROMAN_MONTHS[monthIdx] || 'I';
  const rawBatchCode = options.batchCode?.trim() || 'AKJ-26';
  const safeBatchCode = rawBatchCode.toUpperCase().replace(/[^A-Z0-9_.-]/g, '-').slice(0, 30) || 'AKJ-26';

  // 1. Coba hubungi ASN Learning Passport jika konfigurasi API tersedia (DB atau ENV)
  const activeConfig = await getActivePassportConfig();
  if (activeConfig) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500); // 3.5s timeout

      const baseUrl = activeConfig.apiUrl.replace(/\/+$/, '').replace(/\/api$/, '');
      const endpoint = `${baseUrl}/api/alumni/external/issue-number`;
      const dateString = activityDate.toISOString().slice(0, 10);

      const payload = {
        trainingName: options.trainingName.trim(),
        batchCode: safeBatchCode,
        category: options.category || 'Teknis',
        trainingType: options.trainingType || 'E-Learning',
        jp: Number(options.jp || 2),
        startDate: dateString,
        endDate: dateString,
        participants: [
          {
            name: options.participant.name.trim(),
            nip: options.participant.nip?.trim() || '-',
            rank: options.participant.rank?.trim() || null,
            position: options.participant.position?.trim() || null,
            institution: options.participant.institution?.trim() || 'Peserta Eksternal CorpUKU',
            phone: options.participant.phone?.trim() || null,
            email: options.participant.email?.trim() || null,
          },
        ],
      };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': activeConfig.apiKey,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        const cert = data?.certificates?.[0];
        if (cert?.certificateNumber) {
          return {
            certificateNumber: cert.certificateNumber,
            sequenceNumber: Number(cert.sequenceNumber) || 0,
            source: 'passport_api',
            verificationUrl: cert.verificationUrl,
          };
        }
      } else {
        console.warn(`[Passport API] Gagal memesan nomor (HTTP ${response.status}):`, await response.text().catch(() => ''));
      }
    } catch (err: unknown) {
      console.warn('[Passport API] Tidak dapat menghubungi server ASN Learning Passport, beralih ke counter lokal:', err);
    }
  }

  // 2. Fallback Aman: Atomic Increment pada tabel certificate_counters lokal
  const res = await sql`
    INSERT INTO certificate_counters (id, year, last_number, updated_at)
    VALUES (gen_random_uuid(), ${year}, 1, CURRENT_TIMESTAMP)
    ON CONFLICT (year) DO UPDATE
    SET last_number = certificate_counters.last_number + 1,
        updated_at = CURRENT_TIMESTAMP
    RETURNING last_number
  `;

  const seqNumber = Number(res[0]?.last_number || 1);
  const seqStr = String(seqNumber).padStart(5, '0');

  // Format Standar Naskah Dinas BPSDM Kaltara
  const certificateNumber = `800.2.5/${seqStr}/BPSDM/${safeBatchCode}/${romanMonth}/${year}`;

  return {
    certificateNumber,
    sequenceNumber: seqNumber,
    source: 'local_counter',
  };
}
