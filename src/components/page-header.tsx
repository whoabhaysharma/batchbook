import { ReactNode } from "react";

export function PageHeader({ 
  title, 
  subtitle, 
  trailing 
}: { 
  title: string; 
  subtitle?: string; 
  trailing?: ReactNode 
}) {
  return (
    <header className="flex flex-col gap-1 px-5 pt-8 pb-4">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        {trailing}
      </div>
      {subtitle && (
        <p className="text-[15px] font-medium text-[var(--app-text-muted)]">
          {subtitle}
        </p>
      )}
    </header>
  );
}
