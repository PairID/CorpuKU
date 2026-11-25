import { requireAdminSession } from "@/app/actions/auth";
import { getMasterInstansiList } from "@/app/actions/instansi";
import InstansiAdminClient from "./instansi-client";

export const dynamic = "force-dynamic";

export default async function AdminInstansiPage() {
  await requireAdminSession();
  const initialList = await getMasterInstansiList();
  return <InstansiAdminClient initialList={initialList} />;
}
