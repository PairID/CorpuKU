import { redirect } from "next/navigation";
import { getUserBangkomSummary, getExternalBangkomByUser } from "@/app/actions/bangkom";
import { getAuthSession } from "@/app/actions/auth";
import UserBangkomClient from "./bangkom-client";

export const dynamic = "force-dynamic";

export default async function UserBangkomPage() {
    const session = await getAuthSession();

    if (!session?.user) {
        redirect("/login");
    }

    const userId = session.user.id;
    const summary = await getUserBangkomSummary(userId);
    const external = await getExternalBangkomByUser(userId);

    return (
        <UserBangkomClient 
            userId={userId} 
            initialSummary={summary} 
            initialExternal={external} 
        />
    );
}
