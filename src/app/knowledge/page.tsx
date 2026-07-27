import { getAllKnowledgeItems } from "@/app/actions/knowledge";
import { getAuthSession } from "@/app/actions/auth";
import KnowledgeClient, { KnowledgeItem } from "./knowledge-client";

export default async function KMSDashboardPage({
    searchParams,
}: {
    searchParams: Promise<{ q?: string; category?: string }>;
}) {
    const resolvedSearchParams = await searchParams;
    const query = resolvedSearchParams.q || "";
    const category = resolvedSearchParams.category || "Semua";

    const items = await getAllKnowledgeItems(query, category);
    const auth = await getAuthSession();
    const serverUser = auth?.user || null;

    // Serialize dates for Client Component
    const serializedItems: KnowledgeItem[] = items.map(item => ({
        id: String(item.id),
        title: String(item.title || "Tanpa judul"),
        description: item.description ? String(item.description) : null,
        category: String(item.category || "Umum"),
        tags: Array.isArray(item.tags) ? item.tags.map(String) : [],
        thumbnailUrl: item.thumbnailUrl ? String(item.thumbnailUrl) : null,
        videoUrl: item.videoUrl ? String(item.videoUrl) : null,
        authorId: String(item.authorId),
        authorName: item.authorName ? String(item.authorName) : undefined,
        authorInstansi: item.authorInstansi ? String(item.authorInstansi) : undefined,
        views: Number(item.views || 0),
        likes: Number(item.likes || 0),
        likedBy: Array.isArray(item.likedBy) ? item.likedBy.map(String) : [],
        privacy: item.privacy === "internal" ? "internal" : "public",
        status: item.status === "draft" || item.status === "archived" ? item.status : "published",
        createdAt: new Date(item.createdAt).toISOString(),
        updatedAt: new Date(item.updatedAt).toISOString(),
        comments: Array.isArray(item.comments) ? item.comments : [],
    }));

    return <KnowledgeClient 
        items={serializedItems}
        initialQuery={query}
        initialCategory={category}
        serverUser={serverUser}
    />;
}

