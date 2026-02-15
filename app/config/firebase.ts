import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBJcF7EZRNxGKEoV33Ywiu24QLqlddL8FY",
  authDomain: "bank-lock-95c05.firebaseapp.com",
  projectId: "bank-lock-95c05",
  storageBucket: "bank-lock-95c05.firebasestorage.app",
  messagingSenderId: "358875019646",
  appId: "1:358875019646:web:24197a33a70d15759c9b2f"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication
export const auth = getAuth(app);

// Initialize Firestore Database
export const db = getFirestore(app);

export default app;
