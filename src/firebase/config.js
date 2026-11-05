import { Capacitor } from "@capacitor/core";
import { initializeApp } from "firebase/app";
import {
  browserLocalPersistence,
  connectAuthEmulator,
  getAuth,
  indexedDBLocalPersistence,
  initializeAuth,
} from "firebase/auth";
import { connectFirestoreEmulator, getFirestore } from "firebase/firestore";
import { connectStorageEmulator, getStorage } from "firebase/storage";
import { getAnalytics } from "firebase/analytics";
import { assertLocalEmulatorsReady } from "./emulatorHealth";
import {
  getEmulatorEndpoints,
  getFirebaseProjectId,
  isUsingFirebaseEmulators,
  LOCAL_EMULATOR_PROJECT_ID,
  PRODUCTION_FIREBASE_PROJECT_ID,
} from "./environment";

const LOCAL_ONLY_FIREBASE_CONFIG = {
  apiKey: "local-emulator-only",
  authDomain: "localhost",
  projectId: LOCAL_EMULATOR_PROJECT_ID,
  storageBucket: "demo-ruthra-local.appspot.com",
  messagingSenderId: "000000000000",
  appId: "1:000000000000:web:localemulator",
};

/** Production web app config. Used only by production builds. */
const productionFirebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyC_-xmAXINRuv84MDYna8oiDhpbbz7nH6A",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "ruthrafinancesolutions.firebaseapp.com",
  projectId: getFirebaseProjectId(),
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "ruthrafinancesolutions.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "105217761369",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:105217761369:web:21ddf12087367cd9d75148",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-GJK3DPGCZW",
};

function createFirebaseConfig() {
  if (!isUsingFirebaseEmulators()) {
    return productionFirebaseConfig;
  }

  if (LOCAL_ONLY_FIREBASE_CONFIG.projectId === PRODUCTION_FIREBASE_PROJECT_ID) {
    throw new Error("Local mode refused to start with the production Firebase project id.");
  }
  if (String(LOCAL_ONLY_FIREBASE_CONFIG.apiKey).startsWith("AIza")) {
    throw new Error("Local mode refused to start with a production Firebase API key.");
  }
  return LOCAL_ONLY_FIREBASE_CONFIG;
}

export const firebaseConfig = createFirebaseConfig();

const app = initializeApp(firebaseConfig);

function createFirebaseAuth() {
  if (!Capacitor.isNativePlatform()) {
    return getAuth(app);
  }

  try {
    return initializeAuth(app, {
      persistence: [indexedDBLocalPersistence, browserLocalPersistence],
    });
  } catch (error) {
    const message = String(error?.message || error || "");
    if (message.includes("already exists")) {
      return getAuth(app);
    }
    throw error;
  }
}

export const auth = createFirebaseAuth();
export const db = getFirestore(app);
export const storage = getStorage(app);

let emulatorsConnected = false;

function connectFirebaseEmulators() {
  if (!isUsingFirebaseEmulators() || emulatorsConnected || typeof window === "undefined") {
    return;
  }

  const endpoints = getEmulatorEndpoints();
  connectAuthEmulator(auth, `http://${endpoints.host}:${endpoints.authPort}`, { disableWarnings: true });
  connectFirestoreEmulator(db, endpoints.host, endpoints.firestorePort);
  connectStorageEmulator(storage, endpoints.host, endpoints.storagePort);
  emulatorsConnected = true;

  console.info(
    `[firebase] Local emulators only (auth:${endpoints.authPort}, firestore:${endpoints.firestorePort}, storage:${endpoints.storagePort}, functions:${endpoints.functionsPort}). ` +
      `Project id: ${firebaseConfig.projectId}. Production project ${PRODUCTION_FIREBASE_PROJECT_ID} is not used.`
  );
}

connectFirebaseEmulators();

/**
 * Auth REST calls must follow the same target as the Auth SDK.
 * In local mode this is the Auth emulator. It never falls back to identitytoolkit.googleapis.com.
 */
export function identityToolkitUrl(method) {
  assertLocalEmulatorsReady();
  const key = firebaseConfig.apiKey;
  if (isUsingFirebaseEmulators()) {
    const endpoints = getEmulatorEndpoints();
    return `http://${endpoints.host}:${endpoints.authPort}/identitytoolkit.googleapis.com/v1/${method}?key=${key}`;
  }
  return `https://identitytoolkit.googleapis.com/v1/${method}?key=${key}`;
}

function initAnalytics() {
  if (typeof window === "undefined") {
    return null;
  }
  if (!firebaseConfig.measurementId || isUsingFirebaseEmulators()) {
    return null;
  }
  try {
    return getAnalytics(app);
  } catch {
    return null;
  }
}

export const analytics = initAnalytics();
export default app;
