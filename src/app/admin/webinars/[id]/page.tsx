import { getAdminWebinar } from "@/app/actions/webinars";
import { notFound } from "next/navigation";
import EditWebinarClient from "./edit-client";

export default async function EditWebinarPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const webinar = await getAdminWebinar(id);
    
    if (!webinar) {
        notFound();
    }

    return <EditWebinarClient webinar={webinar} />;
}
