import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut as firebaseSignOut, Auth } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyARtUaBoJ-rtOuvxES6Hde5bCHcWoIAkAk",
  authDomain: "smartspent-43f3d.firebaseapp.com",
  projectId: "smartspent-43f3d",
  storageBucket: "smartspent-43f3d.firebasestorage.app",
  messagingSenderId: "166029346",
  appId: "1:166029346:web:4c1c6c0e3f0aacda7b827b",
  measurementId: "G-G9B1TKQ66J"
};

let app: FirebaseApp | undefined;
let auth: Auth | undefined;
let db: Firestore | undefined;
let isInitialized = false;

const CONFIG_STORAGE_KEY = 'smartspend_firebase_config';

export const getStoredFirebaseConfig = () => {
  try {
    const stored = localStorage.getItem(CONFIG_STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch (e) {
    console.error("Failed to load firebase config", e);
    return null;
  }
};

export const saveFirebaseConfig = (config: any) => {
  try {
    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config));
  } catch (e) {
    console.error("Failed to save firebase config", e);
  }
};

export const initFirebase = () => {
    try {
        const storedConfig = getStoredFirebaseConfig();
        const config = storedConfig || firebaseConfig;

        // Simple validation
        if (!config.apiKey) return false;

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
        alert("Firebase failed to initialize. Please check console.");
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