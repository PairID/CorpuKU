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
    
    // Validate if enrollment exists and is completed
    if (!enrollment || enrollment.status !== 'completed') {
        notFound();
    }

    const course = await getCourseById(enrollment.courseId);
    if (!course) {
        notFound();
    }

    const issuedCertificate = await issueCourseCertificate(user.id, String(enrollment.courseId));
    if (!issuedCertificate) notFound();

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
