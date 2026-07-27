import { getAllUsersWithBangkomSummary } from "@/app/actions/bangkom";
import { AdminSidebar } from "@/components/layout/AdminSidebar";
import BangkomClient, { type BangkomUser } from "./bangkom-client";

interface RawBangkomUser {
    id: string;
    name: string;
    nip: string;
    jabatan: string;
    kategori_pegawai: string | null;
    nama_instansi: string | null;
    target_jp_tahunan: number | string | null;
    internal_course_jp: number | string | null;
    internal_webinar_jp: number | string | null;
    external_jp: number | string | null;
}

export const dynamic = "force-dynamic";

export default async function AdminBangkomPage() {
    const users = await getAllUsersWithBangkomSummary();
    const normalizedUsers: BangkomUser[] = (users as unknown as RawBangkomUser[]).map((user) => ({
        id: user.id,
        name: user.name,
        nip: user.nip,
        jabatan: user.jabatan,
        kategori_pegawai: user.kategori_pegawai,
        nama_instansi: user.nama_instansi,
        totalJp: Number(user.internal_course_jp || 0) + Number(user.internal_webinar_jp || 0) + Number(user.external_jp || 0),
        targetJp: Number(user.target_jp_tahunan || 20),
    }));

    return (
        <div className="min-h-screen bg-oxford-50 dark:bg-oxford-950 flex">
            {/* SIDEBAR */}
            <AdminSidebar activePage="bangkom" />

            {/* MAIN CONTENT */}
            <main className="flex-1 p-8">
                <div className="max-w-7xl mx-auto">
                    <BangkomClient users={normalizedUsers} />
                </div>
            </main>
        </div>
    );
}
