import { isUsingFirebaseEmulators } from "../firebase/environment";

/** Shown only while `npm run dev` is locked to the local Firebase Emulator. */
export default function DevEnvironmentBanner() {
  if (!isUsingFirebaseEmulators()) {
    return null;
  }

  return (
    <div
      className="shrink-0 border-b border-emerald-200 bg-emerald-50 px-3 py-2 text-center text-xs font-medium text-emerald-900"
      role="status"
    >
      Local Firebase Emulator — this session cannot read or write production data.
    </div>
  );
}
