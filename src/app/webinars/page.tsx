import { getWebinars } from "@/app/actions/webinars";
import WebinarsClient from "./client";

export const metadata = {
    title: "Webinar & Acara Langsung | CorpuKU",
    description: "Daftar webinar dan acara langsung (live session) yang tersedia di CorpuKU",
};

export default async function WebinarsPage() {
    const webinars = await getWebinars();

    return (
        <div className="min-h-screen bg-oxford-50 dark:bg-oxford-950">
            <div className="pt-20">
                <WebinarsClient webinars={webinars} />
            </div>
        </div>
    );
}
