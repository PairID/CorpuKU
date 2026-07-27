import { AdminSidebar } from "@/components/layout/AdminSidebar";
import AdminNewsClient from "./admin-news-client";
import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Manajemen Berita & Pers - CorpuKU Admin",
};

export default function AdminNewsPage() {
    return (
        <div className="flex min-h-screen bg-oxford-50 dark:bg-oxford-950">
            <AdminSidebar activePage="news" />
            <main className="flex-1 overflow-x-hidden">
                <AdminNewsClient />
            </main>
        </div>
    );
}
