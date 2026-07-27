import { getAllExternalBangkom } from "@/app/actions/bangkom";
import { AdminSidebar } from "@/components/layout/AdminSidebar";
import VerifikasiClient from "./verifikasi-client";

export const dynamic = "force-dynamic";

export default async function AdminVerifikasiBangkomPage() {
    const pendingList = await getAllExternalBangkom("pending");

    return (
        <div className="min-h-screen bg-oxford-50 dark:bg-oxford-950 flex">
            {/* SIDEBAR */}
            <AdminSidebar activePage="bangkom" />

            {/* MAIN CONTENT */}
            <main className="flex-1 p-8">
                <div className="max-w-6xl mx-auto">
                    <VerifikasiClient pendingList={pendingList} />
                </div>
            </main>
        </div>
    );
}
