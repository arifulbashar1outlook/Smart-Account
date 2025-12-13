import firebase from "firebase/compat/app";
import "firebase/compat/auth";
import "firebase/compat/firestore";

const CONFIG_KEY = 'smartspend_firebase_config';

let auth: firebase.auth.Auth | undefined;
let db: firebase.firestore.Firestore | undefined;
let isInitialized = false;

// Helper to get config safely
export const getStoredFirebaseConfig = () => {
  try {
    const stored = localStorage.getItem(CONFIG_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch (e) {
    console.error("Failed to parse stored config", e);
    return null;
  }
};

export const saveFirebaseConfig = (config: any) => {
  if (!config) return;
  try {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
    // Reload to apply changes
    window.location.reload();
  } catch (e) {
    console.error("Failed to save config", e);
    alert("Failed to save configuration to local storage.");
  }
};

export const clearFirebaseConfig = () => {
    localStorage.removeItem(CONFIG_KEY);
    window.location.reload();
}

// Initialize Firebase safely
try {
    const config = getStoredFirebaseConfig();
    
    // Only initialize if we have a config and no apps are running
    if (config && !firebase.apps.length) {
        firebase.initializeApp(config);
    }
    
    // If initialized (either just now or previously), set exports
    if (firebase.apps.length) {
        auth = firebase.auth();
        db = firebase.firestore();
        isInitialized = true;
        console.log("Firebase initialized successfully");
    }
} catch (error) {
    console.error("Firebase initialization failed:", error);
    // If init fails, we might have bad config. 
    // We don't auto-clear here to let the user see the error or re-enter, 
    // but the app won't crash because we caught the error.
}

export { auth, db, isInitialized };

export const signInWithGoogle = async () => {
  if (!auth) {
      alert("Firebase is not connected. Please enter your configuration in Settings.");
      throw new Error("Firebase not initialized");
  }
  
  const provider = new firebase.auth.GoogleAuthProvider();
  try {
    const result = await auth.signInWithPopup(provider);
    return result.user;
  } catch (error: any) {
    console.error("Error signing in", error);
    if (error.code === 'auth/unauthorized-domain') {
        const config = getStoredFirebaseConfig();
        const projectId = config?.projectId || 'your-project-id';
        alert(`Authentication Error: Unauthorized Domain.\n\nPlease add the current domain to your Firebase Console:\n1. Go to console.firebase.google.com\n2. Open project "${projectId}"\n3. Go to Authentication > Settings > Authorized Domains\n4. Add the domain shown in your browser address bar.`);
    } else {
       alert(`Sign in failed: ${error.message}`);
    }
    throw error;
  }
};

export const logout = async () => {
  if (!auth) return;
  try {
    await auth.signOut();
  } catch (error) {
    console.error("Error signing out", error);
  }
};