import type { ExpansionOption } from "@/lib/types";
import type { CSSProperties } from "react";
import { getCopy, type UiLanguage } from "@/lib/i18n";
import { Direction } from "@/components/exploration/direction";

export function Fork({ options, onSelect, onDiscard, onFavorite, onConclusion, uiLanguage, loading = false, loadingLabel, transitioningTitle, disabled = false, isOptionDisabled, isFavorite, isConclusion }: { options: ExpansionOption[]; onSelect: (option: ExpansionOption) => void; onDiscard?: (option: ExpansionOption) => void; onFavorite?: (option: ExpansionOption) => void; onConclusion?: (option: ExpansionOption) => void; uiLanguage: UiLanguage; loading?: boolean; loadingLabel?: string; transitioningTitle?: string | null; disabled?: boolean; isOptionDisabled?: (option: ExpansionOption) => boolean; isFavorite?: (option: ExpansionOption) => boolean; isConclusion?: (option: ExpansionOption) => boolean }) {
  const copy = getCopy(uiLanguage);
  return (
    <div className={`fork${loading ? " fork--loading" : ""}${transitioningTitle ? " fork--transitioning" : ""}`} aria-label={copy.threeDirections}>
      <div className="fork__origin" aria-hidden="true" />
      <div className="fork__branches" aria-hidden="true">{options.map((option, index) => <span key={`${option.title}-${index}`} style={{ "--branch-position": `${options.length === 1 ? 50 : (index / (options.length - 1)) * 100}%` } as CSSProperties} />)}</div>
      <div className="fork__directions">
        {options.map((option, index) => <Direction key={`${option.title}-${index}`} option={option} index={index} uiLanguage={uiLanguage} onSelect={() => onSelect(option)} onDiscard={onDiscard ? () => onDiscard(option) : undefined} onFavorite={onFavorite ? () => onFavorite(option) : undefined} onConclusion={onConclusion ? () => onConclusion(option) : undefined} favorite={isFavorite?.(option)} conclusion={isConclusion?.(option)} disabled={disabled || loading || isOptionDisabled?.(option)} selected={transitioningTitle === option.title} />)}
      </div>
      {loading && <div className="fork__loading-label" role="status" aria-live="polite">{loadingLabel ?? copy.expandingIdea}</div>}
    </div>
  );
}
