// backend/controllers/formController.js
import asyncHandler from 'express-async-handler';
import sgMail from '@sendgrid/mail';
import 'dotenv/config';

// API key should already be set globally from authController.js or your main app file.
// If not, or to be absolutely sure:
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  console.log('[Form Cfg] SendGrid API Key re-confirmed for forms controller.');
} else {
  console.error('[Form Cfg] CRITICAL: SENDGRID_API_KEY env variable not found for forms controller!');
}

// @desc    Handle contact form submission and send email
// @route   POST /api/forms/contact
// @access  Public
export const handleContactForm = asyncHandler(async (req, res) => {
  const { name, email, reason, message } = req.body;

  console.log('[Form Ctrl] Received contact form submission:', { name, email, reason, message });

  // Basic Validation
  if (!name || !email || !reason || !message) {
    res.status(400);
    throw new Error('All fields (name, email, reason, message) are required.');
  }
  if (!/\S+@\S+\.\S+/.test(email)) {
    res.status(400);
    throw new Error('Invalid email address format.');
  }
  if (message.length < 10) {
    res.status(400);
    throw new Error('Message should be at least 10 characters long.');
  }

  // Ensure required environment variables are set
  const siteOwnerEmail = process.env.CONTACT_FORM_RECEIVER_EMAIL; // e.g., contact@teesfromthepast.com
  const sendgridFromEmail = process.env.SENDGRID_FROM_EMAIL; // e.g., human_being@teesfromthepast.com or noreply@teesfromthepast.com

  if (!siteOwnerEmail || !sendgridFromEmail) {
    console.error('[Form Ctrl] CRITICAL: CONTACT_FORM_RECEIVER_EMAIL or SENDGRID_FROM_EMAIL is not set in environment variables.');
    res.status(500);
    throw new Error('Server configuration error for contact form.');
  }

  const emailSubject = `New Contact Form: ${reason} - From ${name}`;
  const emailBodyHtml = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
      <h2 style="color: #4E342E;">New Contact Form Submission</h2>
      <p>You have received a new message from your website's contact form:</p>
      <hr>
      <p><strong>Name:</strong> ${name}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Reason for Contact:</strong> ${reason}</p>
      <p><strong>Message:</strong></p>
      <p style="padding: 10px; border-left: 3px solid #FF7043; background-color: #f9f9f9;">
        ${message.replace(/\n/g, '<br>')}
      </p>
      <hr>
      <p>You can reply directly to this email if your email client respects the 'Reply-To' header, or use the email address provided above.</p>
    </div>
  `;
  const emailBodyText = `
    New Contact Form Submission:
    -------------------------------
    Name: ${name}
    Email: ${email}
    Reason for Contact: ${reason}
    Message:
    ${message}
    -------------------------------
    Reply to: ${email}
  `;

  const msg = {
    to: siteOwnerEmail, // Where you receive the contact form submissions
    from: {
        email: sendgridFromEmail, // Your verified SendGrid sender email
        name: 'TeesFromThePast Contact Form', // Optional: Name for the "from" field
    },
    replyTo: email, // IMPORTANT: So you can reply directly to the user who submitted the form
    subject: emailSubject,
    text: emailBodyText, // Plain text version
    html: emailBodyHtml, // HTML version
  };

  try {
    console.log(`[Form Ctrl] Attempting to send contact email to ${siteOwnerEmail} from ${sendgridFromEmail} (Reply-To: ${email})`);
    await sgMail.send(msg);
    console.log('[Form Ctrl] Contact form email sent successfully via SendGrid.');
    res.status(200).json({ message: 'Thank you for your message! We will get back to you soon.' });
  } catch (error) {
    console.error('[Form Ctrl] Error sending contact form email via SendGrid:', error);
    if (error.response && error.response.body && error.response.body.errors) {
      console.error('[Form Ctrl] SendGrid Error Body Details:', JSON.stringify(error.response.body.errors, null, 2));
    } else if (error.message) {
        console.error('[Form Ctrl] Error message:', error.message);
    }
    res.status(500);
    throw new Error('Sorry, there was an issue sending your message. Please try again later.');
  }
});
