// backend/utils/emailTemplates.js
export function verificationEmailTemplate({ verifyUrl }) {
  const html = `
    <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto;">
      <h2>Verify your email</h2>
      <p>Thanks for creating an account at Tees From The Past.</p>
      <p>Click the button below to verify your email address:</p>
      <p>
        <a href="${verifyUrl}"
           style="display:inline-block;padding:12px 18px;background:#f59e0b;color:#000;
                  text-decoration:none;border-radius:8px;font-weight:600">
          Verify Email
        </a>
      </p>
      <p>Or open this link: <br/><a href="${verifyUrl}">${verifyUrl}</a></p>
      <p style="color:#6b7280;font-size:12px">If you didn’t sign up, ignore this email.</p>
    </div>`;
  const text = `Verify your email:\n\n${verifyUrl}\n\nIf you didn’t sign up, ignore this email.`;
  return { html, text };
}
