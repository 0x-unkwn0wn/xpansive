import { redirect } from "next/navigation";
import { AdminPanel } from "@/components/admin-panel";
import { AdminMetrics } from "@/components/admin-metrics";
import { AdminHealth } from "@/components/admin-health";
import { AccountMenu } from "@/components/account-menu";
import { getAdminPageAccess } from "@/lib/authorization";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  if (!await getAdminPageAccess()) redirect("/app");
  return <><div className="flex justify-end px-5 pt-5 sm:px-10"><AccountMenu uiLanguage="es" /></div><AdminHealth /><AdminMetrics /><AdminPanel /></>;
}
