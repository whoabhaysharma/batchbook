"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { suggestTuitionCode, isTuitionCodeUnique, setupTuition } from "@/lib/tuition";
import { IconCash } from "@/components/icons/dashboard-icons";
import { useAuth } from "@/components/auth-provider";

export default function SetupPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [tuitionName, setTuitionName] = useState("");
  const [tuitionCode, setTuitionCode] = useState("");
  const [codeError, setCodeError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/u/login");
    }
  }, [loading, user, router]);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setTuitionName(val);
    if (val.length >= 3) {
      setTuitionCode(suggestTuitionCode(val));
    }
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.toUpperCase().replace(/[^A-Z]/g, "").substring(0, 3);
    setTuitionCode(val);
  };

  const validateAndSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (tuitionCode.length !== 3) {
      setCodeError("Code must be exactly 3 characters");
      return;
    }

    setIsSubmitting(true);
    setError("");
    setCodeError("");

    try {
      const isUnique = await isTuitionCodeUnique(tuitionCode);
      if (!isUnique) {
        setCodeError("This code is already taken. Try another.");
        setIsSubmitting(false);
        return;
      }

      await setupTuition(
        { uid: user.uid, email: user.email!, name: tuitionName },
        tuitionName,
        tuitionCode
      );

      router.push("/");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to setup tuition";
      setError(message);
      setIsSubmitting(false);
    }
  };

  if (loading || !user) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-[#000000]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--app-accent)] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex min-h-svh flex-col bg-[var(--app-bg)] px-5 sm:px-8 pt-[calc(2.25rem+var(--safe-top))] sm:pt-20 pb-[calc(1.25rem+var(--safe-bottom))]">
      <header className="flex flex-col gap-2 mb-10">
        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[#333333]">
          Onboarding
        </p>
        <h1 className="text-4xl font-extrabold tracking-tighter text-white">
          Setup Center
        </h1>
        <p className="text-[15px] font-bold text-[#666666] leading-snug">
          Create your tuition profile to start managing students and fees.
        </p>
      </header>

      <form onSubmit={validateAndSubmit} className="flex flex-col gap-8 max-w-md w-full">
        <div className="flex flex-col gap-2">
          <label className="text-[11px] font-black uppercase tracking-[0.2em] text-[#444444] px-1">
            Tuition Name
          </label>
          <input
            type="text"
            required
            value={tuitionName}
            onChange={handleNameChange}
            placeholder="e.g. Abhay Classes"
            className="h-16 w-full rounded-2xl bg-[#0d0d0d] border border-white/5 shadow-[neu-pressed] px-6 text-[16px] font-bold text-white outline-none focus:border-[var(--app-accent)]/20 transition-all"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-[11px] font-black uppercase tracking-[0.2em] text-[#444444] px-1">
            Center Code (3 Letters)
          </label>
          <div className="relative">
            <input
              type="text"
              required
              value={tuitionCode}
              onChange={handleCodeChange}
              placeholder="ABC"
              className={`h-16 w-full rounded-2xl bg-[#0d0d0d] border ${codeError ? "border-red-500/50" : "border-white/5"} shadow-[neu-pressed] px-6 text-[16px] font-black tracking-widest text-white outline-none focus:border-[var(--app-accent)]/20 transition-all`}
            />
            <div className="absolute right-6 top-1/2 -translate-y-1/2 text-[10px] font-black text-[#333333]">
              GLOBALLY UNIQUE
            </div>
          </div>
          {codeError && <p className="text-red-500 text-[11px] font-bold px-1">{codeError}</p>}
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-[13px] font-bold">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting || tuitionName.length < 3 || tuitionCode.length !== 3}
          className="h-16 w-full btn-neon text-[14px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 disabled:opacity-30 transition-all"
        >
          {isSubmitting ? "Initializing..." : (
            <>
              Launch Center
              <IconCash className="h-5 w-5" />
            </>
          )}
        </button>
      </form>
    </div>
  );
}
