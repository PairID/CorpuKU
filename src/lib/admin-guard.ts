import { redirect } from "next/navigation";
import { getAuthSession } from "@/app/actions/auth";

export async function requireAdmin() {
    const session = await getAuthSession();
    const authUser = session?.user;

    if (!session || !authUser) {
        redirect("/login");
    }

    if (authUser.role !== "admin") {
        redirect("/dashboard");
    }

    return { session, user: authUser };
}

export async function requireInstructor() {
    const session = await getAuthSession();
    const authUser = session?.user;

    if (!session || !authUser) {
        redirect("/login");
    }

    if (!["admin", "instructor"].includes(authUser.role)) {
        redirect("/dashboard");
    }

    return { session, user: authUser };
}
