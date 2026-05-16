"use client";

import { useEffect } from "react";

import { getFirebaseApp } from "@/lib/firebase";

/** Loads Firebase Analytics only in the browser (required for Next.js). */
export function FirebaseAnalytics() {
  useEffect(() => {
    let cancelled = false;

    async function init() {
      const { getAnalytics, isSupported } = await import("firebase/analytics");
      if (cancelled) return;
      if (!(await isSupported())) return;
      getAnalytics(getFirebaseApp());
    }

    void init();

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
