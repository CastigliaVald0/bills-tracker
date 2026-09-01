import nodemailer from "nodemailer";

/**
 * Envío de mails por SMTP genérico, para no atarse a un proveedor: funciona igual
 * con Gmail, Brevo, Resend o cualquier otro. Se configura por variables de entorno.
 */

function getTransport() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT ?? 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;

  if (!host || !user || !pass) return null;

  return nodemailer.createTransport({
    host,
    port,
    // 465 es SMTP sobre TLS implícito; el resto (587, 1025) usa STARTTLS.
    secure: port === 465,
    auth: { user, pass },
  });
}

export function isMailerConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD);
}

export async function sendMail({
  to,
  subject,
  text,
  html,
}: {
  to: string;
  subject: string;
  text: string;
  html: string;
}): Promise<boolean> {
  const transport = getTransport();
  if (!transport) {
    console.error("[mailer] SMTP sin configurar: no se envió el mail a", to);
    return false;
  }

  try {
    await transport.sendMail({
      from: process.env.SMTP_FROM ?? process.env.SMTP_USER!,
      to,
      subject,
      text,
      html,
    });
    return true;
  } catch (error) {
    console.error("[mailer] falló el envío:", error);
    return false;
  }
}

export function passwordResetEmail(resetUrl: string, expiresInMinutes: number) {
  const text = [
    "Pediste restablecer tu contraseña en Billions Tracker.",
    "",
    `Entrá acá para elegir una nueva: ${resetUrl}`,
    "",
    `El link vence en ${expiresInMinutes} minutos y se puede usar una sola vez.`,
    "Si no fuiste vos, ignorá este mail: tu contraseña no cambia.",
  ].join("\n");

  const html = `
    <div style="font-family: system-ui, -apple-system, 'Segoe UI', sans-serif; font-size: 15px; color: #1a1a1a; line-height: 1.6;">
      <p>Pediste restablecer tu contraseña en <strong>Billions Tracker</strong>.</p>
      <p>
        <a href="${resetUrl}" style="display: inline-block; background: #1a1a1a; color: #fff; padding: 10px 18px; border-radius: 4px; text-decoration: none;">
          Elegir una nueva contraseña
        </a>
      </p>
      <p style="color: #666; font-size: 13px;">
        El link vence en ${expiresInMinutes} minutos y se puede usar una sola vez.<br>
        Si no fuiste vos, ignorá este mail: tu contraseña no cambia.
      </p>
      <p style="color: #999; font-size: 12px; word-break: break-all;">Si el botón no funciona, copiá esta dirección: ${resetUrl}</p>
    </div>
  `;

  return { text, html };
}
