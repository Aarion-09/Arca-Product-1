// Email delivery.
//
// Critical behavioural fix over the previous build: a failure to send email
// NEVER destroys the account that was just created. Previously a missing SMTP
// credential threw a 503 and deleted the new user, so sign-up was completely
// broken until email worked. Here the account is always created and the member
// is told they can request another link.

import { escapeHtml } from "./security.mjs";
import { OPERATOR } from "./config.mjs";

let transporter = null;
let transporterFailed = false;

export const smtpConfigured = () =>
  Boolean(process.env.SMTP_USER && process.env.SMTP_PASS);

async function getTransporter() {
  if (transporter || transporterFailed) return transporter;
  if (!smtpConfigured()) return null;
  try {
    const nodemailer = await import("nodemailer");
    transporter = nodemailer.default.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: Number(process.env.SMTP_PORT || 465),
      secure: process.env.SMTP_SECURE !== "false",
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      pool: true,
      maxConnections: 2,
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
    });
    return transporter;
  } catch (error) {
    transporterFailed = true;
    console.error("[mail] transport unavailable:", error.message);
    return null;
  }
}

const shell = (heading, body, action) => `<!doctype html>
<html><body style="margin:0;padding:32px;background:#f6f6f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#141416">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table role="presentation" width="100%" style="max-width:540px;background:#fff;border-radius:18px;padding:36px;border:1px solid #e6e6e2">
<tr><td>
<p style="margin:0 0 26px;font-size:15px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#FF6B18">ARCA</p>
<h1 style="margin:0 0 14px;font-size:24px;line-height:1.25;font-weight:600">${heading}</h1>
<div style="margin:0 0 26px;font-size:15px;line-height:1.65;color:#4a4f5c">${body}</div>
${action}
<p style="margin:28px 0 0;padding-top:20px;border-top:1px solid #ededea;font-size:13px;line-height:1.6;color:#71767f">
If you did not expect this email you can safely ignore it. Questions: ${escapeHtml(OPERATOR.email)}
</p>
</td></tr></table></td></tr></table></body></html>`;

const button = (href, label) =>
  `<p style="margin:0"><a href="${href}" style="display:inline-block;background:#141416;color:#fff;text-decoration:none;padding:14px 26px;border-radius:999px;font-size:15px;font-weight:600">${label}</a></p>`;

/**
 * Attempts delivery. Always resolves — never throws at the caller — so that
 * account creation cannot be rolled back by a mail problem.
 * @returns {Promise<{sent: boolean, reason?: string}>}
 */
export async function deliver({ to, subject, text, html }) {
  const transport = await getTransporter();
  if (!transport) {
    // Development and mis-configured production both land here. The link goes
    // to the server log so local flows can be walked end to end.
    const link = (String(text).match(/https?:\/\/\S+/) || [])[0];
    console.warn(`[mail] SMTP not configured — not sent. to=${to} subject="${subject}"`);
    if (link) console.warn(`[mail] link: ${link}`);
    return { sent: false, reason: "smtp-not-configured" };
  }
  try {
    await transport.sendMail({
      from: process.env.MAIL_FROM || `ARCA <${process.env.SMTP_USER}>`,
      to,
      subject,
      text,
      html,
    });
    return { sent: true };
  } catch (error) {
    console.error(`[mail] send failed to=${to}:`, error.message);
    return { sent: false, reason: "send-failed" };
  }
}

export function verificationEmail(link) {
  return {
    subject: "Confirm your ARCA account",
    text: `Welcome to ARCA. Confirm your email within 24 hours: ${link}`,
    html: shell(
      "Confirm your email",
      "<p style='margin:0'>Welcome to ARCA. Confirm your address within 24 hours to activate your account and claim your place.</p>",
      button(link, "Confirm my email")
    ),
  };
}

export function resetEmail(link) {
  return {
    subject: "Reset your ARCA password",
    text: `Use this link within one hour to set a new ARCA password: ${link}`,
    html: shell(
      "Set a new password",
      "<p style='margin:0'>Use the button below within one hour to choose a new password. Every other session will be signed out.</p>",
      button(link, "Choose a new password")
    ),
  };
}

export function welcomeEmail(name, foundingNumber) {
  const place = foundingNumber
    ? `<p style="margin:14px 0 0">You are founding member <strong>#${foundingNumber}</strong>. Founding Pro stays with your account for life.</p>`
    : "";
  return {
    subject: "Welcome to ARCA",
    text: `Welcome to ARCA, ${name}. Your account is active.`,
    html: shell(
      `Welcome, ${escapeHtml(name)}`,
      `<p style="margin:0">Your account is active. The next step is a profile worth reading — it is what other members see first.</p>${place}`,
      ""
    ),
  };
}
