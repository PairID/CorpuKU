import { redirect } from "next/navigation";

export default function LegacyProgramDetailPage() {
    // Halaman lama sebelumnya berisi program, harga, rating, dan afiliasi contoh.
    // Learning Paths adalah sumber program yang benar dan dikelola dari database.
    redirect("/paths");
}
