// backend/utils/emailTemplates.js

/**
 * Email Templates for Tees From The Past
 *
 * Each template returns { subject, text, html }.
 * Keep everything brand-consistent and Resend-ready.
 */

const BRAND_NAME = "Tees From The Past";
const BRAND_COLOR = "#111"; // your dark theme primary
const ACCENT_COLOR = "#ff6600"; // accent (orange/yellow)
const SUPPORT_EMAIL = "support@teesfromthepast.com";

/** Shared HTML wrapper */
function baseHtml({ title, body }) {
  return `
  <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;line-height:1.5;color:${BRAND_COLOR};max-width:600px;margin:0 auto;padding:24px">
    <h1 style="margin-bottom:16px;color:${BRAND_COLOR};">${title}</h1>
    <div style="margin-bottom:24px;">${body}</div>
    <hr style="margin:24px 0;border:none;border-top:1px solid #ddd"/>
    <p style="font-size:14px;color:#555;">You’re receiving this email because you have an account at <b>${BRAND_NAME}</b>.</p>
    <p style="font-size:14px;color:#555;">If you didn’t request this, you can safely ignore this message. For help, contact us at <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a>.</p>
  </div>
  `;
}

/** Email verification */
export function verificationEmailTemplate({ verifyUrl }) {
  const subject = `${BRAND_NAME} — Verify your email address`;
  const text = `Welcome to ${BRAND_NAME}!\n\nClick the link below to verify your email:\n${verifyUrl}\n\nThis link will expire soon.`;
  const body = `
    <p>Thanks for signing up! Please confirm your email address by clicking the button below:</p>
    <p style="margin:24px 0;">
      <a href="${verifyUrl}" style="display:inline-block;background:${ACCENT_COLOR};color:#fff;padding:12px 20px;border-radius:6px;text-decoration:none;font-weight:600;">
        Verify Email
      </a>
    </p>
    <p>If the button doesn’t work, copy and paste this link into your browser:</p>
    <p><a href="${verifyUrl}">${verifyUrl}</a></p>
  `;
  const html = baseHtml({ title: "Verify your email", body });
  return { subject, text, html };
}

/** Password reset */
export function passwordResetTemplate({ resetUrl, ttlMin }) {
  const subject = `${BRAND_NAME} — Reset your password`;
  const text = `We received a request to reset your password.\n\nReset link (valid ${ttlMin} minutes):\n${resetUrl}\n\nIf you didn’t request this, you can ignore this email.`;
  const body = `
    <p>We received a request to reset your password. If you made this request, click below to choose a new password:</p>
    <p style="margin:24px 0;">
      <a href="${resetUrl}" style="display:inline-block;background:${ACCENT_COLOR};color:#fff;padding:12px 20px;border-radius:6px;text-decoration:none;font-weight:600;">
        Reset Password
      </a>
    </p>
    <p>This link will expire in <b>${ttlMin} minutes</b>.</p>
    <p>If the button doesn’t work, copy and paste this link into your browser:</p>
    <p><a href="${resetUrl}">${resetUrl}</a></p>
  `;
  const html = baseHtml({ title: "Reset your password", body });
  return { subject, text, html };
}

/** Password changed confirmation */
export function passwordChangedTemplate() {
  const subject = `${BRAND_NAME} — Your password was changed`;
  const text = `This is a confirmation that your password was changed. If this wasn’t you, please contact support immediately at ${SUPPORT_EMAIL}.`;
  const body = `
    <p>This is a confirmation that your password was changed.</p>
    <p>If this wasn’t you, <b>please contact support immediately</b> at <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a>.</p>
  `;
  const html = baseHtml({ title: "Password changed", body });
  return { subject, text, html };
}
