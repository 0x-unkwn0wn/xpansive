import { notFound } from "next/navigation";
import { redirect } from "next/navigation";
import { SharedExploration } from "@/components/shared-exploration";
import { getPublicExploration, publicExplorationState } from "@/lib/db/persistence";
import { getPageAccess } from "@/lib/authorization";
import { explorationEventKey, tryRecordProductEvent } from "@/lib/product-events";

export const dynamic = "force-dynamic";

export default async function SharedPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getPageAccess({ capability: "share" });
  if (!user) redirect(`/login?next=${encodeURIComponent(`/x/${id}`)}`);
  try {
    const record = await getPublicExploration(id);
    if (!record) notFound();
    if (record.row.userId && record.row.userId !== user.id) {
      await tryRecordProductEvent(user.id, "share_opened_by_recipient", { dedupeKey: `open:${explorationEventKey(record.row.id)}:${new Date().toISOString().slice(0, 13)}`, explorationId: record.row.id, outcome: "success", actorType: "recipient", properties: { source: "shared" } });
    }
    return <SharedExploration exploration={{ ...publicExplorationState(record.state), shareId: id, isShared: true, remoteRevision: undefined }} />;
  } catch {
    notFound();
  }
}
