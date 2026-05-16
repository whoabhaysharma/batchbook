"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { IconSearch, IconCalendar, IconUsers, IconPlus, IconCash } from "@/components/icons/dashboard-icons";
import { IconMore } from "@/components/icons/tab-icons";
import { getBatches, type Batch } from "@/lib/db";

export default function HomePage() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const today = new Intl.DateTimeFormat("en", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date());

  useEffect(() => {
    getBatches().then(setBatches);
  }, []);

  return (
    <div className="flex flex-col gap-10 pb-20">
      {/* 1. CRED-style Header */}
      <header className="flex items-center justify-between px-8 pt-12">
        <div className="flex flex-col gap-1">
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[#333333]">
            BATCHBOOK • PREMIER
          </p>
          <h1 className="text-4xl font-extrabold tracking-tighter text-white">
            Home
          </h1>
        </div>
        <div className="h-14 w-14 rounded-full bg-[#111111] border border-white/5 flex items-center justify-center shadow-[neu-raised] active:scale-95 transition-all">
          <img
            src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix"
            alt="Profile"
            className="h-10 w-10 rounded-full grayscale opacity-60"
          />
        </div>
      </header>

      {/* 2. Horizontal Batch Slider */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between px-8">
          <h2 className="text-[11px] font-black uppercase tracking-[0.3em] text-[#444444]">Active Batches</h2>
          <span className="text-[10px] font-bold text-[var(--app-accent)]">VIEW ALL</span>
        </div>
        <div className="flex gap-6 overflow-x-auto px-8 pb-4 no-scrollbar">
          {batches.length > 0 ? batches.map((batch, i) => (
            <div key={i} className={`card-cred min-w-[280px] flex flex-col gap-6 p-6 bg-gradient-to-br ${batch.color} to-transparent`}>
              <div className="flex items-center justify-between">
                <div className="h-2 w-2 rounded-full bg-[var(--app-accent)] shadow-[0_0_8px_var(--app-accent)]" />
                <span className="text-[10px] font-black text-[#666666] uppercase">{batch.time}</span>
              </div>
              <div>
                <h3 className="text-xl font-bold text-white tracking-tight">{batch.name}</h3>
                <p className="text-sm font-bold text-[#444444]">{batch.students} Students</p>
              </div>
            </div>
          )) : (
            <div className="px-8 py-10 card-cred w-full text-center text-[#444444] font-bold">
               Fetching active batches...
            </div>
          )}
        </div>
      </section>


      {/* 3. Center Analytics Section */}
      <section className="px-8">
        <div className="card-cred p-8 flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#666666]">Center Revenue</p>
            <h3 className="text-4xl font-black text-white tracking-tighter">₹ 42,500</h3>
            <p className="text-[11px] font-bold text-[var(--app-accent)]">+12% this month</p>
          </div>
          <div className="h-12 w-12 rounded-2xl bg-[#0d0d0d] border border-white/5 shadow-[neu-raised] flex items-center justify-center text-[var(--app-accent)]">
             <IconCash className="h-6 w-6" />
          </div>
        </div>
      </section>

      {/* 4. Simple Explore Management Grid */}
      <section className="flex flex-col gap-6 px-8">
        <h3 className="text-[11px] font-black uppercase tracking-[0.4em] text-[#444444]">Management</h3>
        <div className="grid grid-cols-1 gap-4">
          {[
            { label: "Fee Management", icon: IconCash, desc: "Track and collect installments" },
            { label: "Student Directory", icon: IconUsers, desc: "Guardian contacts & academic history" },
            { label: "Batch Schedules", icon: IconPlus, desc: "Manage timings and assignments" },
          ].map((item, i) => (
            <div key={i} className="card-cred p-6 flex items-center gap-6 group active:scale-[0.98] transition-all">
              <div className="h-12 w-12 rounded-2xl bg-[#0d0d0d] border border-white/5 shadow-[neu-raised] flex items-center justify-center text-[#666666] group-active:text-[var(--app-accent)] shrink-0">
                <item.icon className="h-6 w-6" />
              </div>
              <div>
                <h4 className="text-[16px] font-extrabold text-white">{item.label}</h4>
                <p className="text-[12px] font-bold text-[#333333] leading-tight">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>


      {/* 5. Date Footer */}
      <footer className="text-center pb-8">
        <p className="text-[11px] font-black uppercase tracking-[0.3em] text-[#222222]">{today}</p>
      </footer>
    </div>
  );
}




