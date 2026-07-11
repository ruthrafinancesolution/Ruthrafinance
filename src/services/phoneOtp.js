import { connectFunctionsEmulator, getFunctions, httpsCallable } from "firebase/functions";
import app from "../firebase/config";
import { isUsingFirebaseEmulators } from "../firebase/environment";

export {
  OTP_EXPIRY_SEC,
  OTP_MAX_ATTEMPTS,
  OTP_RESEND_COOLDOWN_SEC,
  maskPhoneForDisplay,
} from "./phoneOtpDemo";

const functions = getFunctions(app, "asia-south1");
let emulatorConnected = false;

function connectFunctionsEmulatorIfNeeded() {
  if (emulatorConnected || !isUsingFirebaseEmulators() || typeof window === "undefined") {
    return;
  }
  const host = import.meta.env.VITE_FIREBASE_EMULATOR_HOST || "127.0.0.1";
  connectFunctionsEmulator(functions, host, 5001);
  emulatorConnected = true;
}

function mapCallableError(error) {
  const code = String(error?.code || "");
  const message = String(error?.message || "Unable to process OTP request.");
  if (code.includes("resource-exhausted")) return message;
  if (code.includes("deadline-exceeded")) return message;
  if (code.includes("invalid-argument")) return message;
  if (code.includes("not-found")) return message;
  if (code.includes("unauthenticated")) return "Sign in again to verify the mobile number.";
  if (code.includes("internal")) return message;
  return message.replace(/^FirebaseError:\s*/i, "");
}

/** Sends a 6-digit OTP SMS to the customer mobile (admin must be signed in). */
export async function sendPhoneOtp(phone) {
  connectFunctionsEmulatorIfNeeded();
  try {
    const callable = httpsCallable(functions, "sendPhoneOtp");
    const result = await callable({ phone });
    return result.data || { ok: true };
  } catch (error) {
    throw new Error(mapCallableError(error));
  }
}

/** Verifies the OTP entered by admin against the server session. */
export async function verifyPhoneOtp(phone, otp) {
  connectFunctionsEmulatorIfNeeded();
  try {
    const callable = httpsCallable(functions, "verifyPhoneOtp");
    const result = await callable({ phone, otp });
    return result.data || { ok: true, verified: true };
  } catch (error) {
    throw new Error(mapCallableError(error));
  }
}
