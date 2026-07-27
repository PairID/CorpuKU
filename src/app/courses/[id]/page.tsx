import { getCourseById, getCourseOutline } from "@/app/actions/courses";
import CourseClient, { CourseModule, CourseProp } from "./course-client";
import { notFound } from "next/navigation";

export default async function CourseDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const courseData = await getCourseById(id);

    if (!courseData) {
        notFound();
    }

    const courseContent = await getCourseOutline(id);

    // Pass strictly serialized data
    const serializedCourse: CourseProp = {
        id: String(courseData.id),
        title: String(courseData.title),
        description: courseData.description ? String(courseData.description) : null,
        thumbnailUrl: courseData.thumbnailUrl ? String(courseData.thumbnailUrl) : null,
        category: courseData.category ? String(courseData.category) : null,
        level: courseData.level ? String(courseData.level) : null,
        status: String(courseData.status),
        jp: Number(courseData.jp || 0),
        pacingType: courseData.pacingType === "instructor_paced" ? "instructor_paced" : "self_paced",
        startDate: courseData.startDate ? new Date(courseData.startDate).toISOString() : null,
        endDate: courseData.endDate ? new Date(courseData.endDate).toISOString() : null,
        certificateEnabled: courseData.certificateEnabled !== false,
        certificateType: courseData.certificateType ? String(courseData.certificateType) : null,
        createdAt: courseData.createdAt ? new Date(courseData.createdAt).toISOString() : null,
        updatedAt: courseData.updatedAt ? new Date(courseData.updatedAt).toISOString() : null,
        instructorName: courseData.instructorName ? String(courseData.instructorName) : null,
    };
    const serializedContent: CourseModule[] = courseContent.map((module) => ({
        id: String(module.id),
        title: String(module.title),
        order: String(module.order ?? 0),
        lessons: Array.isArray(module.lessons) ? module.lessons.map((lesson) => ({
            id: String(lesson.id),
            title: String(lesson.title),
            type: String(lesson.type),
        })) : [],
    }));

    return <CourseClient course={serializedCourse} courseContent={serializedContent} />;
}
