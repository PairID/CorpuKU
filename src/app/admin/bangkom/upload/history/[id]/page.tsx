import { AdminSidebar } from "@/components/layout/AdminSidebar";
import { getBatchJobDetails } from "@/app/actions/bangkom";
import { notFound } from "next/navigation";
import BatchJobDetailClient, { type BatchItem, type BatchJobSummary } from "./detail-client";

export const dynamic = "force-dynamic";

interface PageProps {
    params: {
        id: string;
    };
}

export default async function BatchJobDetailPage({ params }: PageProps) {
    const { id } = await params;
    const details = await getBatchJobDetails(id);

    if (!details) {
        notFound();
    }

    return (
        <div className="min-h-screen bg-oxford-50 dark:bg-oxford-950 flex">
            {/* SIDEBAR */}
            <AdminSidebar activePage="bangkom" />

            {/* MAIN CONTENT */}
            <main className="flex-1 p-8">
                <div className="max-w-7xl mx-auto">
                    <BatchJobDetailClient
                        initialJob={details.job as unknown as BatchJobSummary}
                        initialItems={details.items as unknown as BatchItem[]}
                    />
                </div>
            </main>
        </div>
    );
}
