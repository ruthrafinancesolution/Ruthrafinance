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
import { getAnalytics } from "firebase/analytics";
import { getFirebaseProjectId, isUsingFirebaseEmulators } from "./environment";

/** Firebase project config — production values are defaults; override via VITE_FIREBASE_* in .env files. */
export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyC_-xmAXINRuv84MDYna8oiDhpbbz7nH6A",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "ruthrafinancesolutions.firebaseapp.com",
  projectId: getFirebaseProjectId(),
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "ruthrafinancesolutions.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "105217761369",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:105217761369:web:21ddf12087367cd9d75148",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-GJK3DPGCZW",
};

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

let emulatorsConnected = false;

function connectFirebaseEmulators() {
  if (import.meta.env.PROD || emulatorsConnected || !isUsingFirebaseEmulators() || typeof window === "undefined") {
    return;
  }

  const host = import.meta.env.VITE_FIREBASE_EMULATOR_HOST || "127.0.0.1";
  connectAuthEmulator(auth, `http://${host}:9099`, { disableWarnings: true });
  connectFirestoreEmulator(db, host, 8080);
  emulatorsConnected = true;

  if (import.meta.env.DEV) {
    console.info(
      `[firebase] Connected to local emulators (auth:9099, firestore:8080). Project id: ${firebaseConfig.projectId}. ` +
        "This data is separate from your deployed website."
    );
  }
}

connectFirebaseEmulators();

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
