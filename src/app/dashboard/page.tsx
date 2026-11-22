import { getUserEnrollments } from "@/app/actions/courses";
import { getStaffManagedCourses } from "@/app/actions/course-staff";
import DashboardClient, { UserSession } from "./dashboard-client";
import { getAuthSession } from "@/app/actions/auth";
import { redirect } from "next/navigation";

export default async function StudentDashboardPage() {
    const auth = await getAuthSession();
    if (!auth) redirect("/login");
    if (auth.user.role === "admin") redirect("/admin");
    if (auth.user.role === "instructor") redirect("/instructor");
    const [enrollments, managedCourses] = await Promise.all([
        getUserEnrollments(),
        getStaffManagedCourses(auth.user.id),
    ]);

    // Serialize dates and journey attributes for Client Component
    const serializedEnrollments = enrollments.map(e => ({
        id: String(e.id),
        courseId: String(e.courseId || e.id),
        title: String(e.title || "Kursus"),
        description: e.description ? String(e.description) : null,
        thumbnailUrl: e.thumbnailUrl ? String(e.thumbnailUrl) : null,
        enrolledAt: new Date(e.enrolledAt).toISOString(),
        progress: Number(e.progress || 0),
        status: e.status === "completed" ? "completed" as const : "in_progress" as const,
        provider: "CorpuKU Academy",
        trainingType: e.trainingType || "elearning",
        deliveryMode: e.deliveryMode || "daring",
        statementAccepted: Boolean(e.statementAccepted),
        attendedJp: Number(e.attendedJp || 0),
        attendancePercentage: Number(e.attendancePercentage || 0),
        attendanceThreshold: Number(e.attendanceThreshold || 80),
        allEvaluationsCompleted: Boolean(e.allEvaluationsCompleted),
        evalNarasumberCompleted: Boolean(e.evalNarasumberCompleted),
        evalOrganizerCompleted: Boolean(e.evalOrganizerCompleted),
        evalUnderstandingCompleted: Boolean(e.evalUnderstandingCompleted),
        evalSkmCompleted: Boolean(e.evalSkmCompleted),
        certificateEnabled: e.certificateEnabled !== false,
    }));

    // Pass a placeholder session — the client component will read actual user from localStorage
    return (
        <DashboardClient
            enrollments={serializedEnrollments}
            managedCourses={managedCourses}
            session={{ user: auth.user } as UserSession}
        />
    );
}
