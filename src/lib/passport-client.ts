/**
 * Client Integrasi Resmi: ASN Learning Passport BPSDM Kaltara
 * Base URL: https://api.learningpassport.space/api
 */

export interface PassportUserProfile {
  id: string;
  name: string;
  nip: string;
  email: string;
  role: string;
  department: string;
  position: string;
  rank: string;
  phone?: string | null;
}

export interface PassportVerifyUserResult {
  success: boolean;
  message: string;
  user?: PassportUserProfile;
  ssoToken?: string;
}

export interface PassportStats {
  asn: {
    name: string;
    nip: string;
    department: string;
  };
  stats: {
    completedJp: number;
    targetJp: number;
    isCompliant: boolean;
  };
}

function getApiConfig() {
  const baseUrl = (process.env.PASSPORT_API_URL || 'https://api.learningpassport.space/api').replace(/\/+$/, '');
  const apiKey = process.env.PASSPORT_API_KEY || '';
  return { baseUrl, apiKey };
}

/**
 * Mengambil data profil resmi ASN (Nama, NIP, Jabatan, Pangkat, OPD) dari ASN Learning Passport.
 */
export async function getPassportUserProfile(params: {
  nip?: string;
  email?: string;
}): Promise<PassportUserProfile | null> {
  const { baseUrl, apiKey } = getApiConfig();
  if (!apiKey) return null;

  try {
    const query = params.nip ? `nip=${encodeURIComponent(params.nip)}` : `email=${encodeURIComponent(params.email || '')}`;
    const endpoint = `${baseUrl}/v1/public/auth/user-profile?${query}`;

    const res = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'X-API-Key': apiKey,
        'Content-Type': 'application/json',
      },
      next: { revalidate: 300 }, // Cache 5 menit di Next.js
    });

    if (!res.ok) {
      if (res.status === 404) return null;
      console.warn(`[Passport API] getPassportUserProfile status ${res.status}`);
      return null;
    }

    const data = await res.json();
    return data as PassportUserProfile;
  } catch (err) {
    console.warn('[Passport API] Gagal mengambil profil user:', err);
    return null;
  }
}

/**
 * Delegated Login / SSO: Verifikasi kredensial NIP/Email dan password ke ASN Learning Passport.
 */
export async function verifyPassportUser(
  identifier: string,
  password: string
): Promise<PassportVerifyUserResult> {
  const { baseUrl, apiKey } = getApiConfig();
  if (!apiKey) {
    return { success: false, message: 'PASSPORT_API_KEY belum dikonfigurasi di server.' };
  }

  try {
    const endpoint = `${baseUrl}/v1/public/auth/verify-user`;
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'X-API-Key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ identifier: identifier.trim(), password }),
    });

    const data = await res.json();
    if (!res.ok) {
      return {
        success: false,
        message: data.message || 'Verifikasi login ASN gagal.',
      };
    }

    return data as PassportVerifyUserResult;
  } catch (err) {
    console.error('[Passport API] Gagal verifikasi SSO user:', err);
    return { success: false, message: 'Gagal menghubungi server ASN Learning Passport.' };
  }
}

/**
 * Mengambil riwayat paspor pembelajaran, target JP, dan status kepatuhan Bangkom ASN.
 */
export async function getPassportStats(nip: string): Promise<PassportStats | null> {
  const { baseUrl, apiKey } = getApiConfig();
  if (!apiKey) return null;

  try {
    const cleanNip = nip.replace(/[^\w]/g, '');
    const endpoint = `${baseUrl}/v1/public/asn/${encodeURIComponent(cleanNip)}/passport`;

    const res = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'X-API-Key': apiKey,
        'Content-Type': 'application/json',
      },
      next: { revalidate: 300 },
    });

    if (!res.ok) return null;
    const data = await res.json();
    return data as PassportStats;
  } catch (err) {
    console.warn('[Passport API] Gagal mengambil stats paspor:', err);
    return null;
  }
}
