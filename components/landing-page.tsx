"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";

type UiLanguage = "es" | "en";
type Branch = { title: string; description: string };

const demo: Record<UiLanguage, { root: string; branches: Branch[]; children: Record<string, Branch[]> }> = {
  es: {
    root: "¿Cómo podemos hacer más habitable una ciudad?",
    branches: [
      { title: "Reimaginar los espacios", description: "Diseñar lugares que inviten a quedarse y mezclarse." },
      { title: "Moverse de otra manera", description: "Cambiar cómo recorremos la ciudad cada día." },
      { title: "Cuidar lo común", description: "Crear sistemas vecinales que sostengan la vida urbana." },
    ],
    children: {
      "Reimaginar los espacios": [
        { title: "Plazas como salas", description: "Espacios públicos preparados para usos distintos." },
        { title: "Sombra que conecta", description: "Corredores frescos para caminar y encontrarse." },
        { title: "Edificios permeables", description: "Plantas bajas abiertas a la vida del barrio." },
      ],
      "Moverse de otra manera": [
        { title: "Calles de quince minutos", description: "Redibujar los trayectos alrededor de lo cercano." },
        { title: "Bici como infraestructura", description: "Pensar la bicicleta como red, no como accesorio." },
        { title: "Transporte a demanda", description: "Conectar mejor los lugares que quedan fuera del mapa." },
      ],
      "Cuidar lo común": [
        { title: "Bibliotecas de barrio", description: "Prestar herramientas, tiempo y conocimiento." },
        { title: "Cocinas compartidas", description: "Convertir la alimentación en una red de apoyo." },
        { title: "Datos para decidir", description: "Hacer visibles las necesidades de cada zona." },
      ],
    },
  },
  en: {
    root: "How could we make a city more livable?",
    branches: [
      { title: "Reimagine shared space", description: "Design places that invite people to stay and mix." },
      { title: "Move differently", description: "Change how we travel through the city every day." },
      { title: "Care for the commons", description: "Build neighborhood systems that hold urban life." },
    ],
    children: {
      "Reimagine shared space": [
        { title: "Squares as living rooms", description: "Public spaces ready for many different uses." },
        { title: "Shade that connects", description: "Cool corridors made for walking and meeting." },
        { title: "Permeable buildings", description: "Ground floors that open into neighborhood life." },
      ],
      "Move differently": [
        { title: "Fifteen-minute streets", description: "Redraw routes around what is close at hand." },
        { title: "Bikes as infrastructure", description: "Treat cycling as a network, not an accessory." },
        { title: "On-demand transit", description: "Connect the places that usually sit outside the map." },
      ],
      "Care for the commons": [
        { title: "Neighborhood libraries", description: "Lend tools, time, and knowledge." },
        { title: "Shared kitchens", description: "Turn food into a network of mutual support." },
        { title: "Data for decisions", description: "Make each neighborhood’s needs visible." },
      ],
    },
  },
};

