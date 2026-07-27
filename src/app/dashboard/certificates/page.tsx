import { getUserEnrollments, getCourseById } from "@/app/actions/courses";
import CertificatesClient from "./certificates-client";
import { getAuthSession } from "@/app/actions/auth";
import { redirect } from "next/navigation";
import { issueCourseCertificate } from "@/lib/course-certificates";
import { getUserWebinarCertificates } from "@/lib/webinar-certificates";

export default async function CertificatesPage() {
    const auth = await getAuthSession();
    if (!auth) {
        redirect("/login");
    }
    const user = auth.user;

    const allEnrollments = await getUserEnrollments();
    
    // Get only completed enrollments
    const completedEnrollments = allEnrollments.filter(e => e.status === 'completed');

    const courseCertificates = await Promise.all(
        completedEnrollments.map(async (enr) => {
            const course = await getCourseById(enr.courseId);
            const issued = await issueCourseCertificate(user.id, enr.courseId);
            if (!issued) return null;
            return {
                id: enr.id,
                title: String(course?.title || enr.title || "Kursus"),
                provider: String(course?.category || "CorpuKU Academy"),
                thumbnailUrl: course?.thumbnailUrl || null,
                completedAt: issued.issuedAt,
                certificateNumber: issued.certificateNumber,
                href: `/dashboard/certificates/${enr.id}`,
                status: issued.revokedAt ? 'revoked' : 'valid',
            };
        })
    );
    const webinarCertificates = (await getUserWebinarCertificates(user.id)).map((certificate) => ({
        id: certificate.id,
        title: certificate.webinarTitle,
        provider: 'Webinar',
        thumbnailUrl: null,
        completedAt: certificate.issuedAt,
        certificateNumber: certificate.certificateNumber,
        href: `/dashboard/webinars/${certificate.webinarId}`,
        status: certificate.revokedAt ? 'revoked' : 'valid',
    }));
    const certificates = [
        ...courseCertificates.filter((certificate): certificate is NonNullable<typeof certificate> => certificate !== null),
        ...webinarCertificates,
    ];

    // Serialize dates
    const serializedCertificates = certificates.map(c => ({
        ...c,
        completedAt: new Date(c.completedAt).toISOString()
    }));

    return <CertificatesClient certificates={serializedCertificates} />;
}
