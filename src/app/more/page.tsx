"use client";

import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { GroupedList, GroupedRow } from "@/components/grouped-list";
import { getFirebaseAuth } from "@/lib/firebase";
import { IconUsers, IconPlus } from "@/components/icons/dashboard-icons";

export default function MorePage() {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const auth = getFirebaseAuth();
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setReady(true);
    });
    return () => unsub();
  }, []);

  const onSignOut = () => {
    void signOut(getFirebaseAuth());
  };

  return (
    <div className="flex flex-col gap-6 pb-8">
      <PageHeader 
        title="More" 
        subtitle="Account and app settings"
      />

      <div className="flex flex-col gap-6">
        {!ready ? (
          <div className="px-5">
            <div className="h-28 animate-pulse rounded-2xl bg-[var(--app-card)] opacity-50" />
          </div>
        ) : null}

        {ready && user ? (
          <GroupedList header="Account">
            <div className="flex items-center gap-4 px-4 py-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--app-accent-soft)] text-xl font-bold text-[var(--app-accent)]">
                {user.email?.charAt(0).toUpperCase()}
              </div>
              <div className="flex flex-col">
                <p className="text-[13px] font-bold text-[var(--app-text-muted)]">Signed in as</p>
                <p className="break-all text-[16px] font-semibold leading-tight">
                  {user.email}
                </p>
              </div>
            </div>
          </GroupedList>
        ) : null}

        {ready && !user ? (
          <GroupedList header="Session">
            <GroupedRow href="/login" icon={<IconPlus className="h-5 w-5" />} isLast>
              Sign in to your account
            </GroupedRow>
          </GroupedList>
        ) : null}

        {ready && user ? (
          <GroupedList header="Actions">
            <GroupedRow onClick={onSignOut} isLast>
              <span className="text-[16px] font-bold text-red-500">
                Sign Out
              </span>
            </GroupedRow>
          </GroupedList>
        ) : null}

        <GroupedList header="About">
          <GroupedRow trailing="1.0.0">App Version</GroupedRow>
          <GroupedRow isLast>
            <p className="text-[14px] leading-relaxed text-[var(--app-text-muted)]">
              BatchBook helps tuition centers manage batches, students, schedules, and fees with ease.
            </p>
          </GroupedRow>
        </GroupedList>

        <footer className="mt-4 text-center text-[13px] font-medium text-[var(--app-text-muted)]">
          <p>Product by <a href="https://bythub.in" className="font-bold text-[var(--app-accent)]">Bythub</a></p>
          <p className="mt-1">Crafted for Excellence • bythub.in</p>
        </footer>

      </div>
    </div>
  );
}