const copy = {
  es: {
    navHow: "Cómo funciona",
    navJoin: "Únete a la lista",
    eyebrow: "Exploración de ideas",
    title: "Una idea. Tres caminos. Tú decides hasta dónde.",
    intro: "Explora ideas con IA, descubre nuevas direcciones y construye un árbol de posibilidades, paso a paso.",
    join: "Únete a la lista",
    demoLabel: "Ejemplo interactivo",
    demoHint: "Elige una rama para ver cómo puede continuar.",
    rootLabel: "Punto de partida",
    nextLabel: "Tres direcciones",
    reset: "Volver al inicio",
    selected: "Explorando",
    howEyebrow: "Cómo funciona",
    howTitle: "No te da una respuesta. Te ayuda a ver más posibilidades.",
    steps: [
      ["01", "Plantea una idea", "Una pregunta, un proyecto o algo que quieras explorar."],
      ["02", "Descubre tres direcciones", "Elige el camino que te resulte más interesante."],
      ["03", "Sigue profundizando", "Desarrolla nuevas ramas y visualiza el recorrido."],
    ],
    useEyebrow: "Para qué sirve",
    useTitle: "Un espacio para pensar en movimiento.",
    uses: [
      ["01", "Encontrar enfoques para un proyecto", "Cuando sabes qué quieres mover, pero todavía no desde dónde."],
      ["02", "Desarrollar una idea creativa", "Para abrir el campo antes de quedarte con la primera ocurrencia."],
      ["03", "Explorar preguntas y posibilidades", "Para seguir una intuición y descubrir dónde te lleva."],
    ],
    byokEyebrow: "Tu conexión, tu control",
    byokTitle: "Usa tu propia API key.",
    byokBody: "Beta privada por invitación. Para explorar, usarás tu propia API key de un proveedor compatible; Xpansive no la guarda.",
    joinEyebrow: "Novedades del proyecto",
    joinTitle: "Solicita una invitación.",
    joinBody: "Xpansive está en beta privada por invitación. Déjanos tu email y, si quieres, cuéntanos qué te gustaría explorar. Apuntarte no activa el acceso a la beta.",
    emailLabel: "Tu email",
    emailPlaceholder: "nombre@ejemplo.com",
    useCaseLabel: "¿Qué te gustaría explorar? (opcional)",
    useCasePlaceholder: "Un proyecto, una pregunta o una idea…",
    invitationConsent: "Solicito una invitación y acepto que usemos este email para responder a la solicitud.",
    marketingConsent: "Quiero recibir novedades de Xpansive por email (opcional).",
    submit: "Unirme a la lista",
    loading: "Guardando…",
    success: "Gracias. Hemos recibido tu solicitud. Si procede, te enviaremos información sobre la invitación.",
    error: "No hemos podido procesar la solicitud. Inténtalo de nuevo.",
    consentError: "Necesitamos tu confirmación para gestionar la solicitud de invitación.",
    privacyNotice: "Usaremos tu email para gestionar la solicitud de invitación y responderte sobre ella. Las novedades de marketing son opcionales y solo se enviarán si las marcas.",
    footer: "Una forma más abierta de explorar lo que todavía no sabes.",
    privacy: "Privacidad",
    language: "EN",
  },
  en: {
    navHow: "How it works",
    navJoin: "Join the list",
    eyebrow: "Idea exploration",
    title: "One idea. Three paths. You decide how far to go.",
    intro: "Explore ideas with AI, discover new directions, and build a tree of possibilities, one step at a time.",
    join: "Join the list",
    demoLabel: "Interactive example",
    demoHint: "Choose a branch to see where it could lead.",
    rootLabel: "Starting point",
    nextLabel: "Three directions",
    reset: "Back to the start",
    selected: "Exploring",
    howEyebrow: "How it works",
    howTitle: "It does not give you an answer. It helps you see more possibilities.",
    steps: [
      ["01", "Start with an idea", "A question, a project, or something you want to explore."],
      ["02", "Discover three directions", "Choose the path that feels most interesting to you."],
      ["03", "Keep going deeper", "Develop new branches and see the path you took."],
    ],
    useEyebrow: "What it is for",
    useTitle: "A place to think in motion.",
    uses: [
      ["01", "Find approaches for a project", "When you know what you want to move, but not yet from where."],
      ["02", "Develop a creative idea", "Open up the field before settling on your first thought."],
      ["03", "Explore questions and possibilities", "Follow an intuition and discover where it leads."],
    ],
    byokEyebrow: "Your connection, your control",
    byokTitle: "Use your own API key.",
    byokBody: "Private beta by invitation. To explore, you will use your own API key from a compatible provider; Xpansive does not store it.",
    joinEyebrow: "Project updates",
    joinTitle: "Request an invitation.",
    joinBody: "Xpansive is a private beta by invitation. Leave your email and, if you like, tell us what you would explore. Joining does not activate beta access.",
    emailLabel: "Your email",
    emailPlaceholder: "name@example.com",
    useCaseLabel: "What would you like to explore? (optional)",
    useCasePlaceholder: "A project, a question, or an idea…",
    invitationConsent: "I request an invitation and agree that we use this email to respond to the request.",
    marketingConsent: "I want to receive Xpansive updates by email (optional).",
    submit: "Join the list",
    loading: "Saving…",
    success: "Thank you. We received your request. If appropriate, we will send information about the invitation.",
    error: "We could not process the request. Please try again.",
    consentError: "Please confirm so we can handle the invitation request.",
    privacyNotice: "We will use your email to handle the invitation request and reply about it. Marketing updates are optional and will only be sent if you choose them.",
    footer: "A more open way to explore what you do not know yet.",
    privacy: "Privacy",
    language: "ES",
  },
} as const;

