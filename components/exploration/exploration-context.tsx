"use client";

import { useState } from "react";
import { getCopy, type UiLanguage } from "@/lib/i18n";

export function ExplorationContextControl({ uiLanguage, goal, constraints, onChange }: { uiLanguage: UiLanguage; goal?: string; constraints: string[]; onChange: (value: { goal?: string; constraints: string[] }) => void }) {
  const copy = getCopy(uiLanguage);
  const [goalValue, setGoalValue] = useState(goal ?? "");
  const [constraint, setConstraint] = useState("");
  function commitGoal() { onChange({ goal: goalValue.trim() || undefined, constraints }); }
  function addConstraint() {
    const value = constraint.trim();
    if (!value || constraints.includes(value)) return;
    const next = [...constraints, value].slice(0, 20);
    setConstraint("");
    onChange({ goal: goalValue.trim() || undefined, constraints: next });
  }
  return <details className="exploration-context">
    <summary>{copy.context}</summary>
    <div className="exploration-context__panel">
      <label>{copy.goal}<input value={goalValue} maxLength={500} placeholder={copy.goalPlaceholder} onChange={(event) => setGoalValue(event.target.value)} onBlur={commitGoal} /></label>
      <label>{copy.constraints}<input value={constraint} maxLength={240} placeholder={copy.constraintsPlaceholder} onChange={(event) => setConstraint(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addConstraint(); } }} /></label>
      {constraints.length ? <div className="idea-context__constraints">{constraints.map((item) => <button type="button" key={item} onClick={() => onChange({ goal: goalValue.trim() || undefined, constraints: constraints.filter((value) => value !== item) })}>{item} ×</button>)}</div> : null}
    </div>
  </details>;
}
