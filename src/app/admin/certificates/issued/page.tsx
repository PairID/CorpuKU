import Link from "next/link";
import { ArrowLeft, ExternalLink, ShieldCheck } from "lucide-react";
import { getIssuedWebinarCertificates, revokeWebinarCertificate } from "@/app/actions/webinar-certificates";
import { getIssuedCourseCertificates, revokeCourseCertificate } from "@/app/actions/course-certificates";

export const dynamic = "force-dynamic";

type CertificateRow = {
  id: string;
  certificateNumber: string;
  verificationToken: string;
  participantName: string;
  participantNip: string | null;
  activityTitle: string;
  issuedAt: string;
  revokedAt: string | null;
  downloadCount: number;
  type: "Kursus" | "Webinar";
};

export default async function IssuedCertificatesPage() {
  const [courseRows, webinarRows] = await Promise.all([
    getIssuedCourseCertificates(),
    getIssuedWebinarCertificates(),
  ]);
  const certificates: CertificateRow[] = [
    ...courseRows.map(row => ({
      id: String(row.id), certificateNumber: String(row.certificateNumber),
      verificationToken: String(row.verificationToken), participantName: String(row.participantName),
      participantNip: row.participantNip ? String(row.participantNip) : null,
      activityTitle: String(row.courseTitle), issuedAt: new Date(String(row.issuedAt)).toISOString(),
      revokedAt: row.revokedAt ? new Date(String(row.revokedAt)).toISOString() : null,
      downloadCount: Number(row.downloadCount || 0), type: "Kursus" as const,
    })),
    ...webinarRows.map(row => ({
      id: String(row.id), certificateNumber: String(row.certificateNumber),
      verificationToken: String(row.verificationToken), participantName: String(row.participantName),
      participantNip: row.participantNip ? String(row.participantNip) : null,
      activityTitle: String(row.webinarTitle), issuedAt: new Date(String(row.issuedAt)).toISOString(),
      revokedAt: row.revokedAt ? new Date(String(row.revokedAt)).toISOString() : null,
      downloadCount: Number(row.downloadCount || 0), type: "Webinar" as const,
    })),
  ].sort((a, b) => Date.parse(b.issuedAt) - Date.parse(a.issuedAt));

  return (
    <main className="min-h-screen bg-oxford-50 p-6 dark:bg-oxford-950 md:p-10">
      <div className="mx-auto max-w-7xl">
        <Link href="/admin/certificates" className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-oxford-600 dark:text-oxford-300"><ArrowLeft size={16} /> Pengaturan sertifikat</Link>
        <div className="mb-8">
          <h1 className="flex items-center gap-3 text-3xl font-bold text-oxford-900 dark:text-white"><ShieldCheck className="text-emerald-600" /> Sertifikat Terbit</h1>
          <p className="mt-2 text-oxford-600 dark:text-oxford-300">Satu registri untuk kursus dan webinar: audit nomor, verifikasi publik, unduhan, dan pencabutan.</p>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-oxford-200 bg-white dark:border-oxford-800 dark:bg-[#161B2A]">
          <table className="w-full min-w-[1080px] text-left text-sm">
            <thead className="bg-oxford-50 text-oxford-600 dark:bg-oxford-900 dark:text-oxford-300"><tr><th className="p-4">Nomor</th><th className="p-4">Jenis</th><th className="p-4">Peserta</th><th className="p-4">Kegiatan</th><th className="p-4">Terbit</th><th className="p-4">Unduh</th><th className="p-4">Status & aksi</th></tr></thead>
            <tbody>
              {certificates.map(certificate => {
                const revokeAction = certificate.type === "Kursus" ? revokeCourseCertificate : revokeWebinarCertificate;
                return (
                  <tr key={`${certificate.type}-${certificate.id}`} className="border-t border-oxford-100 align-top dark:border-oxford-800">
                    <td className="p-4 font-mono">{certificate.certificateNumber}</td>
                    <td className="p-4"><span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">{certificate.type}</span></td>
                    <td className="p-4"><p className="font-semibold text-oxford-900 dark:text-white">{certificate.participantName}</p><p className="text-xs text-oxford-500">{certificate.participantNip || "-"}</p></td>
                    <td className="max-w-xs p-4">{certificate.activityTitle}</td>
                    <td className="p-4">{new Date(certificate.issuedAt).toLocaleDateString("id-ID")}</td>
                    <td className="p-4">{certificate.downloadCount}×</td>
                    <td className="p-4">
                      <p>{certificate.revokedAt ? <span className="font-bold text-red-600">Dicabut</span> : <span className="font-bold text-emerald-600">Aktif</span>}</p>
                      <Link href={`/verify/certificates/${certificate.verificationToken}`} target="_blank" className="mt-2 inline-flex items-center gap-1 font-semibold text-blue-600"><ExternalLink size={14} /> Verifikasi</Link>
                      {!certificate.revokedAt && (
                        <form action={revokeAction} className="mt-3 flex gap-2">
                          <input type="hidden" name="id" value={certificate.id} />
                          <input required minLength={5} maxLength={500} name="reason" aria-label={`Alasan pencabutan sertifikat ${certificate.certificateNumber}`} placeholder="Alasan pencabutan" className="w-44 rounded-lg border border-oxford-200 px-3 py-2 text-xs dark:bg-oxford-950" />
                          <button className="rounded-lg bg-red-600 px-3 py-2 text-xs font-bold text-white">Cabut</button>
                        </form>
                      )}
                    </td>
                  </tr>
                );
              })}
              {certificates.length === 0 && <tr><td colSpan={7} className="p-10 text-center text-oxford-500">Belum ada sertifikat yang diterbitkan.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
