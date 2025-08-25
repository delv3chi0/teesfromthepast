// backend/middleware/rateLimiters.js
// Progressive per-email/IP throttle helpers for auth endpoints.
import Throttle from "../models/Throttle.js";

const WINDOW_MS = 15 * 60 * 1000; // 15 min
const BASE = { emailFailCap: 5, ipFailCap: 20 };

export async function markAuthFail({ ip, email }) {
  const now = Date.now();

  // IP
  if (ip) {
    const t = await Throttle.findOneAndUpdate(
      { kind: "ip", key: ip },
      { $setOnInsert: { windowStart: new Date() }, $set: { lastSeen: new Date() }, $inc: { fails: 1 } },
      { new: true, upsert: true }
    );
    if (now - t.windowStart.getTime() > WINDOW_MS) {
      t.windowStart = new Date(); t.fails = 1;
    }
    if (t.fails >= BASE.ipFailCap && !t.lockedUntil) {
      t.lockedUntil = new Date(now + 10 * 60 * 1000); // 10 min lock
    }
    await t.save();
  }

  // Email
  if (email) {
    const key = String(email).trim().toLowerCase();
    const t = await Throttle.findOneAndUpdate(
      { kind: "email", key },
      { $setOnInsert: { windowStart: new Date() }, $set: { lastSeen: new Date() }, $inc: { fails: 1 } },
      { new: true, upsert: true }
    );
    if (now - t.windowStart.getTime() > WINDOW_MS) {
      t.windowStart = new Date(); t.fails = 1;
    }
    if (t.fails >= BASE.emailFailCap && !t.lockedUntil) {
      t.lockedUntil = new Date(now + 10 * 60 * 1000); // 10 min lock
    }
    await t.save();
  }
}

export async function clearAuthFails({ ip, email }) {
  if (ip) await Throttle.deleteOne({ kind: "ip", key: ip }).catch(()=>{});
  if (email) await Throttle.deleteOne({ kind: "email", key: String(email).toLowerCase() }).catch(()=>{});
}

export async function getCaptchaPolicy({ ip, email }) {
  // Show captcha when:
  // - IP had plenty of fails in window
  // - Email had ≥3 fails in window (stricter than lock)
  const now = Date.now();
  let need = false;

  const ipRec = ip ? await Throttle.findOne({ kind: "ip", key: ip }) : null;
  if (ipRec) {
    const inWindow = now - ipRec.windowStart.getTime() <= WINDOW_MS;
    if (ipRec.lockedUntil && ipRec.lockedUntil.getTime() > now) return { needCaptcha: true, locked: true, until: ipRec.lockedUntil };
    if (inWindow && ipRec.fails >= 5) need = true;
  }

  const emRec = email ? await Throttle.findOne({ kind: "email", key: String(email).toLowerCase() }) : null;
  if (emRec) {
    const inWindow = now - emRec.windowStart.getTime() <= WINDOW_MS;
    if (emRec.lockedUntil && emRec.lockedUntil.getTime() > now) return { needCaptcha: true, locked: true, until: emRec.lockedUntil };
    if (inWindow && emRec.fails >= 3) need = true;
  }

  return { needCaptcha: need, locked: false };
}
