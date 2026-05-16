"use client";

import { onAuthStateChanged, signInWithEmailAndPassword } from "firebase/auth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { getFirebaseAuth } from "@/lib/firebase";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const auth = getFirebaseAuth();
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) router.replace("/");
    });
    return () => unsub();
  }, [router]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await signInWithEmailAndPassword(getFirebaseAuth(), email.trim(), password);
      router.replace("/");
      router.refresh();
    } catch {
      setError("Unable to sign in. Check credentials or contact admin.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={(e) => void onSubmit(e)} className="flex w-full flex-col gap-5">
      <div className="flex flex-col gap-2">
        <label
          htmlFor="email"
          className="px-1 text-[13px] font-bold text-[var(--app-text-muted)]"
        >
          Email Address
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          placeholder="admin@batchbook.com"
          className="h-14 w-full rounded-2xl border-none bg-white px-5 text-[16px] shadow-sm outline-none ring-1 ring-[var(--app-card-border)] transition-all focus:ring-2 focus:ring-[var(--app-accent)] dark:bg-[var(--app-card)]"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label
          htmlFor="password"
          className="px-1 text-[13px] font-bold text-[var(--app-text-muted)]"
        >
          Password
        </label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          placeholder="••••••••"
          className="h-14 w-full rounded-2xl border-none bg-white px-5 text-[16px] shadow-sm outline-none ring-1 ring-[var(--app-card-border)] transition-all focus:ring-2 focus:ring-[var(--app-accent)] dark:bg-[var(--app-card)]"
        />
      </div>

      {error ? (
        <div className="mt-2 rounded-2xl bg-red-50 p-4 text-[14px] font-medium text-red-600 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={submitting}
        className="mt-4 flex h-14 w-full items-center justify-center rounded-2xl bg-[var(--app-accent-gradient)] text-[17px] font-bold text-white shadow-lg transition-transform active:scale-[0.98] disabled:opacity-50"
      >
        {submitting ? (
          <div className="flex items-center gap-2">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            <span>Signing in...</span>
          </div>
        ) : (
          "Sign In"
        )}
      </button>
    </form>
  );
}

