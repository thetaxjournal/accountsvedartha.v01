import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Workaround for TypeScript error and runtime safety:
// Cast import.meta to any to access env, and default to empty object if undefined.
const env = (import.meta as any).env || {};

// Configuration handles both Vercel Environment Variables (Preferred) and Hardcoded Fallback (Instant Deploy)
const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || "AIzaSyASt7FZ1p8Ggfc2KQjsojIh6zl8fYzP9fo",
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || "vedarthainvoice.firebaseapp.com",
  databaseURL: env.VITE_FIREBASE_DB_URL || "https://vedarthainvoice-default-rtdb.firebaseio.com",
  projectId: env.VITE_FIREBASE_PROJECT_ID || "vedarthainvoice",
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || "vedarthainvoice.firebasestorage.app",
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || "616190681776",
  appId: env.VITE_FIREBASE_APP_ID || "1:616190681776:web:d90ac589d3187650d65175",
  measurementId: env.VITE_FIREBASE_MEASUREMENT_ID || "G-3FVXTX6HQB"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export default app;