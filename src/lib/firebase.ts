import { initializeApp, getApps, type FirebaseApp } from "firebase/app";

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
