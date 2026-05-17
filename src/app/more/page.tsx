"use client";

import { signOut } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase";
import { useAuth } from "@/components/auth-provider";
import { 
  User, 
  CreditCard, 
  Calendar, 
  HelpCircle, 
  LogOut, 
  ChevronRight,
  Shield,
  Sliders,
  Building
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function MorePage() {
  const { user, profile, loading } = useAuth();

  const onSignOut = () => {
    if (confirm("Are you sure you want to sign out?")) {
      void signOut(getFirebaseAuth());
    }
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

      {/* 2. Enhanced Profile Card */}
      <div className="px-8">
        {loading ? (
          <div className="h-28 w-full animate-pulse rounded-3xl bg-[#111111] border border-white/5" />
        ) : profile ? (
          <div className="card-cred p-8 flex items-center gap-6 relative overflow-hidden group">
            {/* Ambient subtle glow based on role */}
            <div className={cn(
              "absolute -right-10 -top-10 w-32 h-32 rounded-full blur-3xl opacity-20 transition-all duration-500",
              profile.role === "owner" ? "bg-[var(--app-accent)]" : "bg-blue-500"
            )} />

            {/* Profile Avatar */}
            <div className="h-16 w-16 rounded-2xl bg-[#0d0d0d] border border-white/5 shadow-[neu-raised] flex items-center justify-center text-2xl font-black text-[var(--app-accent)] grayscale opacity-80 shrink-0">
              {profile.name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase()}
            </div>
            
            <div className="flex flex-col gap-1 overflow-hidden flex-1">
              <div className="flex items-center gap-2">
                <span className={cn(
                  "text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded border",
                  profile.role === "owner" 
                    ? "text-[var(--app-accent)] bg-[var(--app-accent-soft)] border-[var(--app-accent)]/10" 
                    : "text-[#444444] bg-[#111111] border-white/5"
                )}>
                  {profile.role || "staff"}
                </span>
                <span className="text-[9px] font-black uppercase text-[#333333] tracking-widest">Administrative Head</span>
              </div>
              <h3 className="text-[18px] font-black text-white truncate w-full">
                {profile.name || "Anonymous User"}
              </h3>
              <p className="text-[11px] font-bold text-[#444444] truncate">{profile.email || user?.email}</p>
            </div>
          </div>
        ) : null}
      </div>

      {/* 3. Redesigned Options List */}
      <section className="flex flex-col gap-10 px-8">
        
        {/* Category: Center Config */}
        <div className="flex flex-col gap-5">
           <h3 className="text-[11px] font-black uppercase tracking-[0.4em] text-[#333333]">Center Setup</h3>
           <div className="flex flex-col gap-3">
             {[
               { label: "Payment Gateway", icon: CreditCard, desc: "Manage UPI and bank routing options" },
               { label: "Time Slots", icon: Calendar, desc: "Configure standard batch durations" },
               { label: "Institution Details", icon: Building, desc: "Edit coaching address & brand name" },
             ].map((item, i) => (
               <div key={i} className="card-cred p-5 flex items-center gap-5 group active:scale-[0.98] transition-all cursor-pointer">
                  <div className="h-11 w-11 rounded-xl bg-[#0d0d0d] border border-white/5 shadow-[neu-raised] flex items-center justify-center text-[#444444] group-hover:text-[var(--app-accent)] transition-all shrink-0">
                    <item.icon className="h-5 w-5 transition-transform group-hover:scale-110" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-[14px] font-black text-white group-hover:text-[var(--app-accent)] transition-colors">{item.label}</h4>
                    <p className="text-[11px] font-bold text-[#444444] leading-tight mt-0.5 truncate">{item.desc}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-[#222222] group-hover:text-white transition-colors shrink-0" />
               </div>
             ))}
           </div>
        </div>

        {/* Category: Security & Support */}
        <div className="flex flex-col gap-5">
           <h3 className="text-[11px] font-black uppercase tracking-[0.4em] text-[#333333]">Trust & Security</h3>
           <div className="flex flex-col gap-3">
             {[
               { label: "Help & FAQs", icon: HelpCircle, desc: "Resolve issues and contact customer support" },
               { label: "Access Controls", icon: Shield, desc: "Manage staff roles and security protocols" },
             ].map((item, i) => (
               <div key={i} className="card-cred p-5 flex items-center gap-5 group active:scale-[0.98] transition-all cursor-pointer">
                  <div className="h-11 w-11 rounded-xl bg-[#0d0d0d] border border-white/5 shadow-[neu-raised] flex items-center justify-center text-[#444444] group-hover:text-[var(--app-accent)] transition-all shrink-0">
                    <item.icon className="h-5 w-5 transition-transform group-hover:scale-110" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-[14px] font-black text-white group-hover:text-[var(--app-accent)] transition-colors">{item.label}</h4>
                    <p className="text-[11px] font-bold text-[#444444] leading-tight mt-0.5 truncate">{item.desc}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-[#222222] group-hover:text-white transition-colors shrink-0" />
               </div>
             ))}
           </div>
        </div>

        {/* Sign Out Action */}
        {user && (
          <button 
            onClick={onSignOut}
            className="card-cred h-16 w-full flex items-center justify-center gap-2 text-[12px] font-black uppercase tracking-[0.3em] text-[#ff4d4d] border-dashed border-[#ff4d4d]/10 hover:border-[#ff4d4d]/30 hover:bg-[#ff4d4d]/5 active:scale-[0.98] transition-all duration-300 shadow-[neu-pressed]"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            Sign Out of Account
          </button>
        )}
      </section>

      {/* 4. Branded Footer */}
      <footer className="text-center pb-8 flex flex-col gap-2">
        <p className="text-[11px] font-black uppercase tracking-[0.3em] text-[#222222]">Version 1.0.4-Premier</p>
        <p className="text-[10px] font-black uppercase tracking-[0.1em] text-[#444444]">
          Product by <a href="https://bythub.in" className="text-[var(--app-accent)] transition-opacity hover:opacity-80">Bythub</a>
        </p>
      </footer>
    </div>
  );
}
