import firebase from "firebase/compat/app";
import "firebase/compat/auth";
import "firebase/compat/firestore";
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';

// Changed key to v2 to force fresh start if v1 had corrupted data
const CONFIG_KEY = 'smartspend_firebase_config_v2';

let auth: firebase.auth.Auth | undefined;
let db: firebase.firestore.Firestore | undefined;
let isInitialized = false;

// Helper to get config safely
export const getStoredFirebaseConfig = () => {
  try {
    const stored = localStorage.getItem(CONFIG_KEY);
    if (!stored) return null;
    
    const parsed = JSON.parse(stored);
    // Basic validation to ensure it's a real config object
    if (parsed && typeof parsed === 'object' && parsed.apiKey) {
        return parsed;
    }
    return null;
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

    // Check if we're running in Capacitor (mobile app)
    const isCapacitor = !!(window as any).Capacitor;

    // Only initialize if we have a config and no apps are running
    if (config && !firebase.apps.length) {
        console.log("Initializing Firebase with stored config...");

        // For Capacitor apps, we might need to modify the config
        if (isCapacitor) {
            // Ensure we have the correct auth domain for Capacitor
            config.authDomain = config.authDomain || `${config.projectId}.firebaseapp.com`;
            console.log("Using auth domain for Capacitor:", config.authDomain);
        }

        firebase.initializeApp(config);
    }

    // If initialized (either just now or previously), set exports
    if (firebase.apps.length) {
        auth = firebase.auth();
        db = firebase.firestore();
        isInitialized = true;
        console.log("Firebase initialized successfully");

    if (isCapacitor) {
      // For Capacitor, configure auth for mobile
      if (auth) {
        // Set persistence to LOCAL for mobile apps
        auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);

        // Handle redirect result for mobile authentication
        auth.getRedirectResult().then((result) => {
            if (result.user) {
                console.log("User signed in via redirect:", result.user.displayName);
            }
        }).catch((error) => {
            console.error("Redirect result error:", error);
        });

        // Configure auth settings for Capacitor
        console.log("Configuring Firebase Auth for Capacitor...");
      }
    }
    } else {
        console.log("Firebase waiting for configuration...");
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

  try {
    // Check if we're running in Capacitor (mobile app)
    const isCapacitor = !!(window as any).Capacitor;

    if (isCapacitor) {
      // Use Capacitor Firebase Auth plugin for native mobile authentication
      console.log("Using Capacitor Firebase Auth plugin...");
      try {
        const result = await FirebaseAuthentication.signInWithGoogle();
        console.log("Capacitor auth successful:", result);
        return result.user;
      } catch (pluginError: any) {
        console.error("Capacitor Firebase Auth error:", pluginError);
        // If plugin fails, fall back to web redirect
        console.log("Falling back to web redirect authentication...");
        const provider = new firebase.auth.GoogleAuthProvider();
        provider.addScope('profile');
        provider.addScope('email');
        await auth.signInWithRedirect(provider);
        return null;
      }
    } else {
      // Use web SDK popup for browsers
      const provider = new firebase.auth.GoogleAuthProvider();
      const result = await auth.signInWithPopup(provider);
      return result.user;
    }
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