import { getCourseAnalytics } from "@/app/actions/course-analytics";
import { notFound, redirect } from "next/navigation";
import { getAuthSession } from "@/app/actions/auth";
import CourseAnalyticsClient from "./course-analytics-client";

export const dynamic = "force-dynamic";

export default async function CourseAnalyticsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getAuthSession();
  if (!session) redirect("/login");
  if (session.user.role !== "admin" && session.user.role !== "instructor") {
    redirect("/dashboard");
  }

  const { id } = await params;
  const result = await getCourseAnalytics(id);

  if (!result.success || !result.data) {
    notFound();
  }

  return <CourseAnalyticsClient initialData={result.data} />;
}
