import type { ExplorationNode } from "@/lib/types";
import { getCopy, type UiLanguage } from "@/lib/i18n";

function historyPath(nodes: Record<string, ExplorationNode>, activeNodeId: string) {
  const path: ExplorationNode[] = [];
  let cursor: ExplorationNode | undefined = nodes[activeNodeId];
  while (cursor) {
    path.unshift(cursor);
    cursor = cursor.parentId ? nodes[cursor.parentId] : undefined;
  }
  return path.map((node) => ({ id: node.id, title: node.title }));
}

export function ExplorationHistory({ nodes, activeNodeId, uiLanguage, onNavigate }: { nodes: Record<string, ExplorationNode>; activeNodeId: string; uiLanguage: UiLanguage; onNavigate: (id: string) => void }) {
  const copy = getCopy(uiLanguage);
  const items = historyPath(nodes, activeNodeId);
  return (
    <nav className="exploration-history" aria-label={copy.explorationHistory}>
      <ol>
        {items.map((item) => <li key={item.id} className={item.id === activeNodeId ? "is-current" : ""}><button type="button" onClick={() => onNavigate(item.id)} title={item.title}><span className="exploration-history__dot" aria-hidden="true" /><span className="exploration-history__title">{item.title}</span></button></li>)}
      </ol>
    </nav>
  );
}
