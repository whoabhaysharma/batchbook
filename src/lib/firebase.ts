import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, connectAuthEmulator, type Auth } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator, type Firestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBxRDLQFUyUdVNrh1quBXfwyf4kKYjWQgU",
  authDomain: "batchboook.firebaseapp.com",
  projectId: "batchboook",
  storageBucket: "batchboook.firebasestorage.app",
  messagingSenderId: "1071151881123",
  appId: "1:1071151881123:web:77869733004216512f1816",
  measurementId: "G-NEFSECY3ZP",
};

export function getFirebaseApp(): FirebaseApp {
  if (!getApps().length) {
    return initializeApp(firebaseConfig);
  }
  return getApps()[0]!;
}

export function getFirebaseAuth(): Auth {
  const auth = getAuth(getFirebaseApp());
  if (process.env.NODE_ENV === "development") {
    // Only connect if not already connected (prevents error on hot reload)
    if (!(auth as any)._emulatorConfig) {
      connectAuthEmulator(auth, "http://localhost:9099");
    }
  }
  return auth;
}

export function getFirebaseDb(): Firestore {
  const db = getFirestore(getFirebaseApp());
  if (process.env.NODE_ENV === "development") {
    // Only connect if not already connected
    if (!(db as any)._terminated) {
      try {
        connectFirestoreEmulator(db, "localhost", 8080);
      } catch (e) {
        // Ignore error if already connected
      }
    }
  }
  return db;
}


