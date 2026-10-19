import type { ExpansionOption } from "@/lib/types";
import { getCopy, type UiLanguage } from "@/lib/i18n";

export function Direction({ option, index, onSelect, onDiscard, onFavorite, onConclusion, favorite = false, conclusion = false, uiLanguage, disabled = false, selected = false }: { option: ExpansionOption; index: number; onSelect: () => void; onDiscard?: () => void; onFavorite?: () => void; onConclusion?: () => void; favorite?: boolean; conclusion?: boolean; uiLanguage: UiLanguage; disabled?: boolean; selected?: boolean }) {
  const copy = getCopy(uiLanguage);
  return (
    <div className={`direction direction--${index + 1}${selected ? " direction--selected" : ""}`}>
      <button type="button" className="direction__select" onClick={onSelect} disabled={disabled} aria-label={`${copy.explore} ${option.title}`}>
        <span className="direction__number">{String(index + 1).padStart(2, "0")}</span>
        <span className="direction__body">
          <span className="direction__title">{option.title}</span>
          <span className="direction__description">{option.description}</span>
        </span>
        <span className="direction__action" aria-hidden="true">{copy.explore} <span>→</span></span>
      </button>
      {onDiscard && <button type="button" className="direction__discard" onClick={(event) => { event.stopPropagation(); onDiscard(); }} disabled={disabled} aria-label={`${copy.discard} ${option.title}`} title={copy.discard}>×</button>}
      {onFavorite && <button type="button" className={`direction__favorite${favorite ? " is-active" : ""}`} onClick={(event) => { event.stopPropagation(); onFavorite(); }} disabled={disabled} aria-label={`${favorite ? copy.unfavorite : copy.favorite} ${option.title}`} title={favorite ? copy.unfavorite : copy.favorite}>☆</button>}
      {onConclusion && <button type="button" className={`direction__conclusion${conclusion ? " is-active" : ""}`} onClick={(event) => { event.stopPropagation(); onConclusion(); }} disabled={disabled} aria-label={`${conclusion ? copy.unmarkConclusion : copy.markConclusion} ${option.title}`} title={conclusion ? copy.unmarkConclusion : copy.markConclusion}>◊</button>}
    </div>
  );
}
