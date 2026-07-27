import { requireAdmin } from "@/lib/admin-guard";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
    // This will redirect non-admin users before rendering any admin page
    await requireAdmin();

    return <>{children}</>;
}
