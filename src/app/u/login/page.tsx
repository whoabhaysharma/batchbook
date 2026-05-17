import type { Metadata } from "next";
import { GoogleLoginButton } from "../../login/google-login-button";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to BatchBook",
};

export default function UserLoginPage() {
  return (
    <div className="relative flex min-h-svh flex-col overflow-hidden bg-[var(--app-bg)]">
      <div className="absolute inset-0 bg-[#050505]" />
      <div className="absolute -left-1/4 top-0 h-[600px] w-[600px] rounded-full bg-[var(--app-accent)] opacity-[0.03] blur-[120px]" />
      <div className="absolute -right-1/4 bottom-0 h-[600px] w-[600px] rounded-full bg-[var(--app-accent)] opacity-[0.03] blur-[120px]" />

      <div className="absolute left-1/2 top-1/3 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
        <div className="h-64 w-64 rounded-full border border-white/[0.03] animate-[spin_20s_linear_infinite]" />
        <div className="absolute inset-0 h-64 w-64 rounded-full border-t border-[var(--app-accent)] opacity-10 animate-[spin_10s_linear_infinite]" />
        <div className="absolute inset-4 rounded-full border border-white/[0.02]" />
      </div>

      <div className="relative z-10 flex flex-1 flex-col px-5 sm:px-10 pt-[calc(2.5rem+var(--safe-top))] pb-[calc(1.25rem+var(--safe-bottom))] sm:py-20">
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <div className="relative group">
            <div className="absolute -inset-4 rounded-[3rem] bg-[var(--app-accent)] opacity-0 blur-2xl group-hover:opacity-20 transition-opacity duration-1000" />
            <div className="relative flex h-24 w-24 items-center justify-center rounded-[2.5rem] bg-[#0d0d0d] border border-white/10 shadow-2xl text-4xl font-black text-[var(--app-accent)]">B</div>
          </div>

          <div className="mt-12 flex flex-col gap-3">
            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tighter text-white">BatchBook</h1>
            <div className="flex items-center justify-center gap-3">
              <div className="h-[1px] w-4 bg-[#222222]" />
              <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.45em] sm:tracking-[0.6em] text-[#555555]">PREMIER ACCESS</p>
              <div className="h-[1px] w-4 bg-[#222222]" />
            </div>
          </div>
        </div>

        <div className="mt-auto flex flex-col gap-8 sm:gap-12">
          <div className="p-1 rounded-[2rem] bg-gradient-to-b from-white/10 to-transparent">
            <div className="bg-[#0d0d0d]/40 backdrop-blur-3xl rounded-[1.9rem] p-6 sm:p-8 flex flex-col gap-6 border border-white/5 shadow-2xl">
              <div className="flex flex-col gap-2">
                <h2 className="text-lg font-bold text-white/90">Welcome back</h2>
                <p className="text-[13px] font-medium text-[#444444]">Sign in to manage your tuition center</p>
              </div>
              <GoogleLoginButton />
            </div>
          </div>

          <footer className="text-center">
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[#222222]">CRAFTED BY BYTHUB • 2026</p>
          </footer>
        </div>
      </div>
    </div>
  );
}
