import { getParticipantWebinar, getWebinarRegistration } from "@/app/actions/webinars";
import { notFound, redirect } from "next/navigation";
import { getAuthSession } from "@/app/actions/auth";
import { sql } from "@/lib/db";
import DashboardClient from "./client";

export default async function WebinarDashboardPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    // 1. Get Webinar
    // 1. Auth Check
    let currentUser = null;
    try {
        const session = await getAuthSession();
        if (session && session.user && session.user.id) {
            const userRes = await sql`SELECT * FROM users WHERE id = ${session.user.id}`;
            if (userRes.length > 0) {
                currentUser = userRes[0];
            }
        }
    } catch { }

    if (!currentUser) {
        redirect(`/login?callbackUrl=/dashboard/webinars/${id}`);
    }

    // 2. Participant data is only returned after registration is verified server-side.
    const webinar = await getParticipantWebinar(id);
    const registration = await getWebinarRegistration(id);

    // If not registered, redirect to catalog to register
    if (!registration) {
        redirect(`/webinars/${id}`);
    }

    if (!webinar) notFound();

    const mappedUser = {
        id: currentUser.id,
        name: currentUser.name,
        email: currentUser.email,
        nip: currentUser.nip,
        instansiAsal: currentUser.instansi_asal,
        pangkat: currentUser.pangkat,
        jabatan: currentUser.jabatan
    };

    return (
        <div className="min-h-screen bg-oxford-50 dark:bg-oxford-950">
            <div className="pt-20">
                <DashboardClient webinar={webinar} registration={registration} user={mappedUser} />
            </div>
        </div>
    );
}
