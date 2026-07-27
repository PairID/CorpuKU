import { getKnowledgeItemById, incrementKnowledgeView } from "@/app/actions/knowledge";
import { getAuthSession } from "@/app/actions/auth";
import { notFound } from "next/navigation";
import KnowledgeDetailClient, { KnowledgeDetailItem } from "./knowledge-detail-client";

function errorMessage(error: unknown) {
    return error instanceof Error ? error.message : "Anda tidak memiliki akses ke dokumen ini.";
}

export default async function KnowledgeDetailPage(props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    
    // We increment view count server-side efficiently
    await incrementKnowledgeView(params.id);
    const auth = await getAuthSession();
    const serverUser = auth?.user || null;

    let item: KnowledgeDetailItem | null = null;
    let accessError: unknown = null;
    try {
        item = await getKnowledgeItemById(params.id) as KnowledgeDetailItem | null;
    } catch (error: unknown) {
        accessError = error;
    }

    if (accessError) {
        return (
            <div className="min-h-screen bg-oxford-50 dark:bg-oxford-950 flex items-center justify-center p-4">
                <div className="bg-white dark:bg-[#161B2A] p-8 rounded-2xl shadow-sm text-center max-w-md border border-crimson-200">
                    <div className="w-16 h-16 bg-crimson-50 text-crimson-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                    </div>
                    <h2 className="text-xl font-bold text-oxford-900 dark:text-white mb-2">Akses Terbatas</h2>
                    <p className="text-oxford-600 dark:text-oxford-300 mb-6">{errorMessage(accessError)}</p>
                    <a href="/login" className="px-6 py-2 bg-gold-500 text-oxford-950 font-bold rounded-xl hover:bg-gold-400 transition-colors inline-block">Login ke Akun ASN</a>
                </div>
            </div>
        );
    }

    if (!item) notFound();

    const serializedItem: KnowledgeDetailItem = {
        ...item,
        createdAt: new Date(item.createdAt).toISOString(),
        updatedAt: new Date(item.updatedAt).toISOString(),
        comments: (item.comments || []).map((comment) => ({
            ...comment,
            createdAt: new Date(comment.createdAt).toISOString(),
        })),
        attachments: (item.attachments || []).map((attachment) => ({
            ...attachment,
            createdAt: attachment.createdAt ? new Date(attachment.createdAt).toISOString() : undefined,
        })),
    };

    return <KnowledgeDetailClient item={serializedItem} serverUser={serverUser} />;
}
