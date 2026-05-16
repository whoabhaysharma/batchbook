"use client";

import { useEffect, useState } from "react";
import { IconSearch } from "@/components/icons/dashboard-icons";
import { cn } from "@/lib/utils";
import { 
  CreditCard, 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  MoreHorizontal,
  IndianRupee,
  Calendar
} from "lucide-react";
import { 
  Drawer, 
  DrawerContent, 
  DrawerHeader, 
  DrawerTitle, 
  DrawerDescription, 
  DrawerTrigger,
  DrawerClose
} from "@/components/ui/drawer";
import { APP_CONFIG } from "@/lib/config";

// Mock data for the ledger view
const MOCK_LEDGER = [
  { 
    id: "L001", 
    studentName: "Rahul Sharma", 
    batch: "Morning STEM", 
    amount: 5000, 
    month: "May 2026", 
    status: "pending",
    dueDate: "15 May"
  },
  { 
    id: "L002", 
    studentName: "Priya Patel", 
    batch: "Evening Arts", 
    amount: 3500, 
    month: "May 2026", 
    status: "overdue",
    dueDate: "10 May"
  },
  { 
    id: "L003", 
    studentName: "Amit Singh", 
    batch: "Morning STEM", 
    amount: 5000, 
    month: "May 2026", 
    status: "paid",
    dueDate: "15 May"
  }
];

export default function LedgerPage() {
  const [filter, setFilter] = useState("all");
  const [selectedEntry, setSelectedEntry] = useState<any>(null);
  const [payAmount, setPayAmount] = useState("");
  const [payRemarks, setPayRemarks] = useState("");

  const filteredLedger = MOCK_LEDGER.filter(item => 
    filter === "all" || item.status === filter
  );

  return (
    <div className="flex flex-col gap-10 pb-28">
      {/* 1. Page Header */}
      <header className="flex items-end justify-between px-8 pt-16">
        <div className="flex flex-col gap-1">
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[#333333]">
            Finance
          </p>
          <h1 className="text-4xl font-extrabold tracking-tighter text-white">
            Ledger
          </h1>
        </div>
        
        <div className="h-14 w-14 rounded-2xl bg-[#0d0d0d] border border-white/5 shadow-[neu-raised] flex items-center justify-center text-[var(--app-accent)] transition-all">
          <CreditCard className="h-6 w-6" />
        </div>
      </header>

      {/* 2. Financial Summary Overview */}
      <div className="px-8 grid grid-cols-2 gap-4">
        <div className="card-cred p-6 flex flex-col gap-2">
          <span className="text-[10px] font-black uppercase tracking-widest text-[#444444]">Collected</span>
          <span className="text-2xl font-black text-[var(--app-accent)]">₹12,500</span>
        </div>
        <div className="card-cred p-6 flex flex-col gap-2">
          <span className="text-[10px] font-black uppercase tracking-widest text-[#444444]">Pending</span>
          <span className="text-2xl font-black text-[#ff4d4d]">₹8,500</span>
        </div>
      </div>

      {/* 3. Filter Bar */}
      <div className="px-8 flex flex-col gap-6">
        <div className="flex gap-4 overflow-x-auto no-scrollbar">
           {["all", "pending", "overdue", "paid"].map((f) => (
             <button 
               key={f} 
               onClick={() => setFilter(f)}
               className={cn(
                 "whitespace-nowrap h-10 px-6 rounded-xl border border-white/5 text-[11px] font-black uppercase tracking-widest transition-all",
                 filter === f ? "bg-[#1a1a1a] text-white" : "text-[#333333]"
               )}
             >
               {f}
             </button>
           ))}
        </div>
      </div>

      {/* 4. Ledger Table / Cards */}
      <section className="flex flex-col gap-4 px-8">
        {filteredLedger.map((item) => (
          <Drawer key={item.id}>
            <DrawerTrigger asChild>
              <div className="card-cred p-6 flex items-center justify-between group active:scale-[0.98] transition-all cursor-pointer">
                <div className="flex flex-col gap-1">
                  <h4 className="text-[16px] font-black text-white group-hover:text-[var(--app-accent)] transition-colors">
                    {item.studentName}
                  </h4>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-[#444444] uppercase tracking-wider">{item.batch}</span>
                    <span className="h-1 w-1 rounded-full bg-[#222222]" />
                    <span className="text-[10px] font-bold text-[#444444] uppercase tracking-wider">{item.month}</span>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2">
                   <span className="text-[17px] font-black text-white">₹{item.amount.toLocaleString()}</span>
                   <div className={cn(
                     "flex items-center gap-1.5 px-2 py-0.5 rounded-md border border-white/5 text-[8px] font-black uppercase tracking-widest",
                     item.status === "paid" ? "text-[var(--app-accent)] bg-[var(--app-accent-soft)]" :
                     item.status === "overdue" ? "text-[#ff4d4d] bg-[#ff4d4d10]" :
                     "text-[#ffcc00] bg-[#ffcc0010]"
                   )}>
                     {item.status === "paid" ? <CheckCircle2 className="h-2 w-2" /> :
                      item.status === "overdue" ? <AlertCircle className="h-2 w-2" /> :
                      <Clock className="h-2 w-2" />}
                     {item.status}
                   </div>
                </div>
              </div>
            </DrawerTrigger>

            <DrawerContent>
               <DrawerHeader>
                 <DrawerTitle>Settle Dues</DrawerTitle>
                 <DrawerDescription>Record payment for {item.studentName}</DrawerDescription>
               </DrawerHeader>
               
               <div className="px-10 flex flex-col gap-8 pb-12 pt-4">
                  {/* Payment Details Card */}
                  <div className="p-6 rounded-2xl bg-[#0d0d0d] border border-white/5 shadow-[neu-pressed] flex flex-col gap-4">
                     <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black uppercase tracking-widest text-[#444444]">Total Outstanding</span>
                        <span className="text-2xl font-black text-white">₹{item.amount}</span>
                     </div>
                     <div className="h-px w-full bg-white/5" />
                     <div className="flex justify-between items-center text-[11px] font-bold">
                        <span className="text-[#444444]">Billing Month</span>
                        <span className="text-white uppercase">{item.month}</span>
                     </div>
                  </div>

                  {/* Payment Input */}
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-[#444444] px-1">Amount Paid</label>
                    <div className="relative">
                       <IndianRupee className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-[#333333]" />
                       <input 
                         type="number" 
                         defaultValue={item.amount}
                         className="h-16 w-full rounded-2xl bg-[#0d0d0d] border border-white/5 shadow-[neu-pressed] pl-16 pr-6 text-[18px] font-black text-white outline-none focus:border-[var(--app-accent)]/20 transition-all"
                         placeholder="0.00"
                       />
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-[#444444] px-1">Payment Remarks</label>
                    <textarea 
                      className="h-24 w-full rounded-2xl bg-[#0d0d0d] border border-white/5 shadow-[neu-pressed] p-6 text-[14px] font-medium text-white outline-none focus:border-[var(--app-accent)]/20 transition-all resize-none"
                      placeholder="e.g. Paid via UPI, Ref: 123456"
                    />
                  </div>

                  <DrawerClose asChild>
                    <button className="h-16 w-full btn-neon text-[13px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 active:scale-95 transition-all">
                       Confirm Receipt
                       <CheckCircle2 className="h-5 w-5" />
                    </button>
                  </DrawerClose>
               </div>
            </DrawerContent>
          </Drawer>
        ))}
      </section>
    </div>
  );
}
