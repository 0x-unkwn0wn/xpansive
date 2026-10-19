import { getCopy, type UiLanguage } from "@/lib/i18n";
import type { SuggestionHistoryEntry } from "@/lib/types";

export function SuggestionHistory({ entries, uiLanguage, onRestore }: { entries: SuggestionHistoryEntry[]; uiLanguage: UiLanguage; onRestore: (id: string) => void }) {
  const copy = getCopy(uiLanguage);
  return <details className="suggestion-history">
    <summary>{copy.previousSuggestions}</summary>
    <div className="suggestion-history__list">
      {entries.slice().reverse().map((entry) => <div className="suggestion-history__item" key={entry.id}>
        <span><strong>{entry.option.title}</strong><small>{entry.option.description}</small></span>
        <button type="button" onClick={() => onRestore(entry.id)}>{copy.restoreSuggestion}</button>
      </div>)}
    </div>
  </details>;
}
