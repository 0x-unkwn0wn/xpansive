"use client";

import { useState } from "react";
import { getCopy, type UiLanguage } from "@/lib/i18n";
import type { LanguagePreference } from "@/lib/types";

export function IdeaInput({ onSubmit, disabled = false, language, uiLanguage, onLanguageChange }: { onSubmit: (idea: string, goal?: string, constraints?: string[]) => void; disabled?: boolean; language: LanguagePreference; uiLanguage: UiLanguage; onLanguageChange: (language: LanguagePreference) => void }) {
  const [idea, setIdea] = useState("");
  const [goal, setGoal] = useState("");
  const [constraintInput, setConstraintInput] = useState("");
  const [constraints, setConstraints] = useState<string[]>([]);
  const copy = getCopy(uiLanguage);
  function submit(event: React.FormEvent) {
    event.preventDefault();
    const value = idea.trim();
    if (value && !disabled) onSubmit(value, goal.trim() || undefined, constraints);
  }
  return (
    <form onSubmit={submit} className="w-full max-w-2xl">
      <label htmlFor="idea" className="sr-only">{copy.ideaLabel}</label>
      <div className="flex flex-col gap-3 sm:flex-row">
        <input id="idea" value={idea} onChange={(event) => setIdea(event.target.value)} maxLength={280} disabled={disabled} placeholder={copy.ideaPlaceholder} className="min-h-14 flex-1 rounded-full border border-[var(--line)] bg-transparent px-6 text-base outline-none transition placeholder:text-[var(--muted)] focus:border-[var(--ink)] disabled:opacity-50" />
        <button type="submit" disabled={disabled || !idea.trim()} className="min-h-14 rounded-full bg-[var(--ink)] px-8 text-sm font-bold tracking-[0.18em] text-black transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-35">{copy.expand}</button>
      </div>
      <details className="idea-context">
        <summary>{copy.context}</summary>
        <div className="idea-context__fields">
          <label>{copy.goal}<input value={goal} onChange={(event) => setGoal(event.target.value)} maxLength={500} placeholder={copy.goalPlaceholder} /></label>
          <label>{copy.constraints}<input value={constraintInput} onChange={(event) => setConstraintInput(event.target.value)} maxLength={240} placeholder={copy.constraintsPlaceholder} onKeyDown={(event) => { if (event.key === "Enter" && constraintInput.trim()) { event.preventDefault(); setConstraints((current) => [...current, constraintInput.trim()].slice(0, 20)); setConstraintInput(""); } }} /></label>
          {constraints.length ? <div className="idea-context__constraints">{constraints.map((constraint) => <button type="button" key={constraint} onClick={() => setConstraints((current) => current.filter((item) => item !== constraint))}>{constraint} ×</button>)}</div> : null}
        </div>
      </details>
      <div className="flex items-center justify-center gap-3 pt-2 text-xs text-[var(--muted)] sm:justify-end">
        <label htmlFor="language">{copy.language}</label>
        <select id="language" value={language} onChange={(event) => onLanguageChange(event.target.value as LanguagePreference)} className="cursor-pointer rounded-full border border-[var(--line)] bg-transparent px-3 py-2 outline-none focus:border-[var(--ink)]">
          <option value="auto">{copy.auto}</option>
          <option value="en">{copy.english}</option>
          <option value="es">{copy.spanish}</option>
        </select>
      </div>
    </form>
  );
}
