export function IconHome({ active }: { active?: boolean }) {
  const c = active ? "var(--app-accent)" : "var(--app-muted)";
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 10.5 12 4l8 6.5V20a.8.8 0 0 1-.8.8H4.8A.8.8 0 0 1 4 20v-9.5Z"
        stroke={c}
        strokeWidth="1.85"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconGrid({ active }: { active?: boolean }) {
  const c = active ? "var(--app-accent)" : "var(--app-muted)";
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M10 4H5.8A1.8 1.8 0 0 0 4 5.8V10a1.8 1.8 0 0 0 1.8 1.8H10A1.8 1.8 0 0 0 11.8 10V5.8A1.8 1.8 0 0 0 10 4Z"
        stroke={c}
        strokeWidth="1.75"
      />
      <path
        d="M21 4h-4.2A1.8 1.8 0 0 0 15 5.8V10a1.8 1.8 0 0 0 1.8 1.8H21A1.8 1.8 0 0 0 22.8 10V5.8A1.8 1.8 0 0 0 21 4Z"
        stroke={c}
        strokeWidth="1.75"
      />
      <path
        d="M21 15.2h-4.2a1.8 1.8 0 0 0-1.8 1.8V21a1.8 1.8 0 0 0 1.8 1.8H21a1.8 1.8 0 0 0 1.8-1.8v-4a1.8 1.8 0 0 0-1.8-1.8Z"
        stroke={c}
        strokeWidth="1.75"
      />
      <path
        d="M10 15.2H5.8A1.8 1.8 0 0 0 4 17v4a1.8 1.8 0 0 0 1.8 1.8H10a1.8 1.8 0 0 0 1.8-1.8v-4a1.8 1.8 0 0 0-1.8-1.8Z"
        stroke={c}
        strokeWidth="1.75"
      />
    </svg>
  );
}

export function IconPeople({ active }: { active?: boolean }) {
  const c = active ? "var(--app-accent)" : "var(--app-muted)";
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M17 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"
        stroke={c}
        strokeWidth="1.85"
        strokeLinecap="round"
      />
      <path
        d="M9 11a4 4 0 1 0-4-4 4 4 0 0 0 4 4Z"
        stroke={c}
        strokeWidth="1.85"
        strokeLinecap="round"
      />
      <path
        d="M23 21v-2a4 4 0 0 0-3-3.87"
        stroke={c}
        strokeWidth="1.85"
        strokeLinecap="round"
      />
      <path
        d="M16.5 3.13a4 4 0 0 1 0 7.75"
        stroke={c}
        strokeWidth="1.85"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function IconMore({ active }: { active?: boolean }) {
  const c = active ? "var(--app-accent)" : "var(--app-muted)";
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="6.5" cy="12" r="1.7" fill={c} />
      <circle cx="12" cy="12" r="1.7" fill={c} />
      <circle cx="17.5" cy="12" r="1.7" fill={c} />
    </svg>
  );
}
