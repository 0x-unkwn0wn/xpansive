import Link from "next/link";

export default function DedicationPage() {
  return <main className="dedication-page">
    <div className="dedication-page__top">
      <Link href="/" className="brand-mark">XPANSIVE<span>↗</span></Link>
    </div>
    <section className="dedication-page__content" aria-labelledby="dedication-title">
      <span className="section-kicker">Homenaje</span>
      <h1 id="dedication-title">En honor a 2d2ki2</h1>
      <div className="dedication-page__copy">
        <p>Este sitio está dedicado a <strong>2d2ki2</strong>, compañero, amigo y parte de una historia que merece permanecer.</p>
        <p>Por los momentos compartidos, las conversaciones, las risas y todo aquello que dejó huella en quienes tuvimos la suerte de coincidir con él.</p>
        <p>Que este pequeño rincón sirva para mantener presente su recuerdo y como homenaje a todo lo que significó.</p>
        <p><strong>Siempre presente, 2d2ki2.</strong></p>
      </div>
    </section>
    <footer className="dedication-page__footer"><Link href="/">Volver a Xpansive</Link></footer>
  </main>;
}
