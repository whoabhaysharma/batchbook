"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Users, AlertCircle, TrendingUp, ChevronRight, BookOpen, Plus, CreditCard } from "lucide-react";
import { getBatches, getMonthlyRevenue, getTuition, getStudents, getPendingDues } from "@/lib/db";
import { type Batch } from "@/types/batch";
import { type Student } from "@/types/student";
import { useAuth } from "@/components/auth-provider";
import { cn, formatTimeRange, getPeriodString } from "@/lib/utils";

export default function HomePage() {
  const { profile } = useAuth();
  const now = new Date();

  const greeting = (() => {
    const h = now.getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  })();

  const todayLabel = now.toLocaleDateString("en-IN", {
    weekday: "long", day: "numeric", month: "long",
  });

  const [tuitionName, setTuitionName] = useState("");
  const [batches, setBatches] = useState<Batch[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [revenue, setRevenue] = useState(0);
  const [pendingDues, setPendingDues] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.tuitionId) return;
    const tid = profile.tuitionId;
    const period = getPeriodString(now);

    Promise.all([
      getTuition(tid),
      getBatches(tid),
      getStudents(tid),
      getMonthlyRevenue(tid, period),
      getPendingDues(tid),
    ]).then(([tuition, batchData, studentData, rev, dues]) => {
      setTuitionName((tuition as any)?.name || "BatchBook");
      setBatches(batchData);
      setStudents(studentData);
      setRevenue(rev);
      setPendingDues(dues);
    }).catch(console.error).finally(() => setLoading(false));
  }, [profile]);

  const activeStudents = students.filter(s => s.status === "active").length;
  const onHoldStudents = students.filter(s => s.status === "on-hold").length;
  const activeBatches = batches.filter(b => b.status === "active");

  return (
    <div className="flex flex-col gap-8 pb-28">

      {/* ── HEADER ── */}
      <header className="px-8 pt-14 flex items-start justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.35em] text-[#333333]">{todayLabel}</p>
          <h1 className="text-[28px] font-extrabold tracking-tight text-white mt-1 leading-tight">
            {greeting} 👋
          </h1>
          <p className="text-[13px] font-bold text-[#444444] mt-0.5">{tuitionName || "—"}</p>
        </div>

        {/* Avatar / role badge */}
        <div className="flex flex-col items-end gap-1 mt-1">
          <div className="h-11 w-11 rounded-2xl bg-[#111111] border border-white/5 shadow-[neu-raised] flex items-center justify-center text-lg font-black text-[var(--app-accent)]">
            {profile?.name?.charAt(0)?.toUpperCase() || "?"}
          </div>
          <span className="text-[8px] font-black uppercase tracking-widest text-[#333333]">
            {profile?.role || "staff"}
          </span>
        </div>
      </header>

      {/* ── KEY NUMBERS ── */}
      <section className="px-8 flex flex-col gap-3">

        {/* Hero — This month's revenue */}
        <Link href="/payments" className="card-cred p-6 flex items-center justify-between active:scale-[0.98] transition-all">
          <div className="flex flex-col gap-1">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#444444]">Revenue this month</p>
            <p className="text-[36px] font-black text-white leading-none tracking-tighter">
              {loading ? "—" : `₹${(revenue / 1000).toFixed(1)}k`}
            </p>
          </div>
          <div className="h-12 w-12 rounded-2xl bg-[var(--app-accent-soft)] border border-[var(--app-accent)]/10 flex items-center justify-center text-[var(--app-accent)] shrink-0">
            <TrendingUp className="h-6 w-6" />
          </div>
        </Link>

        {/* Two supporting tiles */}
        <div className="grid grid-cols-2 gap-3">
          <Link href="/students" className="card-cred p-5 flex flex-col gap-4 active:scale-95 transition-all">
            <div className="h-9 w-9 rounded-xl bg-[#0d0d0d] border border-white/5 flex items-center justify-center text-[var(--app-accent)]">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-3xl font-black text-white leading-none">{loading ? "—" : activeStudents}</p>
              <p className="text-[9px] font-black uppercase tracking-widest text-[#444444] mt-1.5">Active students</p>
            </div>
          </Link>

          <Link href="/payments" className="card-cred p-5 flex flex-col gap-4 active:scale-95 transition-all">
            <div className="h-9 w-9 rounded-xl bg-[#ff4d4d10] border border-[#ff4d4d]/10 flex items-center justify-center text-[#ff4d4d]">
              <AlertCircle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-3xl font-black text-[#ff4d4d] leading-none">
                {loading ? "—" : `₹${(pendingDues / 1000).toFixed(1)}k`}
              </p>
              <p className="text-[9px] font-black uppercase tracking-widest text-[#444444] mt-1.5">Pending dues</p>
            </div>
          </Link>
        </div>

      </section>

      {/* ── QUICK ACTIONS ── */}
      <section className="px-8 flex flex-col gap-3">
        <h2 className="text-[10px] font-black uppercase tracking-[0.35em] text-[#333333]">Quick Actions</h2>
        <div className="grid grid-cols-2 gap-3">
          <Link
            href="/students?new=1"
            className="card-cred p-5 flex items-center gap-3 active:scale-95 transition-all group"
          >
            <div className="h-10 w-10 rounded-xl bg-[#0d0d0d] border border-white/5 flex items-center justify-center text-[var(--app-accent)] group-active:bg-[var(--app-accent-soft)] transition-colors shrink-0">
              <Plus className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[13px] font-black text-white leading-tight">Add Student</p>
              <p className="text-[10px] font-bold text-[#444444]">Enroll new</p>
            </div>
          </Link>

          <Link
            href="/payments"
            className="card-cred p-5 flex items-center gap-3 active:scale-95 transition-all group"
          >
            <div className="h-10 w-10 rounded-xl bg-[#0d0d0d] border border-white/5 flex items-center justify-center text-[var(--app-accent)] group-active:bg-[var(--app-accent-soft)] transition-colors shrink-0">
              <CreditCard className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[13px] font-black text-white leading-tight">Record Fee</p>
              <p className="text-[10px] font-bold text-[#444444]">Direct receipt</p>
            </div>
          </Link>
        </div>
      </section>

      {/* ── TODAY'S BATCHES ── */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between px-8">
          <h2 className="text-[10px] font-black uppercase tracking-[0.35em] text-[#333333]">Batches</h2>
          <Link href="/batches" className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--app-accent)]">
            Manage
          </Link>
        </div>

        {loading ? (
          <div className="mx-8 card-cred py-8 flex items-center justify-center">
            <p className="text-[10px] font-black uppercase tracking-widest text-[#333333] animate-pulse">Loading…</p>
          </div>
        ) : activeBatches.length === 0 ? (
          <div className="mx-8 card-cred py-10 flex flex-col items-center justify-center gap-3">
            <BookOpen className="h-8 w-8 text-[#1a1a1a]" />
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#222222]">No active batches</p>
            <Link href="/batches" className="text-[10px] font-black uppercase tracking-widest text-[var(--app-accent)] border border-[var(--app-accent)]/20 px-4 py-1.5 rounded-full">
              Create one
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-2 px-8">
            {activeBatches.map((batch) => (
              <Link
                key={batch.id}
                href="/batches"
                className="card-cred px-5 py-4 flex items-center justify-between active:scale-[0.99] transition-all group"
              >
                <div className="flex items-center gap-4">
                  {/* Color dot */}
                  <div className={cn(
                    "h-9 w-9 rounded-xl flex items-center justify-center text-[10px] font-black text-white shrink-0",
                    batch.color ? `bg-gradient-to-br ${batch.color}` : "bg-[#1a1a1a]"
                  )}>
                    {batch.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-[14px] font-black text-white group-hover:text-[var(--app-accent)] transition-colors">
                      {batch.name}
                    </p>
                    <p className="text-[10px] font-bold text-[#444444]">
                      {formatTimeRange(batch.startTime, batch.endTime)} · {batch.students} students
                    </p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-[#333333] shrink-0" />
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* ── STUDENT STATUS SNAPSHOT ── */}
      {!loading && students.length > 0 && (
        <section className="px-8 flex flex-col gap-3">
          <h2 className="text-[10px] font-black uppercase tracking-[0.35em] text-[#333333]">Student Snapshot</h2>
          <div className="card-cred p-5 flex items-center justify-around">
            <div className="flex flex-col items-center gap-1">
              <span className="text-[22px] font-black text-[var(--app-accent)]">{activeStudents}</span>
              <span className="text-[9px] font-black uppercase tracking-widest text-[#444444]">Active</span>
            </div>
            <div className="h-8 w-px bg-white/5" />
            <div className="flex flex-col items-center gap-1">
              <span className="text-[22px] font-black text-[#ffcc00]">{onHoldStudents}</span>
              <span className="text-[9px] font-black uppercase tracking-widest text-[#444444]">On Hold</span>
            </div>
            <div className="h-8 w-px bg-white/5" />
            <div className="flex flex-col items-center gap-1">
              <span className="text-[22px] font-black text-white">{students.length}</span>
              <span className="text-[9px] font-black uppercase tracking-widest text-[#444444]">Total</span>
            </div>
          </div>
        </section>
      )}

    </div>
  );
}
