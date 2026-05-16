"use client";

import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup } from "firebase/auth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { IconGoogle } from "@/components/icons/dashboard-icons";
import { getFirebaseAuth } from "@/lib/firebase";

export function GoogleLoginButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const auth = getFirebaseAuth();
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) router.replace("/");
    });
    return () => unsub();
  }, [router]);

  const onGoogleSignIn = async () => {
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(getFirebaseAuth(), provider);
      router.replace("/");
    } catch (error) {
      console.error("Google Sign-In Error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={() => void onGoogleSignIn()}
      disabled={loading}
      className="flex h-16 w-full items-center justify-center gap-3 rounded-2xl bg-white px-6 text-[17px] font-bold text-[#1f1f1f] shadow-lg ring-1 ring-black/5 transition-all active:scale-[0.98] dark:bg-[var(--app-card)] dark:text-white dark:ring-white/10 disabled:opacity-50"
    >
      {loading ? (
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-500/30 border-t-indigo-500" />
      ) : (
        <>
          <IconGoogle className="h-6 w-6" />
          <span>Continue with Google</span>
        </>
      )}
    </button>
  );
}
