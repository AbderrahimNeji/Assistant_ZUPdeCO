/** Placeholders: {{dateDuJour}} */
export const VSC_DAILY_REPORT_SUBJECT =
  'Votre rapport VSC est disponible – Merci de le compléter';

/** HTML fragment (wrapped by {@link wrapZupdecoEmailHtml}). Placeholders: {{dateDuJour}} */
export const VSC_DAILY_REPORT_BODY = `<p style="margin:0 0 16px 0;font-size:16px;line-height:1.6;color:#1e293b;">Bonjour,</p>
<p style="margin:0 0 16px 0;font-size:16px;line-height:1.6;color:#1e293b;">Suite à votre première séance du <strong style="color:#0f172a;">{{dateDuJour}}</strong>, votre <strong>rapport VSC</strong> est désormais disponible sur la plateforme.</p>
<p style="margin:0 0 16px 0;font-size:16px;line-height:1.6;color:#1e293b;">Nous vous invitons à le compléter dès que possible afin de partager votre retour sur la journée.</p>
<p style="margin:0 0 8px 0;font-size:16px;line-height:1.6;color:#1e293b;font-weight:600;">Ce rapport comprend :</p>
<ul style="margin:0 0 16px 0;padding-left:22px;font-size:16px;line-height:1.65;color:#334155;">
<li style="margin-bottom:8px;">Une appréciation globale de votre séance (notation par étoiles)</li>
<li style="margin-bottom:0;">Un champ de saisie libre pour détailler votre retour</li>
</ul>
<p style="margin:0 0 16px 0;font-size:16px;line-height:1.6;color:#1e293b;">Nous vous remercions pour votre implication et votre contribution à la qualité des accompagnements.</p>
<p style="margin:0 0 16px 0;font-size:16px;line-height:1.6;color:#1e293b;">En cas de difficulté, n'hésitez pas à contacter votre coordinateur.</p>
<p style="margin:0 0 8px 0;font-size:16px;line-height:1.6;color:#1e293b;">Merci et à bientôt</p>
<p style="margin:0;font-size:16px;line-height:1.6;color:#0f172a;font-weight:600;">L'équipe Zupdeco</p>`;

/** Placeholders: {{sessionDateTime}}, {{studentNames}} */
export const SESSION_REPORT_REMINDER_24H_SUBJECT = 'Compte rendu de séance à compléter !';

export const SESSION_REPORT_REMINDER_24H_BODY = `<p style="margin:0 0 16px 0;font-size:16px;line-height:1.6;color:#1e293b;">Bonjour,</p>
<p style="margin:0 0 16px 0;font-size:16px;line-height:1.6;color:#1e293b;">Tout d'abord, un grand merci pour le temps, l'énergie et l'engagement que vous consacrez aux élèves lors de vos séances. Votre implication est précieuse et contribue réellement à leur accompagnement et à leur progression.</p>
<p style="margin:0 0 16px 0;font-size:16px;line-height:1.6;color:#1e293b;">Nous nous permettons simplement de vous rappeler que le compte rendu de votre séance du <strong>{{sessionDateTime}}</strong>, avec les élèves <strong>{{studentNames}}</strong> n'a pas encore été renseigné dans votre espace.</p>
<p style="margin:0 0 16px 0;font-size:16px;line-height:1.6;color:#1e293b;">Lorsque vous aurez un moment, nous vous serions reconnaissants de bien vouloir le compléter. Ces retours sont très utiles pour les équipes de l'association et de l'établissement : ils permettent de mieux comprendre le suivi des élèves, d'assurer la continuité de l'accompagnement et de valoriser tout le travail réalisé sur le terrain.</p>
<p style="margin:0 0 16px 0;font-size:16px;line-height:1.6;color:#1e293b;">Merci encore pour votre investissement et également pour le temps consacré à la saisie de vos comptes rendus. Nous restons bien entendu à votre disposition en cas de besoin.</p>
<p style="margin:0 0 8px 0;font-size:16px;line-height:1.6;color:#1e293b;">Merci et à très bientôt ✨</p>
<p style="margin:0;font-size:16px;line-height:1.6;color:#0f172a;font-weight:600;">L'équipe ZUPdeCO</p>`;

export const SESSION_REPORT_REMINDER_96H_SUBJECT = 'Relance - Compte rendu de séance à compléter !';

