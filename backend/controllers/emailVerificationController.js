// backend/controllers/emailVerificationController.js
import crypto from "crypto";
import { Resend } from "resend";
import User from "../models/User.js";
import { verificationEmailTemplate } from "../utils/emailTemplates.js";

/**
 * ENV REQUIRED
 *  - RESEND_API_KEY
 *  - RESEND_FROM              (e.g. no-reply@teesfromthepast.com)
 *  - APP_ORIGIN               (e.g. https://teesfromthepast.com)  — used to build links
 *  - EMAIL_VERIFY_TOKEN_TTL_MIN (optional, default 30)
 */

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM = process.env.RESEND_FROM;
const APP_ORIGIN = process.env.APP_ORIGIN || "http://localhost:5173";
const TTL_MIN = parseInt(process.env.EMAIL_VERIFY_TOKEN_TTL_MIN || "30", 10);

function nowPlusMinutes(min) {
  return new Date(Date.now() + min * 60 * 1000);
}
function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/**
 * Generate + persist a one-time token and send the email.
 * Exported so authController can call it right after registration.
 */
export async function queueSendVerificationEmail(email) {
  if (!email) return;
  if (!resend || !process.env.RESEND_API_KEY || !FROM) {
    console.warn("[verify] Resend not configured (missing RESEND_API_KEY / RESEND_FROM).");
    return;
  }

  // Create a new token (single-use)
  const raw = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashToken(raw);
  const expiresAt = nowPlusMinutes(TTL_MIN);

  // Persist (only if user exists; do not leak existence)
  const user = await User.findOneAndUpdate(
    { email: email.toLowerCase() },
    {
      $set: {
        emailVerification: {
          tokenHash,
          expiresAt,
          attempts: 0,
          lastSentAt: new Date(),
        },
      },
    },
    { new: true }
  );

  if (!user) return;

  // Build email
  const verifyUrl = `${APP_ORIGIN}/verify-email?token=${encodeURIComponent(
    raw
  )}&email=${encodeURIComponent(email)}`;
  const { html, text } = verificationEmailTemplate({ verifyUrl });

  // Send via Resend
  const { error } = await resend.emails.send({
    from: `Tees From The Past <${FROM}>`,
    to: email,
    subject: "Verify your email",
    html,
    text,
  });
  if (error) {
    console.error("[verify] Resend error:", error);
    // swallow to avoid user-enumeration/dos; caller can decide to warn
  }
}

/** POST /api/auth/send-verification  body:{email} */
export async function sendVerification(req, res) {
  try {
    const email = (req.body?.email || "").trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return res.status(400).json({ message: "Valid email required." });
    }

    const exists = await User.exists({ email });
    if (exists) {
      await queueSendVerificationEmail(email);
    }
    // uniform response prevents user enumeration
    return res.json({
      ok: true,
      message: "If an account exists, a verification email has been sent.",
    });
  } catch (e) {
    console.error("[verify] sendVerification failed:", e);
    return res
      .status(500)
      .json({ message: "Unable to send verification email." });
  }
}

/** POST /api/auth/verify-email  body:{email,token} */
export async function verifyEmail(req, res) {
  try {
    const email = (req.body?.email || "").trim().toLowerCase();
    const token = (req.body?.token || "").trim();

    if (!/^\S+@\S+\.\S+$/.test(email) || !token) {
      return res.status(400).json({ message: "Invalid request." });
    }

    const user = await User.findOne({ email });
    if (!user || !user.emailVerification) {
      return res.status(400).json({ message: "Invalid or expired token." });
    }

    const { tokenHash, expiresAt, attempts = 0 } = user.emailVerification;
    if (!tokenHash || !expiresAt || new Date(expiresAt) < new Date() || attempts >= 5) {
      return res.status(400).json({ message: "Invalid or expired token." });
    }

    const providedHash = hashToken(token);
    if (providedHash !== tokenHash) {
      await User.updateOne(
        { _id: user._id },
        { $inc: { "emailVerification.attempts": 1 } }
      );
      return res.status(400).json({ message: "Invalid or expired token." });
    }

    user.emailVerifiedAt = new Date();
    user.emailVerification = undefined;
    await user.save();

    return res.json({ ok: true, message: "Email verified." });
  } catch (e) {
    console.error("[verify] verifyEmail failed:", e);
    return res.status(500).json({ message: "Verification failed." });
  }
}

/** POST /api/auth/resend-verification  body:{email} */
export async function resendVerification(req, res) {
  return sendVerification(req, res);
}
