import asyncHandler from 'express-async-handler';
// import sgMail from '@sendgrid/mail'; // Original line - REMOVED
import { createRequire } from 'module'; // NEW: Import createRequire
const require = createRequire(import.meta.url); // NEW: Create a require function for this module
const sgMail = require('@sendgrid/mail'); // NEW: Use require for sendgrid/mail

import 'dotenv/config';
import { validationResult } from 'express-validator';

if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
} else {
  console.error('[Form Cfg] WARNING: SENDGRID_API_KEY environment variable is not set! Email sending will fail.');
}

export const submitContactForm = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { name, email, subject, message } = req.body;

  if (!process.env.SENDGRID_API_KEY || !process.env.SENDGRID_FROM_EMAIL) {
    console.error('[Form Cfg] Server configuration error: SendGrid API Key or From Email not set.');
    res.status(500);
    throw new Error('Server configuration error for sending email.');
  }

  const msgToAdmin = {
    to: process.env.SENDGRID_FROM_EMAIL, // Send to your admin email
    from: {
      email: process.env.SENDGRID_FROM_EMAIL, // Your verified SendGrid sender
      name: 'Tees From The Past - Contact Form',
    },
    replyTo: email, // Set the user's email as reply-to
    subject: `Contact Form Submission: ${subject}`,
    html: `
      <p><strong>Name:</strong> ${name}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Subject:</strong> ${subject}</p>
      <p><strong>Message:</strong></p>
      <p>${message}</p>
    `,
  };

  const msgToUser = {
    to: email, // Send a confirmation to the user
    from: {
      email: process.env.SENDGRID_FROM_EMAIL, // Your verified SendGrid sender
      name: 'Tees From The Past',
    },
    subject: 'Thank You for Your Inquiry - Tees From The Past',
    html: `
      <p>Dear ${name},</p>
      <p>Thank you for reaching out to us. We have received your message regarding "${subject}" and will get back to you as soon as possible.</p>
      <p>Here is a copy of your message for your reference:</p>
      <hr/>
      <p><strong>Subject:</strong> ${subject}</p>
      <p><strong>Message:</strong></p>
      <p>${message}</p>
      <hr/>
      <p>Best regards,</p>
      <p>The Tees From The Past Team</p>
    `,
  };

  try {
    await sgMail.send(msgToAdmin);
    await sgMail.send(msgToUser);
    res.status(200).json({ message: 'Message sent successfully!' });
  } catch (error) {
    console.error('[Form Ctrl] SendGrid Error:', error.response?.body || error.message);
    res.status(500);
    throw new Error('Failed to send message. Please try again later.');
  }
});
