import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAUWq4PmCJUmAvcq9x94SMt3mIVxZ_6ML4",
  authDomain: "al-hakimi-ai.firebaseapp.com",
  projectId: "al-hakimi-ai",
  storageBucket: "al-hakimi-ai.firebasestorage.app",
  messagingSenderId: "288886378118",
  appId: "1:288886378118:web:d4aa3ba7bc8be0c6b50b07",
  measurementId: "G-3P55NRQSVN"
};

// Initialize Firebase
// Check if an app is already initialized to prevent Next.js SSR hydration errors
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

export { app, auth, db, googleProvider };
