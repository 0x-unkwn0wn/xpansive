const BRAND = {
  paper: "#101311",
  ink: "#f1f0e8",
  muted: "#a4aaa0",
  line: "#343a33",
  accent: "#ff5c00",
  canvas: "#e9e7e0",
};

export type PrivateBetaInvitationData = {
  recipientEmail: string;
  accessUrl: string;
};

export type RenderedEmail = {
  subject: string;
  html: string;
  text: string;
};

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character] ?? character);
}

function assertAbsoluteHttpUrl(value: string) {
  const url = new URL(value);
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("Email links must use an absolute HTTP(S) URL.");
}

export function renderPrivateBetaInvitation(data: PrivateBetaInvitationData): RenderedEmail {
  assertAbsoluteHttpUrl(data.accessUrl);
  const accessUrl = escapeHtml(data.accessUrl);
  const subject = "Tu invitación a la beta privada de Xpansive";

  const text = `Hola,

Tu invitación a la beta privada de Xpansive está disponible.

Xpansive te ayuda a explorar ideas con IA, descubrir nuevas direcciones y construir un árbol de posibilidades, paso a paso.

Para empezar, accede a la beta y conecta tu propia API key de un proveedor compatible. Xpansive no la guarda.

Acceder a la beta: ${data.accessUrl}

Si el botón no funciona, copia y pega este enlace en tu navegador:
${data.accessUrl}

Has recibido esta invitación porque solicitaste unirte a la lista de espera de Xpansive.

Xpansive ↗`;

  const html = `<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${subject}</title>
    <style>
      @media screen and (max-width: 620px) {
        .email-canvas { padding: 16px 10px !important; }
        .email-shell__header, .email-shell__main, .email-shell__footer { padding-left: 22px !important; padding-right: 22px !important; }
        .email-shell__main { padding-top: 38px !important; padding-bottom: 42px !important; }
        .email-title { font-size: 32px !important; line-height: 1.08 !important; letter-spacing: -1.4px !important; }
        .email-copy { font-size: 15px !important; }
        .email-link { word-break: break-all !important; }
      }
    </style>
  </head>
  <body style="margin:0;padding:0;background:${BRAND.canvas};color:${BRAND.ink};font-family:Arial,Helvetica,sans-serif;-webkit-text-size-adjust:100%;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background:${BRAND.canvas};">
      <tr>
        <td class="email-canvas" align="center" style="padding:28px 16px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:600px;background:${BRAND.paper};">
            <tr>
              <td style="height:4px;background:${BRAND.accent};font-size:0;line-height:0;">&nbsp;</td>
            </tr>
            <tr>
              <td class="email-shell__header" style="padding:25px 34px 23px;border-bottom:1px solid ${BRAND.line};">
                <p style="margin:0;color:${BRAND.ink};font-size:14px;font-weight:800;letter-spacing:4px;line-height:1;">XPANSIVE<span style="color:${BRAND.accent};"> ↗</span></p>
              </td>
            </tr>
            <tr>
              <td class="email-shell__main" style="padding:52px 34px 56px;">
                <p style="margin:0 0 17px;color:${BRAND.accent};font-size:11px;font-weight:700;letter-spacing:2.3px;line-height:1.2;text-transform:uppercase;">Beta privada</p>
                <h1 class="email-title" style="margin:0 0 24px;color:${BRAND.ink};font-size:42px;font-weight:500;line-height:1.04;letter-spacing:-2px;">Tu invitación está disponible.</h1>
                <p class="email-copy" style="max-width:490px;margin:0 0 17px;color:${BRAND.ink};font-size:16px;line-height:1.55;">Xpansive te ayuda a explorar ideas con IA, descubrir nuevas direcciones y construir un árbol de posibilidades, paso a paso.</p>
                <p class="email-copy" style="max-width:490px;margin:0 0 30px;color:${BRAND.muted};font-size:14px;line-height:1.6;">Para empezar, accede a la beta y conecta tu propia API key de un proveedor compatible. Xpansive no la guarda.</p>
                <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                  <tr>
                    <td style="background:${BRAND.accent};">
                      <a href="${accessUrl}" style="display:inline-block;padding:15px 21px;color:${BRAND.paper};font-size:12px;font-weight:700;line-height:1.2;letter-spacing:.3px;text-decoration:none;">Acceder a la beta&nbsp; →</a>
                    </td>
                  </tr>
                </table>
                <p style="max-width:490px;margin:28px 0 7px;color:${BRAND.muted};font-size:12px;line-height:1.5;">Si el botón no funciona, copia y pega este enlace en tu navegador:</p>
                <p style="max-width:490px;margin:0;font-size:12px;line-height:1.55;word-break:break-all;"><a class="email-link" href="${accessUrl}" style="color:${BRAND.ink};text-decoration:underline;text-decoration-thickness:1px;text-underline-offset:3px;">${accessUrl}</a></p>
              </td>
            </tr>
            <tr>
              <td class="email-shell__footer" style="padding:19px 34px 25px;border-top:1px solid ${BRAND.line};color:#687168;font-size:11px;line-height:1.65;">
                <p style="margin:0;">Has recibido esta invitación porque solicitaste unirte a la lista de espera de Xpansive.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return { subject, html, text };
}
