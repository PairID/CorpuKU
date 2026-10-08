import { getAllCourses } from "./actions/courses";
import { getFeaturedWebinar } from "./actions/webinars";
import HomeClient from "./home-client";

export default async function HomePage() {
  const [courses, featuredWebinar] = await Promise.all([
    getAllCourses(),
    getFeaturedWebinar(),
  ]);
  
  // Pass strictly serialized data to the client safely
  const serializedCourses = courses.map(c => {
    const safeDate = (d: unknown) => {
      if (!d) return null;
      if (d instanceof Date) return d.toISOString();
      if (typeof d === 'string') return d;
      return null;
    };

    return {
      id: c.id,
      title: c.title,
      description: c.description,
      category: c.category,
      thumbnailUrl: c.thumbnailUrl,
      startDate: safeDate(c.startDate),
      endDate: safeDate(c.endDate),
      createdAt: safeDate(c.createdAt)
    };
  });
  
  return <HomeClient courses={serializedCourses} featuredWebinar={featuredWebinar} />;
}
