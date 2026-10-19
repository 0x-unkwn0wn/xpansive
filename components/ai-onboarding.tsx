"use client";

import { useState } from "react";
import { AI_PROVIDER_CATALOG } from "@/lib/ai/catalog";
import { AIClientError, validateAIKey } from "@/lib/ai/client";
import { getCopy, type UiLanguage } from "@/lib/i18n";
import type { AIProviderName, ConnectedAIProvider } from "@/lib/types";

export function AIOnboarding({ uiLanguage, anonymousId, onConnected, onReady }: { uiLanguage: UiLanguage; anonymousId: string; onConnected: (connection: ConnectedAIProvider) => void; onReady: () => void }) {
  const copy = getCopy(uiLanguage);
  const [step, setStep] = useState(0);
  const [selected, setSelected] = useState<AIProviderName>("openai");
  const [apiKey, setApiKey] = useState("");
  const [connection, setConnection] = useState<ConnectedAIProvider | null>(null);
  const [model, setModel] = useState("");
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const descriptor = AI_PROVIDER_CATALOG.find((provider) => provider.id === selected) ?? AI_PROVIDER_CATALOG[0];

  function chooseProvider(provider: AIProviderName) {
    setSelected(provider);
    setApiKey("");
    setConnection(null);
    setModel("");
    setError(null);
    setStep(2);
  }

  async function testConnection(event: React.FormEvent) {
    event.preventDefault();
    if (!apiKey.trim() || testing) return;
    setTesting(true);
    setError(null);
    try {
      const result = await validateAIKey(apiKey.trim(), selected, descriptor.defaultModel, anonymousId);
      setConnection(result);
      setModel(result.model);
      onConnected(result);
      setStep(3);
    } catch (cause) {
      const code = cause instanceof AIClientError ? cause.code : undefined;
      setError(code === "RATE_LIMIT" ? copy.rateLimitReached : code === "INSUFFICIENT_CREDITS" ? copy.creditsUnavailable : code === "MODEL_NOT_AVAILABLE" ? copy.modelUnavailable : code === "PROVIDER_UNAVAILABLE" ? copy.providerUnavailable : copy.invalidApiKey);
    } finally { setTesting(false); }
  }

  function finish() {
    if (!connection || !model) return;
    onConnected({ ...connection, model });
    onReady();
  }

  return <main className="ai-onboarding"><div className="ai-onboarding__card" aria-live="polite">
    {step === 0 && <><p className="ai-onboarding__eyebrow">{copy.connectYourAI}</p><h1>{copy.connectYourAI}</h1><p className="ai-onboarding__intro">{copy.ownAIIntro}</p><div className="ai-onboarding__principles"><span>{copy.youChooseModel}</span><span>{copy.youControlKey}</span><span>{copy.youPayProvider}</span></div><p className="ai-onboarding__note">{copy.noResellTokens}</p><button type="button" className="ai-onboarding__primary" onClick={() => setStep(1)}>{copy.getStarted}</button></>}
    {step === 1 && <><p className="ai-onboarding__eyebrow">{copy.chooseProvider}</p><h1>{copy.connectYourAI}</h1><div className="ai-provider-grid">{AI_PROVIDER_CATALOG.map((provider) => <button type="button" className="ai-provider-card" key={provider.id} onClick={() => chooseProvider(provider.id)}><strong>{provider.name}</strong><span>{provider.description}</span></button>)}</div></>}
    {step === 2 && <><button type="button" className="ai-onboarding__back" onClick={() => setStep(1)}>← {copy.chooseProvider}</button><p className="ai-onboarding__eyebrow">{copy.getApiKey}</p><h1>{descriptor.name}</h1><p className="ai-onboarding__intro">{copy.apiKeyExplanation}</p><ol className="ai-onboarding__steps"><li>{copy.apiKeyStepOne}</li><li>{copy.apiKeyStepTwo}</li><li>{copy.apiKeyStepThree}</li><li>{copy.apiKeyStepFour}</li></ol><a className="ai-onboarding__dashboard" href={descriptor.dashboardUrl} target="_blank" rel="noreferrer">{copy.openProviderDashboard}</a><form onSubmit={testConnection} className="ai-onboarding__form"><label htmlFor="onboarding-api-key">{copy.apiKey}</label><input id="onboarding-api-key" type="password" autoComplete="off" value={apiKey} onChange={(event) => setApiKey(event.target.value)} placeholder="•••••••••••••••" /><button type="submit" className="ai-onboarding__primary" disabled={testing || !apiKey.trim()}>{testing ? copy.testingConnection : copy.testConnection}</button>{error && <p className="ai-settings__error" role="alert">{error}</p>}</form></>}
    {step === 3 && connection && <><p className="ai-onboarding__eyebrow">{copy.connectionSuccessful}</p><h1>{descriptor.name}</h1><p className="ai-onboarding__intro">{connection.maskedKey}</p><label className="ai-onboarding__label" htmlFor="onboarding-model">{copy.chooseModel}</label><select id="onboarding-model" className="ai-onboarding__select" value={model} onChange={(event) => setModel(event.target.value)}>{connection.models.map((item) => <option value={item.id} key={item.id}>{item.label}</option>)}</select><button type="button" className="ai-onboarding__primary" onClick={finish}>{copy.continueSetup}</button></>}
    {step === 4 && <><p className="ai-onboarding__eyebrow">{copy.connectionSuccessful}</p><h1>{copy.readyTitle}</h1><p className="ai-onboarding__intro">{copy.readyDescription}</p><button type="button" className="ai-onboarding__primary" onClick={onReady}>{copy.startExploring}</button></>}
  </div></main>;
}
