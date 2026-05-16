"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { IconGrid, IconHome, IconMore, IconPeople } from "@/components/icons/tab-icons";

const tabs = [
  { href: "/", label: "Home", match: (p: string) => p === "/", Icon: IconHome },
  { href: "/batches", label: "Batches", match: (p: string) => p.startsWith("/batches"), Icon: IconGrid },
  { href: "/students", label: "Students", match: (p: string) => p.startsWith("/students"), Icon: IconPeople },
  { href: "/more", label: "More", match: (p: string) => p.startsWith("/more"), Icon: IconMore },
] as const;

export function AppFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hideChrome = pathname === "/login";

  if (hideChrome) {
    return <div className="min-h-svh bg-[var(--app-bg)] text-[var(--app-text)]">{children}</div>;
  }

  return (
    <div className="flex min-h-svh flex-col bg-[var(--app-bg)] text-[var(--app-text)]">
      <main className="flex-1 pb-20">
        <div className="mx-auto w-full max-w-md">{children}</div>
      </main>

      <nav
        className="glass fixed inset-x-0 bottom-0 z-50 hairline-t"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
        aria-label="Main tabs"
      >
        <div className="mx-auto flex h-16 w-full max-w-md items-stretch justify-around px-2">
          {tabs.map(({ href, label, match, Icon }) => {
            const active = match(pathname);
            return (
              <Link
                key={href}
                href={href}
                className="relative flex min-w-[4rem] flex-1 flex-col items-center justify-center gap-1 transition-all active:scale-95"
              >
                <div
                  className={[
                    "flex h-8 w-12 items-center justify-center rounded-2xl transition-colors",
                    active ? "bg-[var(--app-accent-soft)]" : "bg-transparent",
                  ].join(" ")}
                >
                  <Icon active={active} />
                </div>
                <span
                  className={[
                    "text-[11px] font-medium transition-colors",
                    active ? "text-[var(--app-accent)]" : "text-[var(--app-text-muted)]",
                  ].join(" ")}
                >
                  {label}
                </span>
                {active && (
                  <div className="absolute -top-[1px] h-[2px] w-8 rounded-full bg-[var(--app-accent)]" />
                )}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

