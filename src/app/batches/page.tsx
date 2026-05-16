"use client";

import { useEffect, useState } from "react";
import type { Metadata } from "next";
import { IconPlus, IconCalendar, IconUsers } from "@/components/icons/dashboard-icons";
import { getBatches, type Batch } from "@/lib/db";

export default function BatchesPage() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getBatches().then((data) => {
      setBatches(data);
      setLoading(false);
    });
  }, []);

  return (
    <div className="flex flex-col gap-10 pb-28">
      {/* 1. CRED-style Page Header */}
      <header className="flex items-end justify-between px-8 pt-16">
        <div className="flex flex-col gap-1">
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[#333333]">
            Administration
          </p>
          <h1 className="text-4xl font-extrabold tracking-tighter text-white">
            Batches
          </h1>
        </div>
        <button className="h-14 w-14 rounded-2xl bg-[#0d0d0d] border border-white/5 shadow-[neu-raised] flex items-center justify-center text-[var(--app-accent)] active:shadow-[neu-pressed] transition-all">
          <IconPlus className="h-7 w-7" />
        </button>
      </header>

      {/* 2. Batch Search / Filter (Minimalist) */}
      <div className="px-8">
        <div className="flex items-center gap-4 rounded-2xl bg-[#111111] border border-white/5 p-1">
           <button className="flex-1 h-10 rounded-xl bg-[#1a1a1a] text-[11px] font-black uppercase tracking-widest text-white">Active</button>
           <button className="flex-1 h-10 rounded-xl text-[11px] font-black uppercase tracking-widest text-[#444444]">Completed</button>
           <button className="flex-1 h-10 rounded-xl text-[11px] font-black uppercase tracking-widest text-[#444444]">Archived</button>
        </div>
      </div>

      {/* 3. Neomorphic Batch List */}
      <section className="flex flex-col gap-6 px-8">
        {loading ? (
           <div className="card-cred p-10 text-center text-[#444444] font-black uppercase tracking-widest">
             Loading batches...
           </div>
        ) : batches.map((batch, i) => (
          <div key={i} className="card-cred p-8 flex flex-col gap-6 group active:scale-[0.98] transition-all relative overflow-hidden">
            <div className="flex items-start justify-between relative z-10">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-black tracking-[0.2em] text-[#444444]">{batch.id}</span>
                <h3 className="text-2xl font-black text-white tracking-tight group-active:text-[var(--app-accent)] transition-colors">
                  {batch.name}
                </h3>
              </div>
              <div className={`text-[10px] font-black tracking-widest px-3 py-1 rounded-full bg-black/40 border border-white/5 ${batch.color || "text-[var(--app-accent)]"}`}>
                {batch.status}
              </div>
            </div>

            <div className="flex items-center gap-8 relative z-10">
              <div className="flex items-center gap-2">
                <IconUsers className="h-5 w-5 text-[#333333]" />
                <span className="text-[13px] font-bold text-[#666666]">{batch.students} Members</span>
              </div>
              <div className="flex items-center gap-2">
                <IconCalendar className="h-5 w-5 text-[#333333]" />
                <span className="text-[13px] font-bold text-[#666666]">{batch.time || "Flexible"}</span>
              </div>
            </div>

            {/* Subtle background glow for active batches */}
            {batch.status === "ACTIVE" && (
               <div className="absolute -right-12 -top-12 h-24 w-24 bg-[var(--app-accent)] opacity-[0.03] blur-3xl pointer-events-none" />
            )}
          </div>
        ))}
      </section>


      {/* 4. Empty State / Action */}
      <footer className="px-8 text-center pt-4">
        <button className="text-[11px] font-black uppercase tracking-[0.3em] text-[#333333] hover:text-[#555555] transition-colors">
          Download Schedule PDF
        </button>
      </footer>
    </div>
  );
}


