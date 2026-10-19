import Link from "next/link";

export const metadata = {
  title: "Privacidad — Xpansive",
  description: "Información sobre los datos que trata Xpansive durante la beta privada.",
};

export default function PrivacyPage() {
  return <main className="min-h-screen px-6 py-7 sm:px-10">
    <header className="app-header"><Link href="/" className="brand-wordmark">XPANSIVE<span className="brand-wordmark__mark">↗</span></Link><Link href="/" className="header-action">VOLVER</Link></header>
    <article className="privacy-page">
      <span className="section-kicker">PRIVACIDAD</span>
      <h1>Qué datos usamos durante la beta.</h1>
      <p className="privacy-page__updated">Última actualización: 18 de octubre de 2026</p>
      <h2>Datos de acceso</h2>
      <p>Usamos tu email para gestionar la invitación y enviarte enlaces de acceso de un solo uso. Guardamos sesiones, estado de acceso e información necesaria para operar la beta.</p>
      <h2>Exploraciones y feedback</h2>
      <p>Guardamos las exploraciones que creas, sus ramas, preferencias y el feedback que envías para que puedas volver a ellas y para aprender durante la beta. Los eventos de uso se conservan durante el periodo configurado de producto.</p>
      <h2>Tu API key</h2>
      <p>Xpansive no guarda tu API key. La clave vive solo en la memoria de la pestaña mientras exploras y se envía al proveedor que eliges para generar respuestas. Tú pagas directamente el uso de ese proveedor.</p>
      <h2>Compartir</h2>
      <p>Las exploraciones compartidas son accesibles únicamente a personas autenticadas con acceso activo a la beta. Puedes revocar el enlace desde la exploración.</p>
      <h2>Tus opciones</h2>
      <p>Puedes borrar tu cuenta desde el menú de la aplicación. El borrado elimina tus exploraciones, sesiones, feedback y datos de acceso asociados, sujeto a las obligaciones operativas que correspondan.</p>
      <h2>Contacto</h2>
      <p>Para ejercer una solicitud relacionada con tus datos, escribe a <a href="mailto:contacto@williamkhepri.com">contacto@williamkhepri.com</a>.</p>
      <p className="privacy-page__note">Esta página describe el funcionamiento de la beta y debe revisarse con asesoramiento legal antes de usarla como política definitiva.</p>
    </article>
  </main>;
}
