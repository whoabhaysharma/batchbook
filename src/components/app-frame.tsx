"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { IconFinance, IconGrid, IconHome, IconMore, IconPeople } from "@/components/icons/tab-icons";

const tabs = [
  { href: "/", label: "Home", match: (p: string) => p === "/", Icon: IconHome },
  { href: "/batches", label: "Batches", match: (p: string) => p.startsWith("/batches"), Icon: IconGrid },
  { href: "/payments", label: "Finance", match: (p: string) => p.startsWith("/payments") || p.startsWith("/ledger"), Icon: IconFinance },
  { href: "/students", label: "Students", match: (p: string) => p.startsWith("/students"), Icon: IconPeople },
  { href: "/more", label: "More", match: (p: string) => p.startsWith("/more"), Icon: IconMore },
] as const;


export function AppFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  
  // Use browser-level pathname to prevent hydration/pre-render lag flashes
  const currentPath = typeof window !== "undefined" ? window.location.pathname : pathname;
  const hideChrome = currentPath === "/login" || currentPath === "/setup" || currentPath.startsWith("/login") || currentPath.startsWith("/setup");

  if (hideChrome) {
    return <div className="min-h-svh bg-[#000000] text-white">{children}</div>;
  }

  return (
    <div className="flex min-h-svh flex-col bg-[#000000] text-white">
      <main className="flex-1 pb-[calc(7.5rem+var(--safe-bottom))]">
        <div className="mx-auto w-full max-w-md">{children}</div>
      </main>

      {/* CRED-style Floating Bottom Navigation */}
      <div className="fixed inset-x-0 bottom-[calc(1rem+var(--safe-bottom))] z-50 flex justify-center px-4 sm:px-8 pointer-events-none">
        <nav
          className="pointer-events-auto flex h-18 w-full max-w-sm items-center justify-around rounded-[2rem] bg-[#111111] border border-white/5 shadow-[0_20px_40px_rgba(0,0,0,0.8)] px-1.5 sm:px-2"
          aria-label="Main tabs"
        >
          {tabs.map(({ href, label, match, Icon }) => {
            const active = match(pathname);
            return (
              <Link
                key={href}
                href={href}
                className="relative flex h-full flex-1 flex-col items-center justify-center gap-1.5 transition-all active:scale-90"
              >
                <div
                  className={[
                    "transition-all duration-300",
                    active ? "text-[var(--app-accent)] scale-110" : "text-[#444444]",
                  ].join(" ")}
                >
                  <Icon active={active} />
                </div>
                <span 
                  className={[
                    "text-[9px] font-black uppercase tracking-[0.15em] transition-all",
                    active ? "text-[var(--app-accent)] opacity-100" : "text-[#333333] opacity-60",
                  ].join(" ")}
                >
                  {label}
                </span>
              </Link>
            );
          })}
        </nav>
      </div>

    </div>
  );
}
