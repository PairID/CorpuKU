import { getKnowledgeItemById } from "@/app/actions/knowledge";
import { getAuthSession } from "@/app/actions/auth";
import { notFound, redirect } from "next/navigation";
import KMSEditClient, { EditableKnowledgeItem } from "./kms-edit-client";

export default async function KMSEditPage(props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    const { id } = params;
    
    // Check auth
    const auth = await getAuthSession();
    if (!auth?.user) {
        redirect("/login");
    }

    let item: (EditableKnowledgeItem & { authorId: string }) | null = null;
    try {
        item = await getKnowledgeItemById(id) as (EditableKnowledgeItem & { authorId: string }) | null;
    } catch (error: unknown) {
        console.error("Edit page error:", error);
        redirect(`/knowledge/${id}`);
    }
    if (!item) return notFound();

    // Check ownership or admin outside the data-loading try/catch so Next redirects
    // are never mistaken for data errors.
    if (item.authorId !== auth.user.id && auth.user.role !== "admin") {
        redirect(`/knowledge/${id}`);
    }

    const serializedItem: EditableKnowledgeItem = {
        ...item,
        createdAt: item.createdAt ? new Date(item.createdAt).toISOString() : null,
        updatedAt: item.updatedAt ? new Date(item.updatedAt).toISOString() : null,
    };

    return <KMSEditClient item={serializedItem} />;
}
