"use client";

import { useAuth } from "@/components/auth-provider";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function RootIndexPage() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace("/login");
    } else if (!profile?.tuitionId) {
      router.replace("/setup");
    } else {
      router.replace("/app");
    }
  }, [user, profile, loading, router]);

  return (
    <div className="flex min-h-svh items-center justify-center bg-[#000000]">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--app-accent)] border-t-transparent" />
    </div>
  );
}
