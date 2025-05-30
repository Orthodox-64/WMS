import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAgx99BlTjlGd5YBXqfP4_pf4H18y1eguA",
  authDomain: "warehouse-76615.firebaseapp.com",
  projectId: "warehouse-76615",
  storageBucket: "warehouse-76615.firebasestorage.app",
  messagingSenderId: "483921345711",
  appId: "1:483921345711:web:8346076f025108af08685a"
};

// Initialize Firebase
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const db = getFirestore(app);

export { app, db };