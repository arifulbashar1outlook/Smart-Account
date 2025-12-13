import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut as firebaseSignOut, Auth } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";

const STORAGE_KEY_CONFIG = 'smartspend_firebase_config';

export const getStoredFirebaseConfig = () => {
  const stored = localStorage.getItem(STORAGE_KEY_CONFIG);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch(e) { console.error("Invalid stored config"); }
  }
  
  // Fallback to env vars
  const envConfig = {
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    projectId: process.env.FIREBASE_PROJECT_ID,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.FIREBASE_APP_ID,
  };
  
  // Check if env config is valid (at least apiKey)
  if (envConfig.apiKey && envConfig.apiKey !== "" && envConfig.apiKey !== "undefined") {
      return envConfig;
  }
  return null;
};

export const saveFirebaseConfig = (config: any) => {
  localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(config));
};

let app: FirebaseApp | undefined;
let auth: Auth | undefined;
let db: Firestore | undefined;
let isInitialized = false;

export const initFirebase = () => {
    const config = getStoredFirebaseConfig();
    if (!config) return false;

    try {
        if (!getApps().length) {
            app = initializeApp(config);
        } else {
            app = getApp(); 
        }
        auth = getAuth(app);
        db = getFirestore(app);
        isInitialized = true;
        return true;
    } catch (e) {
        console.error("Firebase init error", e);
        return false;
    }
}

// Attempt initialize immediately
initFirebase();

export { auth, db, isInitialized };

export const signInWithGoogle = async () => {
  if (!auth) {
    // Try one last time to init just in case
    if (!initFirebase()) {
        alert("Firebase is not configured. Please click the settings icon and add your Firebase Config.");
        throw new Error("Firebase not initialized");
    }
  }
  // If still no auth, it failed
  if (!auth) throw new Error("Firebase Auth not available");

  const provider = new GoogleAuthProvider();
  try {
    const result = await signInWithPopup(auth, provider);
    return result.user;
  } catch (error) {
    console.error("Error signing in", error);
    throw error;
  }
};

export const logout = async () => {
  if (!auth) return;
  try {
    await firebaseSignOut(auth);
  } catch (error) {
    console.error("Error signing out", error);
  }
};