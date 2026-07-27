import { getAllCourses } from "../actions/courses";
import SearchClient from "./search-client";

export default async function SearchPage() {
    const courses = await getAllCourses();

    // Pass strictly serialized data to the client
    const serializedCourses = courses.map(c => ({
        id: c.id,
        title: c.title,
        description: c.description,
        category: String(c.category || "Lainnya"),
        level: String(c.level || "Pemula"),
        thumbnailUrl: c.thumbnailUrl,
        createdAt: c.createdAt ? new Date(c.createdAt).toISOString() : null,
        updatedAt: c.updatedAt ? new Date(c.updatedAt).toISOString() : null
    }));

    return <SearchClient courses={serializedCourses} />;
}
