import { getCopy, type UiLanguage } from "@/lib/i18n";
import type { JourneySummary } from "@/lib/types";

export function JourneySummaryPanel({ summary, uiLanguage, onClose }: { summary: JourneySummary; uiLanguage: UiLanguage; onClose: () => void }) {
  const copy = getCopy(uiLanguage);
  return (
    <section className="journey-summary" aria-label={copy.conclusion}>
      <div className="journey-summary__header">
        <span className="journey-summary__eyebrow">{copy.conclusion}</span>
        <button type="button" className="journey-summary__close" onClick={onClose} aria-label={copy.close}>×</button>
      </div>
      <p className="journey-summary__text">{summary.summary}</p>
      <div className="journey-summary__insights">
        <span className="journey-summary__eyebrow">{copy.keyInsights}</span>
        <ol>
          {summary.keyInsights.map((insight, index) => <li key={`${index}-${insight}`}><span>0{index + 1}</span><p>{insight}</p></li>)}
        </ol>
      </div>
    </section>
  );
}
