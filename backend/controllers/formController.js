// backend/controllers/formController.js
import sgMail from '@sendgrid/mail';

// Env required:
// - SENDGRID_API_KEY
// - SENDGRID_FROM_EMAIL  (verified sender in SendGrid)
// - CONTACT_FORM_RECEIVER_EMAIL  (destination inbox)

const API_KEY = process.env.SENDGRID_API_KEY || '';
const FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || '';
const TO_EMAIL = process.env.CONTACT_FORM_RECEIVER_EMAIL || '';

if (API_KEY) {
  sgMail.setApiKey(API_KEY);
  console.log('[Form Ctrl] SendGrid configured.');
} else {
  console.error('[Form Ctrl] CRITICAL: SENDGRID_API_KEY not set.');
}

const sanitize = (s = '') => String(s).replace(/[\r\n]/g, ' ').trim();

export async function handleContactForm(req, res) {
  try {
    const { name, email, reason, message } = req.body || {};

    const n = sanitize(name);
    const e = sanitize(email);
    const r = sanitize(reason);
    const m = (message || '').toString().trim();

    // Validation
    if (!n || !e || !r || !m) {
      return res.status(400).json({ message: 'All fields (name, email, reason, message) are required.' });
    }
    if (!/^\S+@\S+\.\S+$/.test(e)) {
      return res.status(400).json({ message: 'Invalid email address format.' });
    }
    if (m.length < 10) {
      return res.status(400).json({ message: 'Message should be at least 10 characters long.' });
    }

    // Config checks
    if (!FROM_EMAIL || !TO_EMAIL) {
      console.error('[Form Ctrl] Missing FROM/TO env', { hasFrom: !!FROM_EMAIL, hasTo: !!TO_EMAIL });
      return res.status(500).json({ message: 'Email service is not configured.' });
    }

    const subject = `New Contact: ${r} — ${n}`;
    const html = `
      <h2>New Contact Form Submission</h2>
      <p><strong>Name:</strong> ${n}</p>
      <p><strong>Email:</strong> ${e}</p>
      <p><strong>Reason:</strong> ${r}</p>
      <p><strong>Message:</strong></p>
      <pre style="white-space:pre-wrap;">${m}</pre>
      <hr/>
      <small>IP: ${req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'n/a'}</small>
    `;

    const msg = {
      to: TO_EMAIL,
      from: { email: FROM_EMAIL, name: 'TeesFromThePast Contact Form' },
      replyTo: e,
      subject,
      text: `Name: ${n}\nEmail: ${e}\nReason: ${r}\n\n${m}`,
      html,
    };

    await sgMail.send(msg);
    return res.json({ ok: true, message: 'Thank you! Your message was sent.' });
  } catch (err) {
    console.error('[Form Ctrl] Send failed:', err?.response?.body || err?.message || err);
    return res.status(500).json({ message: 'Sorry, we could not send your message right now.' });
  }
}
