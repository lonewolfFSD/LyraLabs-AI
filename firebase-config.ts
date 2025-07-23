import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, serverTimestamp, query, where, getDocs, doc, setDoc, getDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { getAuth, sendPasswordResetEmail, signOut, createUserWithEmailAndPassword, sendEmailVerification } from 'firebase/auth';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getRemoteConfig, fetchAndActivate, getValue } from 'firebase/remote-config'; // Explicitly import getValue

const firebaseConfig = {
  apiKey: "AIzaSyCjdlqJwQ99M1hS5ZQsAoxlA0PKmNknL3E",
  authDomain: "lyra-s-whisper.firebaseapp.com",
  projectId: "lyra-s-whisper",
  storageBucket: "lyra-s-whisper.firebasestorage.app",
  messagingSenderId: "990801181057",
  appId: "1:990801181057:web:4dd8bea784edb23d069080",
  measurementId: "G-EX0X9JD2JB"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);
export const remoteConfig = getRemoteConfig(app);
export { collection, addDoc, serverTimestamp, query, where, getDocs, doc, setDoc, getDoc, updateDoc, Timestamp };
export { ref, uploadBytes, getDownloadURL };
export { createUserWithEmailAndPassword, signOut, sendPasswordResetEmail, sendEmailVerification };
export { fetchAndActivate, getValue }; // Export for direct use if needed