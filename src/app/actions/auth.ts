"use server";

import { cookies } from "next/headers";
import { getServerSession, SESSION_COOKIE_NAME } from "@/lib/session";

export async function getAuthSession() {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);
    
    if (!sessionCookie) return null;

    try {
        const session = await getServerSession(sessionCookie.value);
        if (!session) return null;
        return { user: session.user, session };
    } catch {
        return null;
    }
}

export async function requireAdminSession() {
    const session = await getAuthSession();
    if (!session || session.user.role !== "admin") {
        throw new Error("Unauthorized: Admin role required");
    }
    return session;
}

export async function requireInstructorSession() {
    const session = await getAuthSession();
    if (!session || !["admin", "instructor"].includes(session.user.role)) {
        throw new Error("Unauthorized: Instructor/Admin role required");
    }
    return session;
}

export async function requireUserSession() {
    const session = await getAuthSession();
    if (!session) {
        throw new Error("Unauthorized: Login required");
    }
    return session;
}
