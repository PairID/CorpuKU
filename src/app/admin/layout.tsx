import { requireAdminOrStaff } from "@/lib/admin-guard";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
    // Memastikan hanya Admin global, Instruktur, atau Staf Kelas terdaftar yang dapat mengakses area admin
    await requireAdminOrStaff();

    return <>{children}</>;
}
