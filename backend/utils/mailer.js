// backend/utils/mailer.js
import { Resend } from "resend";

/**
 * Env you need:
 *  - RESEND_API_KEY           (required)
 *  - MAIL_SENDER_EMAIL        (required, e.g. no-reply@teesfromthepast.com)
 *  - APP_ORIGIN               (recommended, e.g. https://teesfromthepast.com)
 */

const {
  RESEND_API_KEY,
  MAIL_SENDER_EMAIL,
  APP_ORIGIN = "https://teesfromthepast.onrender.com",
} = process.env;

if (!RESEND_API_KEY) {
  console.warn("[mailer] RESEND_API_KEY is missing — emails will fail.");
}
if (!MAIL_SENDER_EMAIL) {
  console.warn("[mailer] MAIL_SENDER_EMAIL is missing — emails will fail.");
}

const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

export async function sendEmail({ to, subject, html, text }) {
  if (!resend) {
    throw new Error("Resend not configured (missing RESEND_API_KEY).");
  }
  if (!MAIL_SENDER_EMAIL) {
    throw new Error("MAIL_SENDER_EMAIL is not set.");
  }
  if (!to) throw new Error("Missing 'to' address.");
  if (!subject) throw new Error("Missing 'subject'.");

  const payload = {
    from: MAIL_SENDER_EMAIL,
    to: Array.isArray(to) ? to : [to],
    subject,
    html: html || undefined,
    text: text || undefined,
  };

  const { error } = await resend.emails.send(payload);
  if (error) {
    throw new Error(`Resend error: ${error.message || String(error)}`);
  }
  return true;
}

/** Helpers to build standard auth emails */
export function buildVerifyEmail({ email, token }) {
  const verifyUrl = new URL("/verify-email", APP_ORIGIN);
  verifyUrl.searchParams.set("email", email);
  verifyUrl.searchParams.set("token", token);

  const subject = "Verify your email";
  const text = `Verify your email for Tees From The Past:\n\n${verifyUrl.toString()}\n\nIf you didn't create an account, you can ignore this email.`;
  const html = `
    <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;line-height:1.4">
      <h2>Verify your email</h2>
      <p>Thanks for signing up! Click the button below to verify your email.</p>
      <p>
        <a href="${verifyUrl.toString()}"
           style="display:inline-block;background:#111;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none">
           Verify Email
        </a>
      </p>
      <p>Or paste this link in your browser:<br/>
         <a href="${verifyUrl.toString()}">${verifyUrl.toString()}</a>
      </p>
    </div>
  `;
  return { subject, text, html };
}

export function buildResetEmail({ email, token }) {
  const resetUrl = new URL("/reset-password", APP_ORIGIN);
  resetUrl.searchParams.set("token", token);

  const subject = "Reset your password";
  const text = `You requested a password reset for Tees From The Past.\n\nReset link:\n${resetUrl.toString()}\n\nIf you didn't request this, you can ignore this email.`;
  const html = `
    <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;line-height:1.4">
      <h2>Reset your password</h2>
      <p>Click the button below to set a new password. This link may expire soon.</p>
      <p>
        <a href="${resetUrl.toString()}"
           style="display:inline-block;background:#111;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none">
           Reset Password
        </a>
      </p>
      <p>Or paste this link in your browser:<br/>
         <a href="${resetUrl.toString()}">${resetUrl.toString()}</a>
      </p>
    </div>
  `;
  return { subject, text, html };
}
