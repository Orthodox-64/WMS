import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCFdbSFYfjh9UIvrfFJZr60U7OAZIUNU8I",
  authDomain: "goods-ab8b5.firebaseapp.com",
  projectId: "goods-ab8b5",
  storageBucket: "goods-ab8b5.firebasestorage.app",
  messagingSenderId: "1084647770453",
  appId: "1:1084647770453:web:53d5c957527728c6fd47dc"
};

// Initialize Firebase
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db, signInWithEmailAndPassword, signOut, onAuthStateChanged };
export type { User };