import { getEnrollment, getCourseById, getUserEnrollments } from "@/app/actions/courses";
import { notFound, redirect } from "next/navigation";
import CertificateClient from "./certificate-client";
import { CertificateData } from "@/components/CertificateView";
import { getAuthSession } from "@/app/actions/auth";
import { issueCourseCertificate } from "@/lib/course-certificates";
import type { CertificateTypeConfig } from "@/components/CertificateView";

export const dynamic = "force-dynamic";

export default async function CertificatePage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = await params;
    const { id: courseId } = resolvedParams;

    const auth = await getAuthSession();
    if (!auth) {
        redirect("/login");
    }
    const user = auth.user;

    // Try to find the enrollment by courseId first, then by enrollmentId
    let enrollment = await getEnrollment(courseId);
    if (!enrollment) {
        const allUserEnrollments = await getUserEnrollments();
        enrollment = allUserEnrollments.find(e => e.id === courseId) || null;
    }
    
    // Validate if enrollment exists
    if (!enrollment) {
        notFound();
    }

    const course = await getCourseById(enrollment.courseId);
    if (!course) {
        notFound();
    }

    const isClassical = course.trainingType === 'classical_facilitation' || (enrollment as { trainingType?: string }).trainingType === 'classical_facilitation';
    if (enrollment.status !== 'completed' && !isClassical) {
        notFound();
    }

    const issuedCertificate = await issueCourseCertificate(user.id, String(enrollment.courseId));
    if (!issuedCertificate) {
        const attendancePct = Number((enrollment as { attendancePercentage?: number }).attendancePercentage || 0);
        const threshold = Number(course.attendanceThreshold ?? 80);
        const evalDone = Boolean((enrollment as { allEvaluationsCompleted?: boolean }).allEvaluationsCompleted);
        const statementDone = Boolean((enrollment as { statementAccepted?: boolean }).statementAccepted);
        return (
            <div className="min-h-screen bg-oxford-50 dark:bg-oxford-950 flex items-center justify-center p-6">
                <div className="max-w-lg w-full bg-white dark:bg-[#161B2A] rounded-2xl border border-oxford-200 dark:border-oxford-800 p-8 shadow-sm text-center space-y-4">
                    <h1 className="text-xl font-serif font-bold text-oxford-950 dark:text-white">
                        Sertifikat Belum Tersedia
                    </h1>
                    <p className="text-sm text-oxford-600 dark:text-oxford-300">
                        Sertifikat untuk kelas <strong>{course.title}</strong> akan diterbitkan otomatis setelah seluruh syarat kelulusan terpenuhi:
                    </p>
                    {isClassical ? (
                        <div className="text-left space-y-2 bg-oxford-50 dark:bg-oxford-900/60 p-4 rounded-xl border border-oxford-200 dark:border-oxford-800 text-xs">
                            <div className="flex justify-between">
                                <span>1. Konfirmasi Data Diri</span>
                                <span className={statementDone ? "font-bold text-emerald-600" : "font-bold text-amber-600"}>
                                    {statementDone ? "Selesai" : "Belum"}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span>2. Kehadiran JP (Min. {threshold}%)</span>
                                <span className={attendancePct >= threshold ? "font-bold text-emerald-600" : "font-bold text-amber-600"}>
                                    {attendancePct}%
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span>3. Evaluasi 4 Tahap &amp; SKM</span>
                                <span className={evalDone ? "font-bold text-emerald-600" : "font-bold text-amber-600"}>
                                    {evalDone ? "Tuntas" : "Belum Tuntas"}
                                </span>
                            </div>
                        </div>
                    ) : (
                        <p className="text-xs text-oxford-500">
                            Pastikan Anda telah menyelesaikan seluruh materi dan evaluasi kelas ini, atau penerbitan sertifikat sedang dinonaktifkan oleh Admin.
                        </p>
                    )}
                    <div className="pt-2">
                        <a
                            href={`/learn/${enrollment.courseId}`}
                            className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-gold-500 hover:bg-gold-400 text-oxford-950 font-bold text-xs shadow-sm transition-colors"
                        >
                            Kembali ke Kelas
                        </a>
                    </div>
                </div>
            </div>
        );
    }

    // Format issue date (tanggal terbit sertifikat)
    const issueDate = new Date(issuedCertificate.issuedAt).toLocaleDateString('id-ID', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    // Format activity date (tanggal pelaksanaan kegiatan)
    let activityDate = "";
    if (course.startDate && course.endDate) {
        const start = new Date(course.startDate);
        const end = new Date(course.endDate);
        const startStr = start.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
        const endStr = end.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
        activityDate = start.getMonth() === end.getMonth() 
            ? `${start.getDate()} - ${endStr}`
            : `${startStr} s.d. ${endStr}`;
    }

    const certType = (["sertifikat", "surat_keterangan", "sttp"] as const).includes(issuedCertificate.templateType as "sertifikat" | "surat_keterangan" | "sttp")
        ? issuedCertificate.templateType as "sertifikat" | "surat_keterangan" | "sttp"
        : "sertifikat";
    const activeConfig = issuedCertificate.templateSettings as CertificateTypeConfig;

    const certificateData: CertificateData = {
        certificateNumber: issuedCertificate.certificateNumber,
        date: issueDate,
        issueDate: issueDate,
        activityDate: activityDate,
        studentName: issuedCertificate.participantName,
        nip: issuedCertificate.participantNip || undefined,
        grade: issuedCertificate.participantRank || "-",
        position: issuedCertificate.participantPosition || "-",
        institution: issuedCertificate.participantInstitution || "-",
        courseName: issuedCertificate.courseTitle,
        hours: issuedCertificate.certificateJp,
        certificateType: certType,
        templateUrl: activeConfig?.templateUrl || null,
        photoUrl: user.image || undefined
    };

    return <CertificateClient data={certificateData} initialConfig={activeConfig} courseId={issuedCertificate.courseId} verificationToken={issuedCertificate.verificationToken} />;
}
