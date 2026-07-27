"use client";
import { useState, useEffect } from "react";
import { Menu } from "lucide-react";
import { getAllUsers } from "@/app/actions/users";
import UserTable, { type AdminUser } from "./user-table";
import { AdminSidebar } from "@/components/layout/AdminSidebar";

type RawAdminUser = Omit<AdminUser, "createdAt" | "nip" | "username"> & {
    createdAt: string | Date;
    nip?: string | null;
    username?: string | null;
};

export default function AdminUsersPage() {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [users, setUsers] = useState<AdminUser[]>([]);

    useEffect(() => {
        async function fetchUsers() {
            try {
                const usersData = await getAllUsers();
                // Serialize data (dates + fields)
                const mapped = (usersData as unknown as RawAdminUser[]).map((u) => ({
                    ...u,
                    createdAt: new Date(u.createdAt),
                    nip: u.nip || "",
                    username: u.username || u.nip || "",
                }));
                setUsers(mapped);
            } catch (err) {
                console.error(err);
            }
        }
        fetchUsers();
    }, []);

    return (
        <div className="min-h-screen bg-oxford-50 dark:bg-oxford-950 flex font-sans">
            {/* SIDEBAR */}
            <AdminSidebar activePage="users" isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

            {/* MAIN CONTENT */}
            <main className="flex-1 flex flex-col min-h-screen relative">
                {/* Mobile sidebar toggle button (floating) */}
                <button 
                    onClick={() => setSidebarOpen(true)}
                    className="lg:hidden fixed bottom-6 right-6 z-40 p-4 bg-gold-500 text-oxford-950 rounded-full shadow-2xl hover:bg-gold-400 transition-all active:scale-95"
                >
                    <Menu size={24} />
                </button>

                {/* Content */}
                <div className="p-6 md:p-8 lg:p-10 max-w-7xl mx-auto w-full flex-1 flex flex-col">
                    <UserTable users={users} />
                </div>
            </main>
        </div>
    );
}
