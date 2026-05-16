import Link from "next/link";

/** Modern mobile list: clean cards with refined dividers. */

export function GroupedList({
  header,
  footer,
  children,
}: {
  header?: string;
  footer?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-2 px-5">
      {header ? (
        <h2 className="px-1 text-[13px] font-bold uppercase tracking-wider text-[var(--app-text-muted)]">
          {header}
        </h2>
      ) : null}
      <div className="card-premium overflow-hidden">{children}</div>
      {footer ? (
        <p className="px-1 text-[13px] leading-snug text-[var(--app-text-muted)]">{footer}</p>
      ) : null}
    </section>
  );
}

export function GroupedRow({
  children,
  trailing,
  isLast,
  href,
  onClick,
  icon,
}: {
  children: React.ReactNode;
  trailing?: React.ReactNode;
  isLast?: boolean;
  href?: string;
  onClick?: () => void;
  icon?: React.ReactNode;
}) {
  const content = (
    <div
      className={[
        "flex min-h-[56px] items-center gap-4 px-4 py-3",
        !isLast ? "hairline-b" : "",
      ].join(" ")}
    >
      {icon && <div className="flex h-8 w-8 items-center justify-center text-[var(--app-accent)]">{icon}</div>}
      <div className="min-w-0 flex-1 text-[16px] font-medium">{children}</div>
      {trailing !== undefined && trailing !== null ? (
        <div className="shrink-0 text-[15px] font-medium text-[var(--app-text-muted)]">{trailing}</div>
      ) : null}
      {(href || onClick) && !trailing && (
        <div className="shrink-0 text-[var(--app-text-muted)]">
          <svg className="h-5 w-5 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      )}
    </div>
  );

  const interactive =
    "block w-full active:bg-black/[0.04] dark:active:bg-white/[0.06] transition-colors";

  if (href?.startsWith("/")) {
    return (
      <Link href={href} className={interactive}>
        {content}
      </Link>
    );
  }

  if (href) {
    return (
      <a href={href} className={interactive} rel="noopener noreferrer" target="_blank">
        {content}
      </a>
    );
  }

  if (onClick) {
    return (
      <button type="button" className={`${interactive} text-left`} onClick={onClick}>
        {content}
      </button>
    );
  }

  return content;
}

