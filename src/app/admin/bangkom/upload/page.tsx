import { AdminSidebar } from "@/components/layout/AdminSidebar";
import BatchUploadClient from "./upload-client";

export const dynamic = "force-dynamic";

export default function AdminBangkomBatchUploadPage() {
    return (
        <div className="min-h-screen bg-oxford-50 dark:bg-oxford-950 flex">
            {/* SIDEBAR */}
            <AdminSidebar activePage="bangkom" />

            {/* MAIN CONTENT */}
            <main className="flex-1 p-8">
                <div className="max-w-7xl mx-auto">
                    <BatchUploadClient />
                </div>
            </main>
        </div>
    );
}
