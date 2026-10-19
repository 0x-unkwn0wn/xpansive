import { ExpansionView } from "@/components/expansion-view";
import { getPageAccess } from "@/lib/authorization";
import { redirect } from "next/navigation";
import { recordExplorationReopen, recordReturnToExplore } from "@/lib/product-events";

export const dynamic = "force-dynamic";

export default async function EditableExplorationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getPageAccess();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/e/${id}`)}`);
  await recordReturnToExplore(user.id);
  await recordExplorationReopen(user.id, id);
  return <ExpansionView initialExplorationId={id} />;
}
