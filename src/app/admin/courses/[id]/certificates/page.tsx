import Link from "next/link";
import { ArrowLeft, ExternalLink, ShieldCheck } from "lucide-react";
import { DownloadCertificateButton } from "@/components/DownloadCertificateButton";
import { IssueCertificateButton } from "@/components/IssueCertificateButton";
import { getCourseById } from "@/app/actions/courses";
import { getCourseCertificateDashboard } from "@/app/actions/course-certificates";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function CourseCertificatesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [course, participants] = await Promise.all([
    getCourseById(id),
    getCourseCertificateDashboard(id),
  ]);

  if (!course) notFound();

  const isClassical = course.trainingType === "classical_facilitation";

  const checkEligibility = (row: any) => {
    if (isClassical) {
      const attendanceOk = Number(row.attendancePercentage || 0) >= Number(course.attendanceThreshold || 80);
      const evalOk = Boolean(row.allEvaluationsCompleted);
      const statementOk = Boolean(row.statementAccepted);
      const statusCompleted = String(row.status) === "completed";
      return statusCompleted || (attendanceOk && evalOk && statementOk);
    }
    return String(row.status) === "completed" && Number(row.progress) === 100;
  };

  const completed = participants.filter((row: any) => checkEligibility(row));
  const issued = participants.filter((row: any) => row.certificateId);

  return (
    <main className="min-h-screen bg-oxford-50 p-4 sm:p-6 md:p-10 dark:bg-oxford-950 font-sans">
      <div className="mx-auto max-w-7xl">
        {/* Navigation Breadcrumb */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <Link
            href="/admin/courses"
            className="inline-flex items-center gap-2 text-sm font-bold text-oxford-600 hover:text-gold-600 dark:text-oxford-300 dark:hover:text-gold-400 transition-colors"
          >
            <ArrowLeft size={16} /> Daftar kursus
          </Link>
          <Link
            href={`/admin/courses/${id}/edit`}
            className="text-sm font-bold text-gold-600 hover:text-gold-500 transition-colors"
          >
            Pengaturan kursus
          </Link>
        </div>

        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-bold uppercase tracking-widest text-gold-600 dark:text-gold-400">
              Penerbitan Sertifikat
            </span>
            {isClassical && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
                Pelatihan Klasikal
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-oxford-950 dark:text-white">
            {String(course.title)}
          </h1>
          <p className="mt-2 text-sm sm:text-base text-oxford-600 dark:text-oxford-300">
            {course.certificateEnabled
              ? course.certificateAutoIssue
                ? "Sertifikat otomatis aktif saat peserta lulus."
                : "Penerbitan sertifikat dilakukan secara manual oleh Admin."
              : "Penerbitan sertifikat dinonaktifkan."}{" "}
            Format Nomor: <span className="font-mono font-semibold">{String(course.certificateNumberPrefix)}/TAHUN/000001</span> · Nilai kelulusan: {Number(course.passingScore || 80)}.
          </p>
        </div>

        {/* Metrics Grid */}
        <div className="mb-7 grid gap-4 grid-cols-1 sm:grid-cols-3">
          {[
            { label: "Peserta Terdaftar", value: participants.length },
            { label: "Peserta Lulus", value: completed.length },
            { label: "Sertifikat Terbit", value: issued.length },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl border border-oxford-200 bg-white p-5 dark:border-oxford-800 dark:bg-[#161B2A] shadow-sm"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center mb-3">
                <ShieldCheck className="text-emerald-600 dark:text-emerald-400" size={20} />
              </div>
              <p className="text-sm text-oxford-500 dark:text-oxford-400 font-medium">{stat.label}</p>
              <p className="text-3xl font-bold text-oxford-900 dark:text-white mt-1">{stat.value}</p>
            </div>
          ))}
        </div>

        {!course.certificateEnabled && (
          <div className="mb-6 rounded-xl border border-amber-200 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-950/30 p-4 text-amber-900 dark:text-amber-200 text-sm">
            <p className="font-semibold">Sertifikat Belum Diaktifkan</p>
            <p className="mt-1">
              Aktifkan opsi sertifikat pada menu Pengaturan Kursus agar dapat menerbitkan sertifikat kepada peserta yang telah memenuhi kriteria.
            </p>
          </div>
        )}

        {/* Table / Card Container */}
        <div className="overflow-hidden rounded-2xl border border-oxford-200 bg-white dark:border-oxford-800 dark:bg-[#161B2A] shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[750px] text-left text-sm">
              <thead className="bg-oxford-50 text-oxford-600 dark:bg-oxford-900/60 dark:text-oxford-300 font-semibold border-b border-oxford-200 dark:border-oxford-800">
                <tr>
                  <th className="p-4 pl-6">Peserta</th>
                  <th className="p-4">{isClassical ? "Kehadiran / Modul" : "Progress Materi"}</th>
                  <th className="p-4">Kelulusan</th>
                  <th className="p-4">Sertifikat</th>
                  <th className="p-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-oxford-100 dark:divide-oxford-800">
                {participants.map((row: any) => {
                  const eligible = checkEligibility(row);
                  let disabledReason = "";
                  if (!course.certificateEnabled) {
                    disabledReason = "Sertifikat kursus belum diaktifkan";
                  } else if (isClassical) {
                    const att = Number(row.attendancePercentage || 0);
                    const threshold = Number(course.attendanceThreshold || 80);
                    if (att < threshold) {
                      disabledReason = `Kehadiran (${att}%) belum memenuhi syarat minimal (${threshold}%)`;
                    } else if (!row.allEvaluationsCompleted) {
                      disabledReason = "Evaluasi kursus belum selesai";
                    } else if (!row.statementAccepted) {
                      disabledReason = "Pernyataan data profil belum disetujui";
                    }
                  } else if (Number(row.progress) < 100) {
                    disabledReason = `Progress materi (${row.progress}%) belum selesai 100%`;
                  }

                  return (
                    <tr
                      key={String(row.enrollmentId)}
                      className="hover:bg-oxford-50/50 dark:hover:bg-oxford-900/30 transition-colors"
                    >
                      <td className="p-4 pl-6">
                        <p className="font-bold text-oxford-900 dark:text-white">
                          {String(row.participantName)}
                        </p>
                        <p className="text-xs text-oxford-500 dark:text-oxford-400">
                          NIP: {String(row.participantNip || "-")}
                        </p>
                      </td>
                      <td className="p-4">
                        {isClassical ? (
                          <div>
                            <span className="font-semibold text-oxford-900 dark:text-white">
                              {Number(row.attendancePercentage || 0)}%
                            </span>{" "}
                            <span className="text-xs text-oxford-500 dark:text-oxford-400">
                              (Modul: {Number(row.progress)}%)
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-oxford-900 dark:text-white">
                              {Number(row.progress)}%
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="p-4">
                        {eligible ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                            Lulus
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-oxford-100 text-oxford-600 dark:bg-oxford-800 dark:text-oxford-400">
                            Belum Lulus
                          </span>
                        )}
                      </td>
                      <td className="p-4">
                        {row.certificateId ? (
                          <div>
                            <p
                              className={`font-mono font-bold text-xs ${
                                row.revokedAt
                                  ? "text-crimson-600 dark:text-crimson-400"
                                  : "text-emerald-600 dark:text-emerald-400"
                              }`}
                            >
                              {String(row.certificateNumber)}
                            </p>
                            <p className="text-[11px] text-oxford-500 dark:text-oxford-400">
                              {row.revokedAt ? "Status: Dicabut" : "Status: Resmi Terbit"}
                            </p>
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
                              className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-500 dark:text-blue-400 p-1.5 rounded hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors"
                              title="Verifikasi QR Publik"
                            >
                              <ExternalLink size={13} /> Verifikasi
                            </Link>
                          </div>
                        ) : (
                          <IssueCertificateButton
                            courseId={id}
                            userId={String(row.userId)}
                            participantName={String(row.participantName)}
                            isEligible={Boolean(eligible && course.certificateEnabled)}
                            disabledReason={disabledReason}
                          />
                        )}
                      </td>
                    </tr>
                  );
                })}
                {participants.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-10 text-center text-oxford-500 dark:text-oxford-400 italic">
                      Belum ada peserta yang terdaftar pada kursus ini.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}
