import { getCopy, type UiLanguage } from "@/lib/i18n";

export function CurrentConcept({ concept, uiLanguage, initial = false }: { concept: string; uiLanguage: UiLanguage; initial?: boolean }) {
  const copy = getCopy(uiLanguage);
  return (
    <div className={`current-concept${initial ? " current-concept--initial" : ""}`}>
      <span className="current-concept__eyebrow">{initial ? copy.startWithIdea : copy.currentConcept}</span>
      <h1>{concept}</h1>
    </div>
  );
}