function NewsletterForm({ language, labels }: { language: UiLanguage; labels: typeof copy[UiLanguage] }) {
  const [email, setEmail] = useState("");
  const [useCase, setUseCase] = useState("");
  const [invitationConsent, setInvitationConsent] = useState(false);
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!invitationConsent) {
      setStatus("error");
      setMessage(labels.consentError);
      return;
    }
    setStatus("loading");
    setMessage("");
    try {
      const response = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, invitationConsent, marketingConsent, language, useCase, website: "" }),
      });
      const data = await response.json() as { ok?: boolean };
      if (!response.ok || !data.ok) throw new Error("newsletter_failed");
      setStatus("success");
      setMessage(labels.success);
      setEmail("");
      setUseCase("");
      setInvitationConsent(false);
      setMarketingConsent(false);
    } catch {
      setStatus("error");
      setMessage(labels.error);
    }
  }

  return (
    <form className="newsletter-form" onSubmit={submit} noValidate aria-busy={status === "loading"}>
      <label htmlFor="newsletter-email">{labels.emailLabel}</label>
      <div className="newsletter-form__row">
        <input id="newsletter-email" name="email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder={labels.emailPlaceholder} aria-describedby="newsletter-consent newsletter-status" disabled={status === "loading"} />
        <button type="submit" disabled={status === "loading"}>{status === "loading" ? labels.loading : labels.submit}</button>
      </div>
      <label htmlFor="newsletter-use-case">{labels.useCaseLabel}</label>
      <textarea id="newsletter-use-case" name="useCase" maxLength={1000} value={useCase} onChange={(event) => setUseCase(event.target.value)} placeholder={labels.useCasePlaceholder} disabled={status === "loading"} rows={3} />
      <label className="newsletter-form__consent"><input type="checkbox" required checked={invitationConsent} onChange={(event) => setInvitationConsent(event.target.checked)} disabled={status === "loading"} /><span id="newsletter-consent">{labels.invitationConsent}</span></label>
      <label className="newsletter-form__consent"><input type="checkbox" checked={marketingConsent} onChange={(event) => setMarketingConsent(event.target.checked)} disabled={status === "loading"} /><span>{labels.marketingConsent}</span></label>
      <p className="newsletter-form__privacy">{labels.privacyNotice}</p>
      <p className={`newsletter-form__message newsletter-form__message--${status}`} id="newsletter-status" role={status === "error" ? "alert" : "status"} aria-live="polite">{message}</p>
    </form>
  );
}

