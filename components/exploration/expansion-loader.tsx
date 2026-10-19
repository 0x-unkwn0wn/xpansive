import { getCopy, type UiLanguage } from "@/lib/i18n";

export function ExpansionLoader({ uiLanguage }: { uiLanguage: UiLanguage }) {
  const copy = getCopy(uiLanguage);
  return <div className="expansion-loader" role="status" aria-live="polite"><div className="expansion-loader__line" aria-hidden="true"><span /></div><span>{copy.expandingIdea}</span></div>;
}
