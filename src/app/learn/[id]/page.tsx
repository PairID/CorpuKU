import { getCourseById, getCourseContent, getEnrollment } from "@/app/actions/courses";
import { notFound, redirect } from "next/navigation";
import LearnClient from "./learn-client";
import { UserSession } from "@/app/dashboard/dashboard-client";
import { getAuthSession } from "@/app/actions/auth";

export default async function LearnPage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = await params;
    const { id: paramId } = resolvedParams;

    const auth = await getAuthSession();

    if (!auth) {
        redirect("/login");
    }

    const authUser = auth.user;

    // Determine if the ID is a course ID or enrollment ID
    let courseId = paramId;
    let enrollment = null;

    if (paramId.startsWith("enr_")) {
        // Find enrollment first to get courseId
        enrollment = await getEnrollment(paramId);
        if (enrollment) {
            courseId = enrollment.courseId;
        } else {
            console.log("Enrollment not found for ID:", paramId);
            notFound();
        }
    }

    const course = await getCourseById(courseId);
    if (!course) {
        console.log("Course not found for ID:", courseId);
        notFound();
    }

    const courseContent = await getCourseContent(courseId);
    
    // If we haven't found the enrollment yet (because paramId was a courseId), find it now
    if (!enrollment) {
        enrollment = await getEnrollment(courseId);
    }

    return (
        <LearnClient
            course={course}
            courseContent={courseContent}
            enrollment={enrollment}
            session={{ user: authUser } as UserSession}
        />
    );
}
