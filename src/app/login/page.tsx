import type { Metadata } from "next";
import { GoogleLoginButton } from "./google-login-button";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to BatchBook",
};

export default function LoginPage() {
  return (
    <div className="relative flex min-h-svh flex-col overflow-hidden bg-[var(--app-bg)]">
      {/* Background Decorative Elements */}
      <div className="absolute -left-20 -top-20 h-80 w-80 rounded-full bg-indigo-500/10 blur-3xl" />
      <div className="absolute -right-20 top-1/2 h-80 w-80 rounded-full bg-blue-500/10 blur-3xl" />

      <div className="relative z-10 flex flex-1 flex-col px-8 py-12">
        {/* Content Area */}
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <div className="flex h-24 w-24 items-center justify-center rounded-[2.5rem] bg-[var(--app-accent-gradient)] text-4xl font-bold text-white shadow-xl">
            B
          </div>
          <h1 className="mt-10 text-5xl font-extrabold tracking-tight">
            BatchBook
          </h1>
          <p className="mt-4 text-[17px] leading-relaxed text-[var(--app-text-muted)] max-w-[280px]">
            The professional operating system for your tuition center.
          </p>
        </div>

        {/* Action Area at the Bottom */}
        <div className="mt-auto flex flex-col gap-6">
          <GoogleLoginButton />
          
          <footer className="text-center text-[13px] font-medium text-[var(--app-text-muted)]">
            <p>By continuing, you agree to our Terms and Privacy Policy.</p>
            <p className="mt-2 font-bold">
              Product by <a href="https://bythub.in" className="text-indigo-500">Bythub</a>
            </p>
          </footer>
        </div>

      </div>
    </div>
  );
}


