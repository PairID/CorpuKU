import { CheckCircle2, ShieldCheck, XCircle } from "lucide-react";
import { getCertificateByVerificationToken } from "@/lib/webinar-certificates";
import { getCourseCertificateByVerificationToken } from "@/lib/course-certificates";

export const dynamic = "force-dynamic";

function maskNip(nip?: string | null) {
  if (!nip) return "-";
  if (nip.length <= 6) return `${nip.slice(0, 2)}****`;
  return `${nip.slice(0, 4)}${"*".repeat(Math.min(10, nip.length - 6))}${nip.slice(-2)}`;
}

export default async function VerifyCertificatePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const webinarCertificate = await getCertificateByVerificationToken(token);
  const courseCertificate = webinarCertificate ? null : await getCourseCertificateByVerificationToken(token);
  const certificate = webinarCertificate ? {
    ...webinarCertificate,
    activityType: "Webinar",
    activityTitle: webinarCertificate.webinarTitle,
    activityAt: webinarCertificate.webinarScheduledAt,
  } : courseCertificate ? {
    ...courseCertificate,
    activityType: "Kursus",
    activityTitle: courseCertificate.courseTitle,
    activityAt: courseCertificate.completedAt,
  } : null;

  if (!certificate) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-oxford-50 p-6 dark:bg-oxford-950">
        <section className="w-full max-w-xl rounded-3xl border border-red-200 bg-white p-10 text-center shadow-xl dark:bg-[#161B2A]">
          <XCircle className="mx-auto mb-5 text-red-600" size={64} />
          <h1 className="text-3xl font-bold text-oxford-900 dark:text-white">Sertifikat tidak ditemukan</h1>
          <p className="mt-3 text-oxford-600 dark:text-oxford-300">Tautan verifikasi tidak valid atau dokumen tidak tercatat pada sistem CorpuKU.</p>
        </section>
      </main>
    );
  }

  const revoked = Boolean(certificate.revokedAt);
  const details = [
    ["Nomor sertifikat", certificate.certificateNumber],
    ["Nama peserta", certificate.participantName],
    ["NIP", maskNip(certificate.participantNip)],
    [certificate.activityType, certificate.activityTitle],
    ["Tanggal kegiatan", new Date(certificate.activityAt).toLocaleDateString("id-ID", { dateStyle: "long" })],
    ["Tanggal diterbitkan", new Date(certificate.issuedAt).toLocaleDateString("id-ID", { dateStyle: "long" })],
  ];

  return (
    <main className="flex min-h-screen items-center justify-center bg-oxford-50 p-6 dark:bg-oxford-950">
      <section className={`w-full max-w-2xl rounded-3xl border bg-white p-8 shadow-xl dark:bg-[#161B2A] md:p-12 ${revoked ? "border-red-300" : "border-emerald-300"}`}>
        <div className="text-center">
          {revoked ? <XCircle className="mx-auto mb-5 text-red-600" size={64} /> : <ShieldCheck className="mx-auto mb-5 text-emerald-600" size={64} />}
          <p className={`text-sm font-bold uppercase tracking-[0.2em] ${revoked ? "text-red-600" : "text-emerald-600"}`}>{revoked ? "Sertifikat dicabut" : "Sertifikat valid"}</p>
          <h1 className="mt-3 text-3xl font-bold text-oxford-900 dark:text-white">Verifikasi Sertifikat {certificate.activityType}</h1>
        </div>

        <dl className="mt-10 divide-y divide-oxford-100 dark:divide-oxford-800">
          {details.map(([label, value]) => (
            <div key={label} className="grid grid-cols-1 gap-1 py-4 sm:grid-cols-3 sm:gap-4">
              <dt className="text-sm font-semibold text-oxford-500 dark:text-oxford-400">{label}</dt>
              <dd className="font-medium text-oxford-900 dark:text-white sm:col-span-2">{value}</dd>
            </div>
          ))}
        </dl>

        {revoked && <div className="mt-6 rounded-xl bg-red-50 p-4 text-red-800"><p className="font-bold">Dokumen ini tidak lagi berlaku.</p>{certificate.revocationReason && <p className="mt-1 text-sm">Alasan: {certificate.revocationReason}</p>}</div>}
        {!revoked && <p className="mt-7 flex items-center justify-center gap-2 text-sm text-emerald-700"><CheckCircle2 size={18} /> Data cocok dengan catatan penerbitan CorpuKU.</p>}
      </section>
    </main>
  );
}
