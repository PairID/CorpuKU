import { getAuthSession } from "@/app/actions/auth";
import { getAboutUsData } from "@/app/actions/about";
import { redirect } from "next/navigation";
import AboutEditor from "./about-editor";
import { AdminSidebar } from "@/components/layout/AdminSidebar";

export const metadata = {
  title: "Editor Organisasi - Admin | CorpuKU",
};

export default async function AdminAboutPage() {
  const session = await getAuthSession();
  const user = session?.user;

  if (!user || user.role !== "admin") {
    redirect("/login");
  }

  const initialData = await getAboutUsData();

  return (
    <div className="min-h-screen bg-oxford-50 dark:bg-oxford-950 flex font-sans">
      <AdminSidebar activePage="about" />

      <main className="flex-1 flex flex-col min-h-screen">

        <div className="p-6 md:p-8 lg:p-10 max-w-7xl mx-auto w-full">
          <AboutEditor initialData={initialData} />
        </div>
      </main>
    </div>
  );
}
