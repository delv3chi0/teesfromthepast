// backend/controllers/formController.js
import { Resend } from 'resend';

// Env vars expected:
// - RESEND_API_KEY  (your Resend API key)
// - RESEND_FROM     (verified sender, e.g., contact@teesfromthepast.com)
// - CONTACT_FORM_RECEIVER_EMAIL (your destination inbox)

const resendKey = process.env.RESEND_API_KEY || '';
const resend = resendKey ? new Resend(resendKey) : null;

const FROM = process.env.RESEND_FROM || '';
const TO = process.env.CONTACT_FORM_RECEIVER_EMAIL || '';

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

    if (!resend || !FROM || !TO) {
      console.error('[Contact] Missing config', { hasKey: !!resend, hasFrom: !!FROM, hasTo: !!TO });
      return res.status(503).json({ message: 'Email service is not configured.' });
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

    const { error } = await resend.emails.send({
      from: `Tees From The Past <${FROM}>`,
      to: TO,
      reply_to: e,
      subject,
      text: `Name: ${n}\nEmail: ${e}\nReason: ${r}\n\n${m}`,
      html,
    });

    if (error) {
      console.error('[Contact] Resend error:', error);
      const msg = (error.message || '').toLowerCase();
      if (msg.includes('verify')) {
        return res.status(412).json({ message: 'Email domain not verified yet. Try again later.' });
      }
      return res.status(500).json({ message: 'We could not send your message right now.' });
    }

    return res.json({ ok: true, message: 'Thank you! Your message was sent.' });
  } catch (err) {
    console.error('[Contact] Unexpected error:', err);
    return res.status(500).json({ message: 'We could not send your message right now.' });
  }
}