export const SESSION_REPORT_REMINDER_96H_BODY = `<p style="margin:0 0 16px 0;font-size:16px;line-height:1.6;color:#1e293b;">Bonjour,</p>
<p style="margin:0 0 16px 0;font-size:16px;line-height:1.6;color:#1e293b;">Nous espérons que vous allez bien et nous tenons une nouvelle fois à vous remercier sincèrement pour votre engagement auprès des élèves. Le temps et l'attention que vous leur accordez sont précieux et font une réelle différence dans leur parcours.</p>
<p style="margin:0 0 16px 0;font-size:16px;line-height:1.6;color:#1e293b;">Nous revenons vers vous concernant le compte rendu de votre séance du <strong>{{sessionDateTime}}</strong>, avec les élèves <strong>{{studentNames}}</strong>, qui ne semble pas encore avoir été renseigné dans votre espace.</p>
<p style="margin:0 0 16px 0;font-size:16px;line-height:1.6;color:#1e293b;">Lorsque vous en aurez la possibilité, pourriez-vous prendre quelques minutes pour le compléter ?</p>
<p style="margin:0 0 16px 0;font-size:16px;line-height:1.6;color:#1e293b;">Ces informations sont très importantes pour les équipes de l'association et de l'établissement, afin d'assurer un suivi cohérent des élèves et de mieux valoriser l'ensemble des actions menées grâce à votre investissement.</p>
<p style="margin:0 0 16px 0;font-size:16px;line-height:1.6;color:#1e293b;">Nous savons que cela demande un peu de temps supplémentaire, et nous vous remercions sincèrement pour votre aide et votre réactivité.</p>
<p style="margin:0 0 16px 0;font-size:16px;line-height:1.6;color:#1e293b;">Si vous rencontrez la moindre difficulté ou si vous avez besoin d'un accompagnement pour la saisie, nous restons bien entendu à votre disposition.</p>
<p style="margin:0 0 8px 0;font-size:16px;line-height:1.6;color:#1e293b;">Encore merci pour votre engagement et à très bientôt ✨</p>
<p style="margin:0;font-size:16px;line-height:1.6;color:#0f172a;font-weight:600;">L'équipe ZUPdeCO</p>`;

/** Placeholders: none */
export const ACCOUNT_ACTIVATION_SUBJECT = 'Activez votre compte ZUPdeCO';

/**
 * Placeholders: {{greetingLine}}, {{activationLink}}, {{validityLabel}}, {{referentLine}}
 * Note: {{activationLink}} is injected twice (button href + visible fallback URL).
 */
export const ACCOUNT_ACTIVATION_BODY = `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">Activez votre compte ZUPdeCO en quelques clics — lien valable {{validityLabel}}.</div>
<p style="margin:0 0 16px 0;font-size:16px;line-height:1.6;color:#1e293b;">{{greetingLine}}</p>
<p style="margin:0 0 16px 0;font-size:16px;line-height:1.6;color:#1e293b;">Bienvenue sur <strong>ZUPdeCO</strong> ! Un compte a été créé pour vous. Pour accéder à la plateforme, activez votre compte et choisissez un mot de passe sécurisé.</p>
<p style="margin:0 0 8px 0;font-size:16px;line-height:1.6;color:#1e293b;font-weight:600;">Comment activer votre compte ?</p>
<ol style="margin:0 0 20px 0;padding-left:22px;font-size:16px;line-height:1.65;color:#334155;">
<li style="margin-bottom:8px;">Cliquez sur le bouton ci-dessous</li>
<li style="margin-bottom:8px;">Définissez votre mot de passe</li>
<li style="margin-bottom:0;">Connectez-vous à votre espace</li>
</ol>
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 24px auto;">
<tr>
<td align="center" style="border-radius:8px;background:#f97316;">
<a href="{{activationLink}}" target="_blank" style="display:inline-block;padding:14px 32px;font-size:16px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;">Activer mon compte</a>
</td>
</tr>
</table>
<p style="margin:0 0 16px 0;font-size:14px;line-height:1.6;color:#64748b;">Si le bouton ne fonctionne pas, copiez-collez ce lien dans votre navigateur :<br><span style="color:#0f172a;word-break:break-all;">{{activationLink}}</span></p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px 0;background:#fff7ed;border-left:4px solid #f97316;border-radius:4px;">
<tr>
<td style="padding:14px 16px;">
<p style="margin:0 0 6px 0;font-size:15px;line-height:1.6;color:#9a3412;"><strong>Ce lien est valable {{validityLabel}}.</strong></p>
<p style="margin:0;font-size:14px;line-height:1.6;color:#7c2d12;">Passé ce délai, {{referentLine}}</p>
</td>
</tr>
</table>
<p style="margin:0 0 16px 0;font-size:16px;line-height:1.6;color:#1e293b;">Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet e-mail en toute sécurité.</p>
<p style="margin:0 0 8px 0;font-size:16px;line-height:1.6;color:#1e293b;">À très bientôt,</p>
<p style="margin:0;font-size:16px;line-height:1.6;color:#0f172a;font-weight:600;">L'équipe ZUPdeCO</p>`;

export function renderMailTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) =>
    vars[key] !== undefined ? vars[key] : `{{${key}}}`,
  );
}

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Dynamic values are escaped for safe insertion into HTML. */
export function renderMailTemplateHtml(template: string, vars: Record<string, string>): string {
  const escaped: Record<string, string> = {};
  for (const [k, v] of Object.entries(vars)) {
    escaped[k] = escapeHtml(v);
  }
  return renderMailTemplate(template, escaped);
}

/**
 * Wraps inner HTML in a responsive, mail-client–friendly shell (inline styles).
 */
export function wrapZupdecoEmailHtml(contentHtml: string, accentColor = '#1e40af'): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title></title>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;-webkit-font-smoothing:antialiased;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9;padding:24px 12px;">
<tr>
<td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(15,23,42,0.08);">
<tr>
<td style="height:4px;background:linear-gradient(90deg,${accentColor},#3b82f6);"></td>
</tr>
<tr>
<td style="padding:28px 28px 32px 28px;">
${contentHtml}
</td>
</tr>
</table>
</td>
</tr>
</table>
</body>
</html>`;
}
