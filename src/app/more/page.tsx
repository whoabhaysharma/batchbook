"use client";

import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import { useEffect, useState } from "react";
import { getFirebaseAuth } from "@/lib/firebase";
import { IconUsers, IconPlus, IconCash, IconCalendar } from "@/components/icons/dashboard-icons";
import { IconMore } from "@/components/icons/tab-icons";

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
    <div className="flex flex-col gap-10 pb-28">
      {/* 1. CRED-style Header */}
      <header className="px-8 pt-16">
        <div className="flex flex-col gap-1">
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[#333333]">
            Personal Space
          </p>
          <h1 className="text-4xl font-extrabold tracking-tighter text-white">
            Settings
          </h1>
        </div>
      </header>

      {/* 2. Account Profile Card */}
      <div className="px-8">
        {!ready ? (
          <div className="h-28 w-full animate-pulse rounded-3xl bg-[#111111]" />
        ) : user ? (
          <div className="card-cred p-8 flex items-center gap-6">
            <div className="h-16 w-16 rounded-2xl bg-[#0d0d0d] border border-white/5 shadow-[neu-raised] flex items-center justify-center text-2xl font-black text-[var(--app-accent)] grayscale opacity-80">
              {user.email?.charAt(0).toUpperCase()}
            </div>
            <div className="flex flex-col gap-0.5 overflow-hidden">
              <p className="text-[11px] font-black uppercase tracking-widest text-[#444444]">Administrative Head</p>
              <h3 className="text-[17px] font-black text-white truncate w-full">
                {user.email}
              </h3>
            </div>
          </div>
        ) : null}
      </div>


      {/* 3. Settings Categories */}
      <section className="flex flex-col gap-10 px-8">
        
        {/* Category: Center Config */}
        <div className="flex flex-col gap-5">
           <h3 className="text-[11px] font-black uppercase tracking-[0.4em] text-[#333333]">Center Configuration</h3>
           <div className="flex flex-col gap-4">
             {[
               { label: "General Settings", icon: IconMore, desc: "Name, Logo, and Branding" },
               { label: "Payment Gateway", icon: IconCash, desc: "Manage UPI and Bank details" },
               { label: "Time Slots", icon: IconCalendar, desc: "Configure default batch timings" },
             ].map((item, i) => (
               <div key={i} className="card-cred p-6 flex items-center gap-6 group active:scale-[0.98] transition-all">
                  <div className="h-12 w-12 rounded-2xl bg-[#0d0d0d] border border-white/5 shadow-[neu-raised] flex items-center justify-center text-[#666666] group-active:text-[var(--app-accent)] shrink-0">
                    <item.icon className="h-6 w-6" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-[15px] font-extrabold text-white">{item.label}</h4>
                    <p className="text-[11px] font-bold text-[#333333] leading-tight">{item.desc}</p>
                  </div>
               </div>
             ))}
           </div>
        </div>

        {/* Category: Security & Support */}
        <div className="flex flex-col gap-5">
           <h3 className="text-[11px] font-black uppercase tracking-[0.4em] text-[#333333]">Trust & Support</h3>
           <div className="flex flex-col gap-4">
             <div className="card-cred p-6 flex items-center gap-6">
                <div className="h-12 w-12 rounded-2xl bg-[#0d0d0d] border border-white/5 shadow-[neu-raised] flex items-center justify-center text-[#666666]">
                  <IconUsers className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <h4 className="text-[15px] font-extrabold text-white">Help Center</h4>
                  <p className="text-[11px] font-bold text-[#333333] leading-tight">FAQs and customer support</p>
                </div>
             </div>
           </div>
        </div>

        {/* Sign Out */}
        {user && (
          <button 
            onClick={onSignOut}
            className="card-cred h-20 w-full flex items-center justify-center text-[13px] font-black uppercase tracking-[0.4em] text-[#ff4d4d] border-dashed border-white/10 active:shadow-[neu-pressed]"
          >
            Terminal Access • Sign Out
          </button>
        )}
      </section>

      {/* 4. Branded Footer */}
      <footer className="text-center pb-8 flex flex-col gap-2">
        <p className="text-[11px] font-black uppercase tracking-[0.3em] text-[#222222]">Version 1.0.4-Premier</p>
        <p className="text-[10px] font-black uppercase tracking-[0.1em] text-[#444444]">
          Product by <a href="https://bythub.in" className="text-[var(--app-accent)]">Bythub</a>
        </p>
      </footer>
    </div>
  );
}


