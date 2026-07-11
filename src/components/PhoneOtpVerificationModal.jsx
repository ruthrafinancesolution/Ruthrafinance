import { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle2, Loader2, MessageSquare, Phone, X } from "lucide-react";
import {
  OTP_EXPIRY_SEC,
  OTP_MAX_ATTEMPTS,
  OTP_RESEND_COOLDOWN_SEC,
  maskPhoneForDisplay,
} from "../services/phoneOtpDemo";
import { sendPhoneOtp, verifyPhoneOtp } from "../services/phoneOtp";

/**
 * OTP modal — sends SMS to customer mobile via Cloud Functions; admin enters the code.
 * Parent contract: isOpen, phone, onVerified(), onClose().
 */
export default function PhoneOtpVerificationModal({ isOpen, phone, onVerified, onClose }) {
  const [phase, setPhase] = useState("idle");
  const [otpInput, setOtpInput] = useState("");
  const [expiryLeft, setExpiryLeft] = useState(OTP_EXPIRY_SEC);
  const [resendLeft, setResendLeft] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [sendError, setSendError] = useState("");
  const [verifyError, setVerifyError] = useState("");
  const [shake, setShake] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const expiryTimerRef = useRef(null);
  const resendTimerRef = useRef(null);
  const sessionRef = useRef(0);

  const clearTimers = useCallback(() => {
    if (expiryTimerRef.current) clearInterval(expiryTimerRef.current);
    if (resendTimerRef.current) clearInterval(resendTimerRef.current);
    expiryTimerRef.current = null;
    resendTimerRef.current = null;
  }, []);

  const resetState = useCallback(() => {
    clearTimers();
    setPhase("idle");
    setOtpInput("");
    setExpiryLeft(OTP_EXPIRY_SEC);
    setResendLeft(0);
    setAttempts(0);
    setSendError("");
    setVerifyError("");
    setShake(false);
    setVerifying(false);
  }, [clearTimers]);

  const startExpiryCountdown = useCallback((seconds = OTP_EXPIRY_SEC) => {
    if (expiryTimerRef.current) clearInterval(expiryTimerRef.current);
    setExpiryLeft(seconds);
    expiryTimerRef.current = setInterval(() => {
      setExpiryLeft((s) => {
        if (s <= 1) {
          if (expiryTimerRef.current) clearInterval(expiryTimerRef.current);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  }, []);

  const startResendCooldown = useCallback((seconds = OTP_RESEND_COOLDOWN_SEC) => {
    if (resendTimerRef.current) clearInterval(resendTimerRef.current);
    setResendLeft(seconds);
    resendTimerRef.current = setInterval(() => {
      setResendLeft((s) => {
        if (s <= 1) {
          if (resendTimerRef.current) clearInterval(resendTimerRef.current);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  }, []);

  const dispatchOtp = useCallback(
    async (sessionId) => {
      setSendError("");
      setVerifyError("");
      setPhase("sending");

      try {
        const result = await sendPhoneOtp(phone);
        if (sessionRef.current !== sessionId) return;

        setAttempts(0);
        setOtpInput("");
        setPhase("enter");
        startExpiryCountdown(Number(result?.expiresInSec) || OTP_EXPIRY_SEC);
        startResendCooldown(Number(result?.resendCooldownSec) || OTP_RESEND_COOLDOWN_SEC);
      } catch (error) {
        if (sessionRef.current !== sessionId) return;
        setSendError(error.message || "Unable to send OTP.");
        setPhase("idle");
      }
    },
    [phone, startExpiryCountdown, startResendCooldown]
  );

  useEffect(() => {
    if (!isOpen) {
      resetState();
      return;
    }

    const clean = String(phone || "").replace(/\D/g, "");
    if (clean.length !== 10) {
      setSendError("Enter a valid 10-digit mobile number.");
      setPhase("idle");
      return;
    }

    const sessionId = ++sessionRef.current;
    void dispatchOtp(sessionId);

    return () => {
      sessionRef.current += 1;
      clearTimers();
    };
  }, [isOpen, phone, resetState, clearTimers, dispatchOtp]);

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 450);
  };

  const handleVerify = async () => {
    setVerifyError("");
    if (expiryLeft <= 0) {
      setVerifyError("OTP has expired. Tap Resend OTP.");
      triggerShake();
      return;
    }
    if (attempts >= OTP_MAX_ATTEMPTS) {
      setVerifyError(`Maximum attempts (${OTP_MAX_ATTEMPTS}) reached. Resend OTP to try again.`);
      triggerShake();
      return;
    }
    if (otpInput.replace(/\D/g, "").length !== 6) {
      setVerifyError("Enter the 6-digit OTP.");
      triggerShake();
      return;
    }

    setVerifying(true);
    try {
      await verifyPhoneOtp(phone, otpInput);
      clearTimers();
      setPhase("success");
      setTimeout(() => {
        onVerified?.();
        onClose?.();
      }, 1600);
    } catch (error) {
      setAttempts((a) => a + 1);
      setVerifyError(error.message || "Invalid OTP. Please try again.");
      triggerShake();
    } finally {
      setVerifying(false);
    }
  };

  const handleResend = async () => {
    if (resendLeft > 0) return;
    const sessionId = ++sessionRef.current;
    await dispatchOtp(sessionId);
  };

  if (!isOpen) return null;

  const masked = maskPhoneForDisplay(phone);

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="otp-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && phase !== "sending" && !verifying) onClose?.();
      }}
    >
      <div
        className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl ring-1 ring-slate-200/80"
        onClick={(e) => e.stopPropagation()}
      >
        {phase !== "success" ? (
          <button
            type="button"
            onClick={() => onClose?.()}
            disabled={phase === "sending" || verifying}
            className="absolute right-3 top-3 rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600 transition hover:bg-slate-50 disabled:opacity-40"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}

        <div className="mb-4 pr-10">
          <p id="otp-title" className="text-lg font-bold text-slate-900">
            Phone verification
          </p>
          <p className="text-[11px] text-slate-600">Secure your customer registration.</p>
        </div>

        <p className="mb-3 text-center text-sm font-medium text-slate-700">
          To: <span className="font-mono tracking-wide">{masked}</span>
        </p>

        {sendError ? <div className="mb-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-center text-xs text-rose-800">{sendError}</div> : null}

        {phase === "sending" ? (
          <div className="flex flex-col items-center gap-4 py-8">
            <div className="relative">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 to-blue-600 text-white shadow-lg">
                <Loader2 className="h-8 w-8 animate-spin" aria-hidden />
              </div>
              <Phone className="absolute -right-1 -bottom-1 h-7 w-7 rounded-lg border border-white bg-white p-1 text-teal-600 shadow" />
            </div>
            <p className="text-sm font-semibold text-slate-800">Sending OTP…</p>
            <p className="text-center text-[11px] text-slate-500">OTP will be sent to the customer mobile number.</p>
          </div>
        ) : null}

        {phase === "enter" ? (
          <div className="space-y-4">
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-3 shadow-inner">
              <div className="flex items-start gap-2">
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-teal-100 text-teal-700">
                  <MessageSquare className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-teal-800">OTP sent successfully</p>
                  <p className="mt-1 text-[11px] leading-relaxed text-slate-700">
                    Ask the customer for the OTP received on their mobile and enter it below.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-600">
              <span>
                Expires in:{" "}
                <strong className={expiryLeft <= 15 ? "text-rose-600" : "text-slate-900"}>{expiryLeft}s</strong>
              </span>
              <span>
                Attempts left:{" "}
                <strong className="text-slate-900">{Math.max(0, OTP_MAX_ATTEMPTS - attempts)}</strong>
              </span>
            </div>

            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-slate-700">Enter OTP</span>
              <input
                value={otpInput}
                onChange={(e) => {
                  setOtpInput(e.target.value.replace(/\D/g, "").slice(0, 6));
                  setVerifyError("");
                }}
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                className={`app-input w-full py-2.5 text-center font-mono text-lg tracking-[0.35em] transition ${shake ? "animate-otp-shake border-rose-400" : ""}`}
                placeholder="••••••"
              />
            </label>

            {verifyError ? <p className="text-center text-xs font-medium text-rose-600">{verifyError}</p> : null}

            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <button
                type="button"
                onClick={handleVerify}
                disabled={verifying}
                className="app-button-primary flex-1 px-4 py-2.5 text-xs font-semibold shadow-sm transition hover:shadow-md disabled:opacity-60"
              >
                {verifying ? "Verifying…" : "Verify OTP"}
              </button>
              <button
                type="button"
                onClick={handleResend}
                disabled={resendLeft > 0 || verifying}
                className="app-button-secondary flex-1 px-4 py-2.5 text-xs font-semibold transition hover:shadow-md disabled:opacity-45"
              >
                {resendLeft > 0 ? `Resend OTP (${resendLeft}s)` : "Resend OTP"}
              </button>
            </div>
          </div>
        ) : null}

        {phase === "success" ? (
          <div className="flex flex-col items-center gap-3 py-6">
            <div className="animate-otp-success-pop flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg ring-4 ring-emerald-200/80">
              <CheckCircle2 className="h-9 w-9" strokeWidth={2.5} />
            </div>
            <p className="text-center text-base font-bold text-emerald-800">Phone number verified successfully</p>
            <p className="text-center text-xs text-slate-600">You can continue filling the registration form.</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
