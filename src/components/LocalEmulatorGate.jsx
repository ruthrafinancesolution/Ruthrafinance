import { useEffect, useState } from "react";
import { checkLocalEmulators, markLocalEmulatorsReady } from "../firebase/emulatorHealth";
import { getEmulatorEndpoints, isUsingFirebaseEmulators, LOCAL_EMULATOR_PROJECT_ID } from "../firebase/environment";

export default function LocalEmulatorGate({ children }) {
  const localMode = isUsingFirebaseEmulators();
  const [status, setStatus] = useState(localMode ? "checking" : "ready");
  const [failed, setFailed] = useState([]);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!localMode) {
      return undefined;
    }

    let cancelled = false;
    setStatus("checking");

    checkLocalEmulators().then((result) => {
      if (cancelled) return;
      if (result.ok) {
        markLocalEmulatorsReady();
        setFailed([]);
        setStatus("ready");
        return;
      }
      setFailed(result.failed || []);
      setStatus("blocked");
    });

    return () => {
      cancelled = true;
    };
  }, [attempt, localMode]);

  if (!localMode || status === "ready") {
    return children;
  }

  const endpoints = getEmulatorEndpoints();

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-10 text-slate-100">
      <div className="w-full max-w-xl rounded-3xl border border-amber-400/40 bg-slate-900 p-6 shadow-2xl">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-300">Local mode only</p>
        <h1 className="mt-2 text-2xl font-semibold text-white">
          {status === "checking" ? "Checking Firebase emulators" : "Firebase emulators are not running"}
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-300">
          This development session uses project <span className="font-semibold text-white">{LOCAL_EMULATOR_PROJECT_ID}</span> on{" "}
          {endpoints.host}. It will not read or write the live Ruthra Finance database.
        </p>
        {status === "blocked" ? (
          <>
            <ul className="mt-4 space-y-1 text-sm text-rose-200">
              {failed.map((item) => (
                <li key={item.name}>
                  {item.name} emulator is unreachable ({item.url})
                </li>
              ))}
            </ul>
            <div className="mt-4 rounded-2xl bg-slate-950 px-4 py-3 font-mono text-xs leading-6 text-emerald-200">
              <div>npm run emulators</div>
              <div>npm run dev</div>
            </div>
            <button
              type="button"
              onClick={() => setAttempt((value) => value + 1)}
              className="mt-5 rounded-xl bg-amber-400 px-4 py-2 text-sm font-semibold text-slate-950"
            >
              Check again
            </button>
          </>
        ) : (
          <p className="mt-4 text-sm text-slate-400">Waiting for Auth, Firestore, and Storage on localhost…</p>
        )}
      </div>
    </div>
  );
}
