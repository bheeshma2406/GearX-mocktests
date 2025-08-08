// Firebase configuration and initialization
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

 // Your Firebase config object
const firebaseConfig = {
  apiKey: "AIzaSyD7Qrqzx8837BsbKRw19pun6x6ZMqVpS-o",
  authDomain: "gearx-2696b.firebaseapp.com",
  projectId: "gearx-2696b",
  storageBucket: "gearx-2696b.firebasestorage.app",
  messagingSenderId: "663983244309",
  appId: "1:663983244309:web:3410269b02883f83b43a1c",
  measurementId: "G-BBNQWMRWZR"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const db = getFirestore(app);
export const auth = getAuth(app);

export default app;
