import { getCourseAttendanceLive } from "@/app/actions/attendance";
import { notFound, redirect } from "next/navigation";
import { verifyCourseStaffAccess } from "@/lib/admin-guard";
import AttendanceLiveClient from "./attendance-live-client";

export const dynamic = "force-dynamic";

export default async function CourseAttendanceLivePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const auth = await verifyCourseStaffAccess(id);
  if (!auth.authorized) {
    redirect("/dashboard");
  }

  const initialData = await getCourseAttendanceLive(id);

  if (!initialData.success || !initialData.course) {
    notFound();
  }

  return (
    <AttendanceLiveClient
      courseId={id}
      initialData={{
        fetchedAt: initialData.fetchedAt!,
        course: initialData.course,
        sessions: initialData.sessions || [],
        participants: initialData.participants || [],
      }}
    />
  );
}
