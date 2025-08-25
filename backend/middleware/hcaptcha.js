// backend/middleware/hcaptcha.js
// Verifies hCaptcha tokens server-side. Fails closed.
export async function verifyHCaptcha(token) {
  const secret = process.env.HCAPTCHA_SECRET;
  if (!secret) throw new Error("HCAPTCHA_SECRET not set");
  if (!token) return { ok: false, reason: "missing" };

  // Node 18+ has global fetch; otherwise import('node-fetch')
  const res = await fetch("https://hcaptcha.com/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ secret, response: token }),
  });

  const data = await res.json().catch(() => ({}));
  return { ok: !!data.success, raw: data };
}

// Express middleware variant (use when you want to strictly require hcaptcha)
export function requireHCaptcha(field = "hcaptchaToken") {
  return async (req, res, next) => {
    try {
      const token = req.body?.[field];
      const out = await verifyHCaptcha(token);
      if (!out.ok) return res.status(400).json({ message: "Captcha failed", details: out.raw });
      next();
    } catch (e) {
      return res.status(500).json({ message: "Captcha verification error" });
    }
  };
}
