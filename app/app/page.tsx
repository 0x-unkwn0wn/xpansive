import { ExpansionView } from "@/components/expansion-view";
import { getPageAccess } from "@/lib/authorization";
import { recordBetaEntry, recordReturnToExplore } from "@/lib/product-events";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AppPage() {
  const user = await getPageAccess();
  if (!user) redirect("/login");
  await recordBetaEntry(user.id);
  await recordReturnToExplore(user.id);
  return <ExpansionView />;
}
