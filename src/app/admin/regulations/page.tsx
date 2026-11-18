"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import { AdminSidebar } from "@/components/layout/AdminSidebar";
import RegulationRegistryManager from "@/components/regulations/RegulationRegistryManager";

export default function AdminRegulationsPage() {
    const [sidebarOpen, setSidebarOpen] = useState(false);

    return (
        <div className="min-h-screen bg-oxford-50 dark:bg-oxford-950 flex font-sans">
            {/* SIDEBAR */}
            <AdminSidebar activePage="regulations" isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

            {/* MAIN CONTENT */}
            <main className="flex-1 flex flex-col min-h-screen relative">

                {/* Content */}
                <div className="p-6 md:p-8 lg:p-10 max-w-7xl mx-auto w-full">
                    <RegulationRegistryManager basePath="/admin" />
                </div>
            </main>
        </div>
    );
}
