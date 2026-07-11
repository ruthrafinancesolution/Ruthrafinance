import crypto from "crypto";
import { initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { onCall, HttpsError } from "firebase-functions/v2/https";

initializeApp();

const db = getFirestore();
const OTP_EXPIRY_MS = 5 * 60 * 1000;
const OTP_RESEND_COOLDOWN_MS = 30 * 1000;
const OTP_MAX_ATTEMPTS = 5;
const OTP_PEPPER = process.env.OTP_PEPPER || "ruthra-financial-otp-v1";
const OTP_BRAND = "Ruthra Financial Solutions";

function normalizePhone(phone) {
  const digits = String(phone || "").replace(/\D/g, "").slice(-10);
  if (digits.length !== 10 || !/^[6-9]\d{9}$/.test(digits)) {
    throw new HttpsError("invalid-argument", "Enter a valid 10-digit Indian mobile number.");
  }
  return digits;
}

function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function hashOtp(otp, phone) {
  return crypto.createHash("sha256").update(`${phone}:${otp}:${OTP_PEPPER}`).digest("hex");
}

async function sendSms(phone, otp) {
  const apiKey = process.env.FAST2SMS_API_KEY;
  const message = `Dear Customer, your verification OTP is ${otp}. Valid for 5 minutes. - ${OTP_BRAND}`;

  if (!apiKey) {
    console.info(`[sendPhoneOtp] FAST2SMS_API_KEY not set — OTP for ${phone}: ${otp}`);
    return;
  }

  const response = await fetch("https://www.fast2sms.com/dev/bulkV2", {
    method: "POST",
    headers: {
      authorization: apiKey,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      route: "q",
      message,
      language: "english",
      numbers: phone,
    }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.return !== true) {
    console.error("[sendPhoneOtp] Fast2SMS error:", payload);
    throw new HttpsError("internal", payload.message || "Unable to send OTP SMS. Try again.");
  }
}

export const sendPhoneOtp = onCall({ region: "asia-south1", cors: true }, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "You must be signed in to send OTP.");
  }

  const phone = normalizePhone(request.data?.phone);
  const ref = db.doc(`phoneOtpSessions/${phone}`);
  const existing = await ref.get();

  if (existing.exists) {
    const sentAt = Number(existing.data()?.sentAt || 0);
    if (sentAt && Date.now() - sentAt < OTP_RESEND_COOLDOWN_MS) {
      throw new HttpsError("resource-exhausted", "Please wait before requesting another OTP.");
    }
  }

  const otp = generateOtp();
  await ref.set({
    otpHash: hashOtp(otp, phone),
    expiresAt: Date.now() + OTP_EXPIRY_MS,
    attempts: 0,
    sentAt: Date.now(),
    createdBy: request.auth.uid,
  });

  await sendSms(phone, otp);

  return {
    ok: true,
    expiresInSec: Math.floor(OTP_EXPIRY_MS / 1000),
    resendCooldownSec: Math.floor(OTP_RESEND_COOLDOWN_MS / 1000),
  };
});

export const verifyPhoneOtp = onCall({ region: "asia-south1", cors: true }, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "You must be signed in to verify OTP.");
  }

  const phone = normalizePhone(request.data?.phone);
  const input = String(request.data?.otp || "").replace(/\D/g, "");
  if (input.length !== 6) {
    throw new HttpsError("invalid-argument", "Enter the 6-digit OTP.");
  }

  const ref = db.doc(`phoneOtpSessions/${phone}`);
  const snap = await ref.get();
  if (!snap.exists) {
    throw new HttpsError("not-found", "No OTP found for this number. Request a new OTP.");
  }

  const data = snap.data();
  if (Date.now() > Number(data.expiresAt || 0)) {
    await ref.delete().catch(() => {});
    throw new HttpsError("deadline-exceeded", "OTP has expired. Request a new OTP.");
  }

  if (Number(data.attempts || 0) >= OTP_MAX_ATTEMPTS) {
    throw new HttpsError("resource-exhausted", "Maximum attempts reached. Request a new OTP.");
  }

  if (hashOtp(input, phone) !== data.otpHash) {
    await ref.update({ attempts: FieldValue.increment(1) });
    throw new HttpsError("invalid-argument", "Invalid OTP. Please try again.");
  }

  await ref.delete().catch(() => {});
  return { ok: true, verified: true };
});
