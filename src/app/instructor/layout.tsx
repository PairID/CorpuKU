import { requireInstructor } from "@/lib/admin-guard";

export default async function InstructorLayout({ children }: { children: React.ReactNode }) {
    await requireInstructor();
    return <>{children}</>;
}
