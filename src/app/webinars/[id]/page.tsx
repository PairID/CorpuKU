import { getWebinar } from "@/app/actions/webinars";
import { notFound, redirect } from "next/navigation";
import WebinarDetailClient from "./client";
import { getAuthSession } from "@/app/actions/auth";
import { sql } from "@/lib/db";

export default async function WebinarDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const webinar = await getWebinar(id);
    
    if (!webinar || webinar.status === 'draft') {
        notFound();
    }

    // Get user from server side cookie
    let currentUser = null;
    let isRegistered = false;
    
    try {
        const session = await getAuthSession();
        if (session && session.user && session.user.id) {
            const userRes = await sql`SELECT * FROM users WHERE id = ${session.user.id}`;
            if (userRes.length > 0) {
                currentUser = userRes[0];
                
                // Check registration
                const regRes = await sql`SELECT 1 FROM webinar_registrations WHERE user_id = ${currentUser.id} AND webinar_id = ${webinar.id}`;
                if (regRes.length > 0) {
                    isRegistered = true;
                }
            }
        }
    } catch (e) {
        console.error("Session parse error", e);
    }

    // If already registered, redirect straight to dashboard to avoid confusion
    if (isRegistered) {
        redirect(`/dashboard/webinars/${webinar.id}`);
    }

    // Map snake_case to camelCase for client
    const mappedUser = currentUser ? {
        id: currentUser.id,
        name: currentUser.name,
        email: currentUser.email,
        nip: currentUser.nip,
        instansiAsal: currentUser.instansi_asal,
        pangkat: currentUser.pangkat,
        jabatan: currentUser.jabatan
    } : null;

    return (
        <div className="min-h-screen bg-oxford-50 dark:bg-oxford-950">
            <div className="pt-20">
                <WebinarDetailClient webinar={webinar} user={mappedUser} />
            </div>
        </div>
    );
}
