import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCFdbSFYfjh9UIvrfFJZr60U7OAZIUNU8I",
  authDomain: "goods-ab8b5.firebaseapp.com",
  projectId: "goods-ab8b5",
  storageBucket: "goods-ab8b5.firebasestorage.app",
  messagingSenderId: "1084647770453",
  appId: "1:1084647770453:web:53d5c957527728c6fd47dc",
};

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db }; 