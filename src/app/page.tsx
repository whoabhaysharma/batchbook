"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { IconSearch, IconCalendar, IconUsers, IconPlus, IconCash } from "@/components/icons/dashboard-icons";
import { IconMore } from "@/components/icons/tab-icons";
import { getBatches, getMonthlyRevenue, getTuition, getStudents, getPendingDues, getRevenueHistory, getPaymentStats } from "@/lib/db";
import { type Batch } from "@/types/batch";
import { useAuth } from "@/components/auth-provider";
import { cn, formatTimeRange } from "@/lib/utils";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell,
  BarChart,
  Bar
} from 'recharts';

export default function HomePage() {
  const { profile } = useAuth();
  const now = new Date();
  const today = new Intl.DateTimeFormat("en", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(now);

  const [batches, setBatches] = useState<Batch[]>([]);
  const [loadingBatches, setLoadingBatches] = useState(true);
  const [revenue, setRevenue] = useState<number>(0);
  const [growth, setGrowth] = useState<number>(0);
  const [tuitionName, setTuitionName] = useState<string>("");
  const [studentCount, setStudentCount] = useState<number>(0);
  const [pendingDues, setPendingDues] = useState<number>(0);
  const [revenueHistory, setRevenueHistory] = useState<{ month: string, amount: number }[]>([]);
  const [paymentStats, setPaymentStats] = useState<{ status: string, count: number, amount: number }[]>([]);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const getMonthLabel = (date: Date) => {
    return date.toLocaleString('default', { month: 'long', year: 'numeric' });
  };

  useEffect(() => {
    if (profile?.tuitionId) {
      setLoadingBatches(true);
      getBatches(profile.tuitionId)
        .then(setBatches)
        .catch(err => console.error("Error fetching batches:", err))
        .finally(() => setLoadingBatches(false));
      getTuition(profile.tuitionId).then(t => setTuitionName((t as any)?.name || "BATCHBOOK"));
      getStudents(profile.tuitionId).then(s => setStudentCount(s.length));
      getPendingDues(profile.tuitionId).then(setPendingDues);
      getRevenueHistory(profile.tuitionId).then(setRevenueHistory);
      getPaymentStats(profile.tuitionId).then(setPaymentStats);
      
      const currentMonth = getMonthLabel(now);
      const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const prevMonth = getMonthLabel(prevMonthDate);

      Promise.all([
        getMonthlyRevenue(profile.tuitionId, currentMonth),
        getMonthlyRevenue(profile.tuitionId, prevMonth)
      ]).then(([currentRev, prevRev]) => {
        setRevenue(currentRev);
        if (prevRev > 0) {
          const growthPct = ((currentRev - prevRev) / prevRev) * 100;
          setGrowth(Math.round(growthPct));
        } else if (currentRev > 0) {
          setGrowth(100);
        }
      });
    }
  }, [profile]);

  return (
    <div className="flex flex-col gap-10 pb-20">
      {/* 1. CRED-style Header */}
      <header className="flex items-center justify-between px-8 pt-12">
        <div className="flex flex-col gap-1">
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[#333333]">
            {tuitionName} • PREMIER
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
          <Link href="/batches" className="text-[10px] font-bold text-[var(--app-accent)] active:opacity-50 transition-opacity">VIEW ALL</Link>
        </div>
        <div className="flex gap-6 overflow-x-auto px-8 pb-4 no-scrollbar w-full">
          {loadingBatches ? (
            <div className="px-8 py-10 card-cred w-full text-center text-[#444444] font-bold animate-pulse">
               Fetching active batches...
            </div>
          ) : batches.length > 0 ? (
            batches.map((batch, i) => (
              <div key={i} className={`card-cred min-w-[280px] flex flex-col gap-6 p-6 bg-gradient-to-br ${batch.color} to-transparent`}>
                <div className="flex items-center justify-between">
                  <div className="h-2 w-2 rounded-full bg-[var(--app-accent)] shadow-[0_0_8px_var(--app-accent)]" />
                  <span className="text-[10px] font-black text-[#666666] uppercase">{formatTimeRange(batch.startTime, batch.endTime)}</span>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white tracking-tight">{batch.name}</h3>
                  {batch.description && (
                    <p className="text-[11px] font-bold text-[#555555] truncate max-w-[232px] mb-1">
                      {batch.description}
                    </p>
                  )}
                  <p className="text-sm font-bold text-[#444444]">{batch.students} Students</p>
                </div>
              </div>
            ))
          ) : (
            <div className="px-8 py-10 card-cred w-full text-center text-[#444444] font-bold flex flex-col items-center justify-center gap-3">
              <span className="text-sm text-[#555555]">No active batches yet</span>
              <Link href="/batches" className="text-[10px] font-black tracking-wider text-[var(--app-accent)] border border-[var(--app-accent)]/20 px-4 py-1.5 rounded-full hover:bg-[var(--app-accent)]/10 transition-colors uppercase">
                Create Batch
              </Link>
            </div>
          )}
        </div>
      </section>


      {/* 3. Center Analytics Section */}
      <section className="px-8">
        <div className="card-cred p-8 flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#666666]">Center Revenue</p>
            <h3 className="text-4xl font-black text-white tracking-tighter">₹ {revenue.toLocaleString()}</h3>
            <p className={cn(
              "text-[11px] font-bold",
              growth >= 0 ? "text-[var(--app-accent)]" : "text-red-500"
            )}>
              {growth >= 0 ? "+" : ""}{growth}% this month
            </p>
          </div>
          <div className="h-12 w-12 rounded-2xl bg-[#0d0d0d] border border-white/5 shadow-[neu-raised] flex items-center justify-center text-[var(--app-accent)]">
             <IconCash className="h-6 w-6" />
          </div>
        </div>
      </section>

      {/* 4. Analytics Dashboard */}
      <section className="flex flex-col gap-8 px-8">
        <div className="flex items-center justify-between">
          <h3 className="text-[11px] font-black uppercase tracking-[0.4em] text-[#444444]">Analytics</h3>
          <Link href="/ledger" className="text-[10px] font-bold text-[var(--app-accent)] uppercase">Full Report</Link>
        </div>

        <div className="flex flex-col gap-6">
          <div className="card-cred p-6 bg-[#0d0d0d] overflow-hidden">
             <h4 className="text-[11px] font-black uppercase tracking-widest text-[#666666] mb-4">Revenue Trend</h4>
             <div className="h-[200px] w-full">
               {isClient && (
                 <ResponsiveContainer width="100%" height="100%">
                   <LineChart data={revenueHistory.length > 0 ? revenueHistory : [{ month: 'N/A', amount: 0 }]}>
                     <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" vertical={false} />
                     <XAxis 
                       dataKey="month" 
                       hide={revenueHistory.length === 0}
                       axisLine={false}
                       tickLine={false}
                       tick={{ fill: '#333', fontSize: 10, fontWeight: 'bold' }}
                     />
                     <Tooltip 
                       contentStyle={{ backgroundColor: "#000", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", fontSize: "12px", fontWeight: "bold" }}
                       itemStyle={{ color: "var(--app-accent)" }}
                     />
                     <Line 
                       type="monotone" 
                       dataKey="amount" 
                       stroke="var(--app-accent)" 
                       strokeWidth={3} 
                       dot={{ r: 4, fill: "var(--app-accent)", strokeWidth: 0 }} 
                       activeDot={{ r: 6, fill: "var(--app-accent)", stroke: "#fff", strokeWidth: 2 }}
                     />
                   </LineChart>
                 </ResponsiveContainer>
               )}
             </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Batch Enrollment Bar Chart */}
            <div className="card-cred p-6 h-48 bg-[#0d0d0d] flex flex-col justify-between">
               <h4 className="text-[11px] font-black uppercase tracking-widest text-[#666666]">Batch Occupancy</h4>
               <div className="h-[96px] w-full mt-2">
                  {isClient && (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={(batches.length > 0 ? batches.slice(0, 4) : [{ name: 'N/A', students: 0 }]) as any}>
                        <Bar 
                          dataKey="students" 
                          fill="var(--app-accent)" 
                          radius={[4, 4, 0, 0]}
                          barSize={20}
                        />
                        <XAxis 
                          dataKey="name" 
                          hide 
                        />
                        <Tooltip 
                          contentStyle={{ backgroundColor: "#000", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", fontSize: "10px", fontWeight: "bold" }}
                          itemStyle={{ color: "var(--app-accent)" }}
                          cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
               </div>
            </div>

            {/* Quick Stats Widget */}
            <div className="card-cred p-6 h-48 flex flex-col justify-between bg-[#0d0d0d]">
               <div className="flex flex-col gap-1">
                 <h4 className="text-[11px] font-black uppercase tracking-widest text-[#666666]">Total Dues</h4>
                 <span className="text-2xl font-black text-[#ff4d4d]">₹{(pendingDues/1000).toFixed(1)}k</span>
               </div>
               <div className="flex flex-col gap-1">
                 <h4 className="text-[11px] font-black uppercase tracking-widest text-[#666666]">Students</h4>
                 <span className="text-2xl font-black text-white">{studentCount}</span>
               </div>
            </div>
          </div>
        </div>
      </section>


      {/* 5. Date Footer */}
      <footer className="text-center pb-8">
        <p className="text-[11px] font-black uppercase tracking-[0.3em] text-[#222222]">{today}</p>
      </footer>
    </div>
  );
}




