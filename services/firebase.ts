import firebase from "firebase/app";
import "firebase/auth";
import "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyARtUaBoJ-rtOuvxES6Hde5bCHcWoIAkAk",
  authDomain: "smartspent-43f3d.firebaseapp.com",
  projectId: "smartspent-43f3d",
  storageBucket: "smartspent-43f3d.firebasestorage.app",
  messagingSenderId: "166029346",
  appId: "1:166029346:web:4c1c6c0e3f0aacda7b827b",
  measurementId: "G-G9B1TKQ66J"
};

// Initialize Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

export const auth = firebase.auth();
export const db = firebase.firestore();
export const isInitialized = true;

export const signInWithGoogle = async () => {
  const provider = new firebase.auth.GoogleAuthProvider();
  try {
    const result = await auth.signInWithPopup(provider);
    return result.user;
  } catch (error: any) {
    console.error("Error signing in", error);
    if (error.code === 'auth/unauthorized-domain') {
       alert(`Authentication Error: Unauthorized Domain.\n\nPlease add the current domain to your Firebase Console:\n1. Go to console.firebase.google.com\n2. Open project "${firebaseConfig.projectId}"\n3. Go to Authentication > Settings > Authorized Domains\n4. Add the domain shown in your browser address bar.`);
    } else {
       alert(`Sign in failed: ${error.message}`);
    }
    throw error;
  }
};

export const logout = async () => {
  try {
    await auth.signOut();
  } catch (error) {
    console.error("Error signing out", error);
  }
};