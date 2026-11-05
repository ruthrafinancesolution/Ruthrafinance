import { getEmulatorEndpoints, isUsingFirebaseEmulators } from "./environment";

let localEmulatorsReady = !isUsingFirebaseEmulators();

export function markLocalEmulatorsReady() {
  localEmulatorsReady = true;
}

export function assertLocalEmulatorsReady() {
  if (!isUsingFirebaseEmulators()) {
    return;
  }
  if (localEmulatorsReady) {
    return;
  }
  const endpoints = getEmulatorEndpoints();
  throw new Error(
    `Local Firebase emulators are not running at ${endpoints.host}. ` +
      "Start them with `npm run emulators`. Local mode will not contact production Firebase."
  );
}

async function pingEmulator(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 2500);
  try {
    await fetch(url, { mode: "no-cors", cache: "no-store", signal: controller.signal });
    return true;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Confirms Auth, Firestore, and Storage emulators accept connections.
 * A failed check must stop the app. There is no production fallback.
 */
export async function checkLocalEmulators() {
  if (!isUsingFirebaseEmulators()) {
    return { ok: true, skipped: true, failed: [] };
  }

  const endpoints = getEmulatorEndpoints();
  const checks = [
    ["Authentication", `http://${endpoints.host}:${endpoints.authPort}/`],
    ["Firestore", `http://${endpoints.host}:${endpoints.firestorePort}/`],
    ["Storage", `http://${endpoints.host}:${endpoints.storagePort}/`],
  ];

  const results = await Promise.all(
    checks.map(async ([name, url]) => ({
      name,
      url,
      ok: await pingEmulator(url),
    }))
  );

  return {
    ok: results.every((item) => item.ok),
    skipped: false,
    failed: results.filter((item) => !item.ok),
    results,
  };
}
