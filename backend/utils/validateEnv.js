const REQUIRED = [
  "MONGO_URI",
  "JWT_SECRET",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "HCAPTCHA_SECRET",
  "RESEND_API_KEY", // Currently required as it's instantiated at module level
];

const OPTIONAL = [
  "CLOUDINARY_URL",
  "RESEND_FROM",
  "APP_ORIGIN",
];

export function validateEnv() {
  const missing = REQUIRED.filter(k => !process.env[k] || String(process.env[k]).trim() === "");
  if (missing.length) {
    console.error("[env] Missing required environment variables:", missing.join(", "));
    throw new Error("Startup aborted due to missing env vars.");
  }

  const shortJwt = process.env.JWT_SECRET && process.env.JWT_SECRET.length < 24;
  if (shortJwt) {
    console.warn("[env] JWT_SECRET is short (<24 chars). Recommend >=32 random characters.");
  }

  const optionalMissing = OPTIONAL.filter(k => !process.env[k]);
  if (optionalMissing.length) {
    console.warn("[env] Optional variables not set:", optionalMissing.join(", "));
  }

  console.log("[env] OK:", REQUIRED.map(k => `${k}=✓`).join(" "));
}