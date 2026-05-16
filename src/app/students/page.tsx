"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { IconPlus, IconUsers, IconSearch } from "@/components/icons/dashboard-icons";
import { getStudents } from "@/lib/db";
import { type Student } from "@/types/student";

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getStudents().then((data) => {
      setStudents(data);
      setLoading(false);
    });
  }, []);

  return (
    <div className="flex flex-col gap-10 pb-28">
      {/* 1. CRED-style Page Header */}
      <header className="flex items-end justify-between px-8 pt-16">
        <div className="flex flex-col gap-1">
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[#333333]">
            Directory
          </p>
          <h1 className="text-4xl font-extrabold tracking-tighter text-white">
            Students
          </h1>
        </div>
        <button className="h-14 w-14 rounded-2xl bg-[#0d0d0d] border border-white/5 shadow-[neu-raised] flex items-center justify-center text-[var(--app-accent)] active:shadow-[neu-pressed] transition-all">
          <IconPlus className="h-7 w-7" />
        </button>
      </header>

      {/* 2. Neomorphic Search Bar */}
      <div className="px-8 flex flex-col gap-6">
        <div className="relative group">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-[#444444] group-focus-within:text-[var(--app-accent)] transition-colors">
            <IconSearch className="h-5 w-5" />
          </div>
          <input
            type="text"
            className="h-14 w-full rounded-2xl bg-[#0d0d0d] border border-white/5 shadow-[neu-pressed] px-12 text-[14px] font-bold text-white outline-none placeholder-[#333333] transition-all focus:border-[var(--app-accent)]/20"
            placeholder="Search directory..."
          />
        </div>

        {/* 2.1 Filter Tags (Moved to Top) */}
        <div className="flex gap-4 overflow-x-auto no-scrollbar">
           {["All", "New Enrolled", "Defaulters", "Archived"].map((filter, i) => (
             <button key={i} className={`whitespace-nowrap h-10 px-6 rounded-xl border border-white/5 text-[11px] font-black uppercase tracking-widest transition-all ${i === 0 ? "bg-[#1a1a1a] text-white" : "text-[#333333]"}`}>
               {filter}
             </button>
           ))}
        </div>
      </div>

      {/* 3. Neomorphic Student List */}
      <section className="flex flex-col gap-5 px-8">
        <div className="flex items-center justify-between mb-2">
           <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-[#444444]">Recent Members</h3>
           <span className="text-[10px] font-bold text-[#666666]">TOTAL: {students.length}</span>
        </div>
        
        {loading ? (
           <div className="card-cred p-10 text-center text-[#444444] font-black uppercase tracking-widest">
             Loading directory...
           </div>
        ) : students.map((student, i) => (
          <Link href={`/students/${student.id}`} key={i} className="card-cred p-6 flex items-center gap-6 group active:scale-[0.98] transition-all">
            <div className="relative">
              <div className="h-16 w-16 rounded-2xl bg-[#0d0d0d] border border-white/5 shadow-[neu-raised] flex items-center justify-center overflow-hidden">
                <img
                  src={student.avatar}
                  alt={student.name}
                  className="h-12 w-12 rounded-full grayscale opacity-60 group-active:grayscale-0 group-active:opacity-100 transition-all"
                />
              </div>
              {student.status === "PAID" && (
                 <div className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-[var(--app-accent)] border-2 border-[#141414]" />
              )}
            </div>

            <div className="flex-1 flex flex-col gap-0.5">
              <h4 className="text-[17px] font-black text-white group-active:text-[var(--app-accent)] transition-colors">
                {student.name}
              </h4>
              <p className="text-[11px] font-bold text-[#444444] uppercase tracking-wider">
                {student.batch} • {student.rollNumber}
              </p>
            </div>

            <div className={`text-[9px] font-black tracking-widest px-2 py-1 rounded-md border border-white/5 ${student.status === "PAID" ? "text-[var(--app-accent)] bg-[var(--app-accent-soft)]" : "text-[#ff4d4d] bg-[#ff4d4d10]"}`}>
              {student.status}
            </div>
          </Link>
        ))}
      </section>
    </div>

  );
}


