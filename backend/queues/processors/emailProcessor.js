// backend/queues/processors/emailProcessor.js
import { Resend } from 'resend';

let resend = null;

// Initialize Resend only if API key is available
if (process.env.RESEND_API_KEY) {
  resend = new Resend(process.env.RESEND_API_KEY);
}

export async function processEmailJob(job) {
  const { type, data } = job;
  
  console.log(`[EmailProcessor] Processing ${type} job:`, job.id);

  try {
    switch (type) {
      case 'welcome':
        return await sendWelcomeEmail(data);
      case 'contact-confirmation':
        return await sendContactConfirmation(data);
      case 'password-reset':
        return await sendPasswordResetEmail(data);
      case 'order-confirmation':
        return await sendOrderConfirmationEmail(data);
      default:
        throw new Error(`Unknown email type: ${type}`);
    }
  } catch (error) {
    console.error(`[EmailProcessor] Failed to process ${type} job ${job.id}:`, error.message);
    throw error;
  }
}

async function sendWelcomeEmail({ email, username }) {
  if (!resend) {
    console.log('[EmailProcessor] RESEND_API_KEY not configured, simulating welcome email');
    return { simulated: true, type: 'welcome', email };
  }

  const result = await resend.emails.send({
    from: 'noreply@teesfromthepast.com',
    to: email,
    subject: 'Welcome to Tees From The Past!',
    html: `
      <h1>Welcome, ${username}!</h1>
      <p>Thanks for joining Tees From The Past. We're excited to have you on board!</p>
      <p>Start creating amazing retro designs today.</p>
    `,
  });

  console.log(`[EmailProcessor] Welcome email sent to ${email}:`, result.id);
  return result;
}

async function sendContactConfirmation({ email, name }) {
  if (!resend) {
    console.log('[EmailProcessor] RESEND_API_KEY not configured, simulating contact confirmation');
    return { simulated: true, type: 'contact-confirmation', email };
  }

  const result = await resend.emails.send({
    from: 'noreply@teesfromthepast.com',
    to: email,
    subject: 'Thanks for contacting us!',
    html: `
      <h1>Hi ${name},</h1>
      <p>Thanks for reaching out to us. We've received your message and will get back to you soon.</p>
      <p>Best regards,<br>The Tees From The Past Team</p>
    `,
  });

  console.log(`[EmailProcessor] Contact confirmation sent to ${email}:`, result.id);
  return result;
}

async function sendPasswordResetEmail({ email, resetToken, resetUrl }) {
  if (!resend) {
    console.log('[EmailProcessor] RESEND_API_KEY not configured, simulating password reset email');
    return { simulated: true, type: 'password-reset', email };
  }

  const result = await resend.emails.send({
    from: 'noreply@teesfromthepast.com',
    to: email,
    subject: 'Password Reset Request',
    html: `
      <h1>Password Reset</h1>
      <p>You requested a password reset for your Tees From The Past account.</p>
      <p>Click the link below to reset your password:</p>
      <a href="${resetUrl}">Reset Password</a>
      <p>This link will expire in 1 hour.</p>
      <p>If you didn't request this, please ignore this email.</p>
    `,
  });

  console.log(`[EmailProcessor] Password reset email sent to ${email}:`, result.id);
  return result;
}

async function sendOrderConfirmationEmail({ email, orderId, items, total }) {
  if (!resend) {
    console.log('[EmailProcessor] RESEND_API_KEY not configured, simulating order confirmation');
    return { simulated: true, type: 'order-confirmation', email, orderId };
  }

  const itemsList = items.map(item => 
    `<li>${item.name} - ${item.quantity}x $${item.price}</li>`
  ).join('');

  const result = await resend.emails.send({
    from: 'noreply@teesfromthepast.com',
    to: email,
    subject: `Order Confirmation #${orderId}`,
    html: `
      <h1>Order Confirmed!</h1>
      <p>Thank you for your order. Here are the details:</p>
      <h2>Order #${orderId}</h2>
      <ul>${itemsList}</ul>
      <p><strong>Total: $${total}</strong></p>
      <p>We'll send you another email when your order ships.</p>
    `,
  });

  console.log(`[EmailProcessor] Order confirmation sent to ${email}:`, result.id);
  return result;
}