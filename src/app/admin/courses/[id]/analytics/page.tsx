import { getCourseAnalytics } from "@/app/actions/course-analytics";
import { notFound, redirect } from "next/navigation";
import { verifyCourseStaffAccess } from "@/lib/admin-guard";
import CourseAnalyticsClient from "./course-analytics-client";

export const dynamic = "force-dynamic";

export default async function CourseAnalyticsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const auth = await verifyCourseStaffAccess(id);
  if (!auth.authorized) {
    redirect("/dashboard");
  }

  const result = await getCourseAnalytics(id);

  if (!result.success || !result.data) {
    notFound();
  }

  return <CourseAnalyticsClient initialData={result.data} />;
}
