import { getUserEnrollments } from "@/app/actions/courses";
import DashboardClient, { UserSession } from "./dashboard-client";
import { getAuthSession } from "@/app/actions/auth";
import { redirect } from "next/navigation";

export default async function StudentDashboardPage() {
    const auth = await getAuthSession();
    if (!auth) redirect("/login");
    if (auth.user.role === "admin") redirect("/admin");
    if (auth.user.role === "instructor") redirect("/instructor");
    const enrollments = await getUserEnrollments();

    // Serialize dates for Client Component
    const serializedEnrollments = enrollments.map(e => ({
        id: String(e.id),
        title: String(e.title || "Kursus"),
        description: e.description ? String(e.description) : null,
        thumbnailUrl: e.thumbnailUrl ? String(e.thumbnailUrl) : null,
        enrolledAt: new Date(e.enrolledAt).toISOString(),
        progress: Number(e.progress || 0),
        status: e.status === "completed" ? "completed" as const : "in_progress" as const,
        provider: "CorpuKU Academy",
    }));

    // Pass a placeholder session — the client component will read actual user from localStorage
    return (
        <DashboardClient
            enrollments={serializedEnrollments}
            session={{ user: auth.user } as UserSession}
        />
    );
}
