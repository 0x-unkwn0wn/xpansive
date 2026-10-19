"use client";

import { useEffect, useState } from "react";
import { AI_PROVIDER_CATALOG, type AIProviderDescriptor } from "@/lib/ai/catalog";
import { AIClientError, validateAIKey } from "@/lib/ai/client";
import { hasBasicApiKeyFormat } from "@/lib/ai/credentials";
import { getCopy, type UiLanguage } from "@/lib/i18n";
import type { AIProviderName, ConnectedAIProvider } from "@/lib/types";

type AISettingsProps = {
  uiLanguage: UiLanguage;
  open: boolean;
  connections: ConnectedAIProvider[];
  activeProvider: AIProviderName | null;
  error: string | null;
  anonymousId: string;
  onClose: () => void;
  onConnect: (connection: ConnectedAIProvider) => Promise<void>;
  onSelectProvider: (provider: AIProviderName) => void;
  onDisconnect: (provider: AIProviderName) => void;
};

function providerError(cause: unknown, copy: ReturnType<typeof getCopy>, provider: AIProviderDescriptor) {
  const code = cause instanceof AIClientError ? cause.code : undefined;
  if (code === "RATE_LIMIT") return copy.rateLimitReached;
  if (code === "INSUFFICIENT_CREDITS") return copy.creditsUnavailable;
  if (code === "MODEL_NOT_AVAILABLE") return copy.modelUnavailable;
  if (code === "INVALID_API_KEY" || code === "AUTHENTICATION_FAILED") return `${copy.invalidApiKey} ${provider.name}.`;
  return copy.providerUnavailable;
}

export function AISettings({ uiLanguage, open, connections, activeProvider, error, anonymousId, onClose, onConnect, onSelectProvider, onDisconnect }: AISettingsProps) {
  const copy = getCopy(uiLanguage);
  const [selected, setSelected] = useState<AIProviderName>(activeProvider ?? connections[0]?.provider ?? "openai");
  const [apiKey, setApiKey] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const provider = AI_PROVIDER_CATALOG.find((item) => item.id === selected) ?? AI_PROVIDER_CATALOG[0];
  const connection = connections.find((item) => item.provider === selected) ?? null;

  useEffect(() => {
    setSelected(activeProvider ?? connections[0]?.provider ?? "openai");
  }, [activeProvider, connections]);

  if (!open) return null;

  async function connect(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!hasBasicApiKeyFormat(apiKey) || connecting) return;
    setConnecting(true);
    try {
      const result = await validateAIKey(apiKey.trim(), provider.id, provider.defaultModel, anonymousId);
      await onConnect(result);
      setApiKey("");
      setShowExplanation(false);
      setLocalError(null);
    } catch (cause) {
      // Provider and SDK details stay inside this safe, user-facing mapping.
      setLocalError(providerError(cause, copy, provider));
    } finally {
      setConnecting(false);
    }
  }

  function selectProvider(next: AIProviderName) {
    setSelected(next);
    setApiKey("");
    setLocalError(null);
    if (connections.some((item) => item.provider === next)) onSelectProvider(next);
  }

  function close() {
    setApiKey("");
    setLocalError(null);
    onClose();
  }

  const visibleError = localError ?? error;

  return <aside className="ai-settings" aria-label={copy.connectAIToContinue}>
    <div className="ai-settings__header">
      <div>
        <p className="ai-settings__eyebrow">{copy.connectYourAI}</p>
        <h2>{connections.length ? copy.activeAIProvider : copy.connectAIToContinue}</h2>
      </div>
      <button type="button" className="ai-settings__close" onClick={close} aria-label={copy.closeSettings}>×</button>
    </div>
    <p className="ai-settings__intro">{copy.ownAIIntro}</p>
    {connections.length > 0 && <>
      <p className="ai-settings__eyebrow">{copy.activeAIProvider}</p>
      <div className="ai-settings__connections" role="list" aria-label={copy.activeAIProvider}>
        {connections.map((item) => {
          const descriptor = AI_PROVIDER_CATALOG.find((candidate) => candidate.id === item.provider);
          return <button type="button" role="listitem" key={item.provider} className={item.provider === selected ? "is-selected" : ""} onClick={() => selectProvider(item.provider)}><strong>{descriptor?.name ?? item.provider}</strong><span>{item.model}</span></button>;
        })}
      </div>
    </>}
    <p className="ai-settings__eyebrow">{copy.chooseProviderForAI}</p>
    <div className="ai-settings__providers" role="list" aria-label={copy.availableProviders}>
      {AI_PROVIDER_CATALOG.map((item) => <button type="button" role="listitem" key={item.id} className={item.id === selected ? "is-selected" : ""} onClick={() => selectProvider(item.id)}>{item.name}{connections.some((candidate) => candidate.provider === item.id) ? " ✓" : ""}</button>)}
    </div>
    {connection ? <>
      <p className="ai-settings__budget">{connection.provider} · {connection.model}</p>
      <button type="button" className="ai-settings__disconnect" onClick={() => onDisconnect(connection.provider)}>{copy.disconnect}</button>
    </> : <>
      <p className="ai-settings__steps">{copy.keyStepCreate}</p>
      <a className="ai-settings__dashboard" href={provider.dashboardUrl} target="_blank" rel="noreferrer">{provider.name} · {copy.openProviderDashboard}</a>
      <p className="ai-settings__hint">{provider.apiKeyInstructions[uiLanguage]}</p>
      <form onSubmit={connect}>
        <label htmlFor="ai-settings-key">{copy.keyStepPaste}</label>
        <input id="ai-settings-key" type="password" autoComplete="off" value={apiKey} onChange={(event) => { setApiKey(event.target.value); setLocalError(null); }} placeholder="•••••••••••••••" aria-describedby="ai-settings-connect-step" />
        <button id="ai-settings-connect-step" type="submit" disabled={connecting || !hasBasicApiKeyFormat(apiKey)}>{connecting ? copy.testingConnection : copy.keyStepConnect}</button>
        {visibleError && <p className="ai-settings__error" role="alert">{visibleError}</p>}
      </form>
      <button type="button" className="ai-settings__help-trigger" onClick={() => setShowExplanation((value) => !value)}>{copy.whatIsApiKey}</button>
      {showExplanation && <p className="ai-settings__help">{copy.apiKeyShortExplanation}</p>}
    </>}
  </aside>;
}
