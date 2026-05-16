import Link from "next/link";
import { IconSearch, IconCalendar, IconUsers, IconPlus, IconCash } from "@/components/icons/dashboard-icons";

export default function HomePage() {
  const today = new Intl.DateTimeFormat("en", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date());

  return (
    <div className="flex flex-col gap-6 px-5 py-8">
      {/* Header Section */}
      <header className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Hello, Admin</h1>
            <p className="text-[13px] font-bold text-indigo-500/80">BY BYTHUB</p>
          </div>
          <div className="h-10 w-10 overflow-hidden rounded-full border-2 border-white bg-indigo-100 shadow-sm">
            <img
              src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix"
              alt="Profile"
              className="h-full w-full object-cover"
            />
          </div>
        </div>
        <p className="mt-1 text-[15px] font-medium text-[var(--app-text-muted)]">{today}</p>
      </header>


      {/* Search Bar */}
      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
          <IconSearch className="h-5 w-5 text-[var(--app-text-muted)]" />
        </div>
        <input
          type="text"
          className="h-12 w-full rounded-2xl border-none bg-white px-10 text-[15px] shadow-sm outline-none ring-1 ring-[var(--app-card-border)] focus:ring-2 focus:ring-[var(--app-accent)] dark:bg-[var(--app-card)]"
          placeholder="Search batches or students..."
        />
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        <div className="card-premium flex flex-col gap-2 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400">
            <IconCalendar className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[13px] font-medium text-[var(--app-text-muted)]">Batches</p>
            <p className="text-xl font-bold">12</p>
          </div>
        </div>
        <div className="card-premium flex flex-col gap-2 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
            <IconUsers className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[13px] font-medium text-[var(--app-text-muted)]">Students</p>
            <p className="text-xl font-bold">148</p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-bold">Quick Actions</h2>
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: "Add Batch", icon: IconPlus, color: "bg-blue-50 text-blue-600", href: "/batches" },
            { label: "Attendance", icon: IconCalendar, color: "bg-purple-50 text-purple-600", href: "/batches" },
            { label: "Fees", icon: IconCash, color: "bg-amber-50 text-amber-600", href: "/more" },
            { label: "Students", icon: IconUsers, color: "bg-rose-50 text-rose-600", href: "/students" },
          ].map((action, i) => (
            <Link key={i} href={action.href} className="flex flex-col items-center gap-2">
              <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${action.color} shadow-sm transition-transform active:scale-90`}>
                <action.icon className="h-7 w-7" />
              </div>
              <span className="text-center text-[11px] font-medium">{action.label}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured Card */}
      <div className="relative mt-2 overflow-hidden rounded-3xl bg-[var(--app-accent)] p-6 text-white shadow-lg">
        <div className="relative z-10 flex flex-col gap-2">
          <h3 className="text-xl font-bold">Track Fees Easily</h3>
          <p className="text-sm opacity-90">
            Manage your tuition center's finances with automated reminders and reports.
          </p>
          <button className="mt-2 w-fit rounded-xl bg-white px-4 py-2 text-sm font-bold text-[var(--app-accent)] shadow-md active:scale-95">
            Get Started
          </button>
        </div>
        <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-black/10 blur-2xl" />
      </div>
    </div>
  );
}

