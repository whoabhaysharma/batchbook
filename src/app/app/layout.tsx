"use client";

import { useAuth } from "@/components/auth-provider";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { AppFrame } from "@/components/app-frame";

export default function ProtectedAppLayout({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace("/login");
    } else if (!profile?.tuitionId) {
      router.replace("/setup");
    }
  }, [user, profile, loading, router]);

  // Render a clean loading spinner while verifying authentication credentials
  if (loading || !user || !profile?.tuitionId) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-[#000000]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--app-accent)] border-t-transparent" />
      </div>
    );
  }

  return <AppFrame>{children}</AppFrame>;
}
