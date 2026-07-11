/** Shared OTP UI constants (SMS delivery is handled by Cloud Functions). */

export const OTP_LENGTH = 6;
export const OTP_EXPIRY_SEC = 300;
export const OTP_RESEND_COOLDOWN_SEC = 30;
export const OTP_MAX_ATTEMPTS = 5;
export const OTP_BRAND = "Ruthra Financial Solutions";

/** @deprecated Use OTP_* exports */
export const DEMO_OTP_LENGTH = OTP_LENGTH;
/** @deprecated Use OTP_* exports */
export const DEMO_OTP_EXPIRY_SEC = OTP_EXPIRY_SEC;
/** @deprecated Use OTP_* exports */
export const DEMO_OTP_RESEND_COOLDOWN_SEC = OTP_RESEND_COOLDOWN_SEC;
/** @deprecated Use OTP_* exports */
export const DEMO_OTP_MAX_ATTEMPTS = OTP_MAX_ATTEMPTS;
/** @deprecated Use OTP_* exports */
export const DEMO_OTP_BRAND = OTP_BRAND;

export function maskPhoneForDisplay(digits) {
  const d = String(digits || "").replace(/\D/g, "").slice(-10);
  if (d.length < 4) return "••••••••••";
  return `******${d.slice(-4)}`;
}

