const required = [
  "DATABASE_URL",
  "AUTH_APP_URL",
  "EMAIL_PROVIDER",
  "RESEND_API_KEY",
  "AUTH_EMAIL_FROM",
  "RESEND_WEBHOOK_SECRET",
];

const missing = required.filter((name) => !process.env[name]?.trim());
const appUrl = process.env.AUTH_APP_URL?.trim();
const provider = process.env.EMAIL_PROVIDER?.trim().toLowerCase();

if (appUrl && !/^https:\/\//i.test(appUrl)) missing.push("AUTH_APP_URL(https)");
if (provider && provider !== "resend") missing.push("EMAIL_PROVIDER=resend");
if (missing.length) {
  console.error(`Missing or invalid production configuration: ${missing.join(", ")}`);
  process.exit(1);
}

console.log("Production environment configuration is present.");
