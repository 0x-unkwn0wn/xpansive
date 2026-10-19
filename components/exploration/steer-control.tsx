"use client";

import { getCopy, type UiLanguage } from "@/lib/i18n";

type SteerControlProps = {
  uiLanguage: UiLanguage;
  open: boolean;
  value: string;
  disabled?: boolean;
  loading?: boolean;
  error?: string | null;
  onOpen: () => void;
  onClose: () => void;
  onChange: (value: string) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
};

export function SteerControl({ uiLanguage, open, value, disabled = false, loading = false, error, onOpen, onClose, onChange, onSubmit }: SteerControlProps) {
  const copy = getCopy(uiLanguage);
  if (!open) {
    return <button type="button" className="steer-trigger" onClick={onOpen} disabled={disabled}>{copy.steer}</button>;
  }

  return (
    <form className="steer-control" onSubmit={onSubmit}>
      <label htmlFor="steer-input">{copy.steerToward}</label>
      <div className="steer-control__row">
        <input id="steer-input" value={value} onChange={(event) => onChange(event.target.value)} onKeyDown={(event) => { if (event.key === "Escape") { event.preventDefault(); onClose(); } }} maxLength={100} disabled={disabled || loading} autoFocus placeholder={copy.steerPlaceholder} aria-invalid={Boolean(error)} />
        <button type="submit" aria-label={copy.steerSubmit} disabled={disabled || loading || !value.trim()}>{loading ? "…" : "→"}</button>
      </div>
      {error && <p className="steer-control__error" role="alert">{error}</p>}
    </form>
  );
}
