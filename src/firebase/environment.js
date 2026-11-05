/** Live production Firebase project — deployed hosting must use this. */
export const PRODUCTION_FIREBASE_PROJECT_ID = "ruthrafinancesolutions";

/**
 * Project id used only by the local emulator suite.
 * It is not the live Firebase project, so a misrouted client cannot address production data.
 */
export const LOCAL_EMULATOR_PROJECT_ID = "demo-ruthra-local";

export const LOCAL_EMULATOR_PORTS = {
  host: "127.0.0.1",
  auth: 9099,
  firestore: 8080,
  storage: 9199,
  functions: 5001,
  ui: 4000,
};

export function isUsingFirebaseEmulators() {
  // Production builds (vite build / deployed hosting) always use live Firebase.
  if (import.meta.env.PROD) {
    return false;
  }
  // npm run dev (and any other Vite dev server) is local-only. Never opt back into production.
  if (import.meta.env.DEV) {
    return true;
  }
  return import.meta.env.VITE_USE_FIREBASE_EMULATORS === "true";
}

export function getFirebaseProjectId() {
  if (isUsingFirebaseEmulators()) {
    return LOCAL_EMULATOR_PROJECT_ID;
  }
  return import.meta.env.VITE_FIREBASE_PROJECT_ID || PRODUCTION_FIREBASE_PROJECT_ID;
}

export function getEmulatorEndpoints() {
  const host = String(import.meta.env.VITE_FIREBASE_EMULATOR_HOST || LOCAL_EMULATOR_PORTS.host).trim() || LOCAL_EMULATOR_PORTS.host;
  if (host !== "127.0.0.1" && host !== "localhost") {
    throw new Error(
      `Local mode only allows the Firebase emulators on 127.0.0.1 or localhost (received "${host}").`
    );
  }
  return {
    host: host === "localhost" ? "127.0.0.1" : host,
    authPort: LOCAL_EMULATOR_PORTS.auth,
    firestorePort: LOCAL_EMULATOR_PORTS.firestore,
    storagePort: LOCAL_EMULATOR_PORTS.storage,
    functionsPort: LOCAL_EMULATOR_PORTS.functions,
    uiPort: LOCAL_EMULATOR_PORTS.ui,
  };
}

export function isProductionFirebaseProject() {
  return getFirebaseProjectId() === PRODUCTION_FIREBASE_PROJECT_ID;
}

/** Auto-create demo admin/employee only on local emulators (never on live production). */
export function canRunDemoBootstrap() {
  if (isUsingFirebaseEmulators()) {
    return true;
  }
  return import.meta.env.VITE_ALLOW_DEMO_SEED === "true";
}

/** Seed / reset finance data — emulators only so localhost cannot wipe deployed data. */
export function canMutateFinanceTestData() {
  return isUsingFirebaseEmulators();
}

export function getFirebaseEnvironmentLabel() {
  if (isUsingFirebaseEmulators()) {
    return `Local emulator · ${getFirebaseProjectId()}`;
  }
  if (import.meta.env.PROD) {
    return `Production · ${getFirebaseProjectId()}`;
  }
  return `Development · ${getFirebaseProjectId()} (live Firebase — use emulators to isolate local testing)`;
}

export function assertLocalFirebaseEnvironment(actionLabel = "This action") {
  if (canMutateFinanceTestData()) {
    return;
  }
  throw new Error(
    `${actionLabel} is blocked because this build is not on the local Firebase Emulator. ` +
      "Production data was not changed. Start local testing with `npm run emulators`, then `npm run dev`."
  );
}