function DemoTree({ language, labels }: { language: UiLanguage; labels: typeof copy[UiLanguage] }) {
  const content = demo[language];
  const [selected, setSelected] = useState<string | null>(null);
  const next = selected ? content.children[selected] : [];
  return (
    <div className="demo-shell" aria-label={labels.demoLabel}>
      <div className="demo-shell__top"><span className="section-kicker">{labels.demoLabel}</span><span className="demo-shell__hint">{labels.demoHint}</span></div>
      <div className="demo-tree">
        <div className="demo-tree__root"><span className="demo-tree__meta">{labels.rootLabel}</span><strong>{content.root}</strong></div>
        <div className="demo-tree__trunk" aria-hidden="true" />
        <div className="demo-tree__branches">
          {content.branches.map((branch) => <button key={branch.title} type="button" className={`demo-branch${selected === branch.title ? " is-selected" : ""}`} onClick={() => setSelected(selected === branch.title ? null : branch.title)} aria-pressed={selected === branch.title}><span className="demo-branch__number">0{content.branches.indexOf(branch) + 1}</span><strong>{branch.title}</strong><span>{branch.description}</span></button>)}
        </div>
        {selected && <>
          <div className="demo-tree__selection"><span>{labels.selected}</span><strong>{selected}</strong><button type="button" onClick={() => setSelected(null)}>{labels.reset}</button></div>
          <div className="demo-tree__children" aria-live="polite">{next.map((branch) => <div className="demo-child" key={branch.title}><span className="demo-child__dot" aria-hidden="true" /><strong>{branch.title}</strong><span>{branch.description}</span></div>)}</div>
        </>}
      </div>
    </div>
  );
}

export function LandingPage() {
  const [language, setLanguage] = useState<UiLanguage>("en");
  useEffect(() => {
    const next = window.navigator.language.toLowerCase().startsWith("es") ? "es" : "en";
    setLanguage(next);
    document.documentElement.lang = next;
  }, []);
  const labels = useMemo(() => copy[language], [language]);
  function toggleLanguage() {
    const next = language === "es" ? "en" : "es";
    setLanguage(next);
    document.documentElement.lang = next;
  }

  return <main className="landing-page">
    <nav className="landing-nav" aria-label="Main navigation"><Link href="/" className="brand-mark">XPANSIVE<span>↗</span></Link><div className="landing-nav__links"><a href="#como-funciona">{labels.navHow}</a><a href="#lista">{labels.navJoin}</a><button type="button" onClick={toggleLanguage} aria-label={`Switch language to ${labels.language}`}>{labels.language}</button></div></nav>
    <section className="landing-hero"><div className="landing-hero__copy"><span className="section-kicker">{labels.eyebrow}</span><h1>{labels.title}</h1><p>{labels.intro}</p><div className="hero-actions"><a className="button button--solid" href="#lista">{labels.join}</a></div></div><DemoTree language={language} labels={labels} /></section>
    <section className="landing-section how-section" id="como-funciona"><div className="section-intro"><span className="section-kicker">{labels.howEyebrow}</span><h2>{labels.howTitle}</h2></div><div className="steps-grid">{labels.steps.map(([number, title, body]) => <article className="step-card" key={number}><span>{number}</span><h3>{title}</h3><p>{body}</p></article>)}</div></section>
    <section className="landing-section uses-section"><div className="section-intro"><span className="section-kicker">{labels.useEyebrow}</span><h2>{labels.useTitle}</h2></div><div className="uses-list">{labels.uses.map(([number, title, body]) => <article className="use-row" key={number}><span>{number}</span><h3>{title}</h3><p>{body}</p></article>)}</div></section>
    <section className="byok-section"><div><span className="section-kicker">{labels.byokEyebrow}</span><h2>{labels.byokTitle}</h2></div><div><p>{labels.byokBody}</p></div></section>
    <section className="landing-section join-section" id="lista"><div className="join-section__copy"><span className="section-kicker">{labels.joinEyebrow}</span><h2>{labels.joinTitle}</h2><p>{labels.joinBody}</p></div><NewsletterForm language={language} labels={labels} /></section>
    <footer className="landing-footer"><Link href="/" className="brand-mark">XPANSIVE<span>↗</span></Link><p>{labels.footer}</p><div><a href="/dedicatoria" target="_blank" rel="noreferrer">Dedicatoria</a><Link href="/privacy">{labels.privacy}</Link><span>© {new Date().getFullYear()} Xpansive</span></div></footer>
  </main>;
}
