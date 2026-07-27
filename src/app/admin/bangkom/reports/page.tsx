import { getAdminBangkomReportData } from "@/app/actions/bangkom";
import { AdminSidebar } from "@/components/layout/AdminSidebar";
import ReportsClient, { type ReportData } from "./reports-client";

export const dynamic = "force-dynamic";

export default async function AdminBangkomReportsPage() {
    const data = await getAdminBangkomReportData();

    return (
        <div className="min-h-screen bg-oxford-50 dark:bg-oxford-950 flex">
            {/* SIDEBAR */}
            <AdminSidebar activePage="bangkom" />

            {/* MAIN CONTENT */}
            <main className="flex-1 p-8">
                <div className="max-w-7xl mx-auto">
                    <ReportsClient data={data as unknown as ReportData} />
                </div>
            </main>
        </div>
    );
}
