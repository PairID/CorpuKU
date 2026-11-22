import Link from "next/link";
import { ArrowLeft, ExternalLink, ShieldCheck } from "lucide-react";
import { DownloadCertificateButton } from "@/components/DownloadCertificateButton";
import { getCourseById } from "@/app/actions/courses";
import { getCourseCertificateDashboard } from "@/app/actions/course-certificates";
import { IssueCourseCertificateButton } from "@/components/certificates/IssueCourseCertificateButton";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function CourseCertificatesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [course, participants] = await Promise.all([getCourseById(id), getCourseCertificateDashboard(id)]);
  if (!course) notFound();
  const completed = participants.filter(row => String(row.status) === "completed" && Number(row.progress) === 100);
  const issued = participants.filter(row => row.certificateId);

  return (
    <main className="min-h-screen bg-oxford-50 p-4 sm:p-6 dark:bg-oxford-950 md:p-10">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <Link href="/admin/courses" className="inline-flex items-center gap-2 text-sm font-bold text-oxford-600 dark:text-oxford-300 hover:text-gold-600 transition-colors">
            <ArrowLeft size={16} /> Daftar kursus
          </Link>
          <Link href={`/admin/courses/${id}/edit`} className="text-sm font-bold text-blue-700 dark:text-blue-300 hover:underline">
            Pengaturan kursus
          </Link>
        </div>

        <div className="mb-8">
          <p className="text-xs sm:text-sm font-bold uppercase tracking-widest text-gold-600">Penerbitan Sertifikat Kursus</p>
          <h1 className="mt-2 text-2xl sm:text-3xl font-bold text-oxford-950 dark:text-white">{String(course.title)}</h1>
          <p className="mt-2 text-sm text-oxford-600 dark:text-oxford-300">
            {course.certificateEnabled ? course.certificateAutoIssue ? "Sertifikat otomatis aktif." : "Penerbitan manual aktif." : "Sertifikat dinonaktifkan."} Format: {String(course.certificateNumberPrefix)}/TAHUN/000001 · Nilai lulus {Number(course.passingScore)}.
          </p>
        </div>

        <div className="mb-7 grid gap-4 grid-cols-1 sm:grid-cols-3">
          {[["Peserta Terdaftar", participants.length], ["Lulus Pembelajaran", completed.length], ["Sertifikat Terbit", issued.length]].map(([label, value]) => (
            <div key={String(label)} className="rounded-2xl border border-oxford-200 bg-white p-5 dark:border-oxford-800 dark:bg-[#161B2A] shadow-xs">
              <ShieldCheck className="text-emerald-600" />
              <p className="mt-3 text-sm text-oxford-500 dark:text-oxford-400">{label}</p>
              <p className="text-2xl sm:text-3xl font-bold text-oxford-900 dark:text-white">{value}</p>
            </div>
          ))}
        </div>

        {!course.certificateEnabled && (
          <p className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-300">
            Aktifkan sertifikat melalui pengaturan kursus untuk menerbitkan dokumen resmi.
          </p>
        )}

        <div className="overflow-x-auto rounded-2xl border border-oxford-200 bg-white dark:border-oxford-800 dark:bg-[#161B2A] shadow-sm">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead className="bg-oxford-50 text-oxford-600 dark:bg-oxford-900 dark:text-oxford-300 font-semibold border-b border-oxford-200 dark:border-oxford-800">
              <tr>
                <th className="p-4">Peserta</th>
                <th className="p-4">Progress</th>
                <th className="p-4">Kelulusan</th>
                <th className="p-4">Sertifikat</th>
                <th className="p-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-oxford-100 dark:divide-oxford-800">
              {participants.map(row => {
                const eligible = String(row.status) === "completed" && Number(row.progress) === 100;
                return (
                  <tr key={String(row.enrollmentId)} className="hover:bg-oxford-50/60 dark:hover:bg-oxford-950/50 transition-colors">
                    <td className="p-4">
                      <p className="font-bold text-oxford-900 dark:text-white">{String(row.participantName)}</p>
                      <p className="text-xs text-oxford-500 dark:text-oxford-400">{String(row.participantNip || "-")}</p>
                    </td>
                    <td className="p-4 font-medium">{Number(row.progress)}%</td>
                    <td className="p-4">
                      {eligible ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                          Lulus
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-oxford-100 dark:bg-oxford-800 text-oxford-600 dark:text-oxford-400">
                          Belum lulus
                        </span>
                      )}
                    </td>
                    <td className="p-4">
                      {row.certificateId ? (
                        <div>
                          <p className={`font-mono font-bold text-xs ${row.revokedAt ? "text-red-600" : "text-emerald-600 dark:text-emerald-400"}`}>
                            {String(row.certificateNumber)}
                          </p>
                          <p className="text-[11px] text-oxford-500">{row.revokedAt ? "Dicabut" : "Aktif"}</p>
                        </div>
                      ) : (
                        <span className="text-xs text-oxford-400 italic">Belum terbit</span>
                      )}
                    </td>
                    <td className="p-4 text-center">
                      {row.certificateId ? (
                        <div className="flex flex-wrap items-center justify-center gap-2">
                          {!row.revokedAt && (
                            <DownloadCertificateButton
                              verificationToken={String(row.verificationToken)}
                              type="course_certificate"
                              participantName={String(row.participantName)}
                              certificateNumber={String(row.certificateNumber)}
                              variant="button"
                            />
                          )}
                          <Link
                            target="_blank"
                            href={`/verify/certificates/${String(row.verificationToken)}`}
                            className="inline-flex items-center gap-1 text-xs font-bold text-blue-700 dark:text-blue-400 hover:underline"
                          >
                            <ExternalLink size={13} /> Verifikasi
                          </Link>
                        </div>
                      ) : eligible && course.certificateEnabled ? (
                        <IssueCourseCertificateButton
                          courseId={id}
                          userId={String(row.userId)}
                          participantName={String(row.participantName)}
                        />
                      ) : (
                        <span className="text-oxford-400 text-xs">-</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {participants.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-10 text-center text-oxford-500 italic">
                    Belum ada peserta yang terdaftar pada kursus ini.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
