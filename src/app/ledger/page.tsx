"use client";

import { useEffect, useState } from "react";
import { IconSearch } from "@/components/icons/dashboard-icons";
import { cn } from "@/lib/utils";
import { 
  CreditCard, 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  IndianRupee
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
import { getLedgerEntries, getStudents, updateLedgerStatus } from "@/lib/db";
import { FeeLedger } from "@/types/ledger";
import { Student } from "@/types/student";

export default function LedgerPage() {
  const [ledger, setLedger] = useState<FeeLedger[]>([]);
  const [studentsMap, setStudentsMap] = useState<Record<string, Student>>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [payAmount, setPayAmount] = useState("");
  const [payRemarks, setPayRemarks] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [ledgerData, studentsData] = await Promise.all([
        getLedgerEntries(),
        getStudents()
      ]);
      
      const sMap = studentsData.reduce((acc, s) => ({ ...acc, [s.id]: s }), {});
      setStudentsMap(sMap);
      setLedger(ledgerData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSettle = async (id: string) => {
    setIsUpdating(true);
    try {
      await updateLedgerStatus(id, {
        status: "paid",
        paidAt: Date.now(),
        remarks: payRemarks,
        amount: Number(payAmount) || undefined // If they changed the amount
      });
      setPayAmount("");
      setPayRemarks("");
      await fetchData();
    } catch (err) {
      console.error(err);
    } finally {
      setIsUpdating(false);
    }
  };

  const filteredLedger = ledger.filter(item => 
    filter === "all" || item.status === filter
  );

  const totalCollected = ledger
    .filter(l => l.status === "paid")
    .reduce((acc, curr) => acc + curr.amount, 0);

  const totalPending = ledger
    .filter(l => l.status === "pending" || l.status === "overdue")
    .reduce((acc, curr) => acc + curr.amount, 0);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#050505]">
        <div className="text-[10px] font-black uppercase tracking-widest text-[#333333] animate-pulse">
          Synchronizing Accounts...
        </div>
      </div>
    );
  }

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
      <div className="px-8 flex flex-col gap-4">
        <div className="card-cred p-8 flex flex-col items-center justify-center gap-3 bg-[#0d0d0d] border border-[#ff4d4d]/10">
          <span className="text-[11px] font-black uppercase tracking-[0.4em] text-[#444444]">Total Outstanding</span>
          <span className="text-4xl font-black text-[#ff4d4d] tracking-tighter">₹{totalPending.toLocaleString()}</span>
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

      {/* 4. Ledger Entries */}
      <section className="flex flex-col gap-4 px-8">
        {filteredLedger.map((item) => (
          <LedgerItem 
            key={item.id} 
            item={item} 
            student={studentsMap[item.studentId]} 
            onSettle={fetchData} 
          />
        ))}

        {filteredLedger.length === 0 && (
          <div className="h-60 flex items-center justify-center card-cred border-dashed border-white/10">
            <span className="text-[11px] font-black text-[#444444] uppercase tracking-[0.4em]">No Transactions Found</span>
          </div>
        )}
      </section>
    </div>
  );
}

function LedgerItem({ item, student, onSettle }: { item: FeeLedger, student?: Student, onSettle: () => void }) {
  const [payAmount, setPayAmount] = useState(item.amount.toString());
  const [payRemarks, setPayRemarks] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [open, setOpen] = useState(false);

  const handleSettle = async () => {
    setIsUpdating(true);
    try {
      await updateLedgerStatus(item.id, {
        status: "paid",
        paidAt: Date.now(),
        remarks: payRemarks,
        amount: Number(payAmount) || item.amount
      });
      setOpen(false);
      onSettle();
    } catch (err) {
      console.error(err);
      alert("Failed to confirm payment.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUnpay = async () => {
    setIsUpdating(true);
    try {
      await updateLedgerStatus(item.id, {
        status: "pending",
        paidAt: null as any,
        remarks: ""
      });
      setOpen(false);
      onSettle();
    } catch (err) {
      console.error(err);
      alert("Failed to revert payment.");
    } finally {
      setIsUpdating(false);
    }
  };

  const isPaid = item.status === "paid";

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <div className="card-cred p-6 flex items-center justify-between group active:scale-[0.98] transition-all cursor-pointer">
          <div className="flex flex-col gap-1">
            <h4 className="text-[16px] font-black text-white group-hover:text-[var(--app-accent)] transition-colors">
              {student?.name || "Unknown Student"}
            </h4>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-[#444444] uppercase tracking-wider">{student?.batch || "No Batch"}</span>
              <span className="h-1 w-1 rounded-full bg-[#222222]" />
              <span className="text-[10px] font-bold text-[#444444] uppercase tracking-wider">{item.billingMonth}</span>
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
           <DrawerTitle>{isPaid ? "Payment History" : "Record Receipt"}</DrawerTitle>
           <DrawerDescription>{isPaid ? `Payment already recorded for ${student?.name}` : `Process payment for ${student?.name}`}</DrawerDescription>
         </DrawerHeader>
         
         <div className="px-10 flex flex-col gap-8 pb-12 pt-4">
            <div className="p-6 rounded-2xl bg-[#0d0d0d] border border-white/5 shadow-[neu-pressed] flex flex-col gap-4">
               <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#444444]">{isPaid ? "Total Paid" : "Amount Due"}</span>
                  <span className="text-2xl font-black text-white">₹{item.amount}</span>
               </div>
               <div className="h-px w-full bg-white/5" />
               <div className="flex justify-between items-center text-[11px] font-bold">
                  <span className="text-[#444444]">Billing Cycle</span>
                  <span className="text-white uppercase">{item.billingMonth}</span>
               </div>
               {isPaid && item.remarks && (
                 <div className="pt-2 flex flex-col gap-1">
                   <span className="text-[9px] font-black uppercase text-[#333333] tracking-widest">Note</span>
                   <p className="text-[12px] font-medium text-[#666666] leading-relaxed">{item.remarks}</p>
                 </div>
               )}
            </div>

            {!isPaid ? (
              <>
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.3em] text-[#444444] px-1">Actual Received</label>
                  <div className="relative">
                     <IndianRupee className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-[#333333]" />
                     <input 
                       type="number" 
                       value={payAmount}
                       onChange={(e) => setPayAmount(e.target.value)}
                       className="h-16 w-full rounded-2xl bg-[#0d0d0d] border border-white/5 shadow-[neu-pressed] pl-16 pr-6 text-[18px] font-black text-white outline-none focus:border-[var(--app-accent)]/20 transition-all"
                     />
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.3em] text-[#444444] px-1">Payment Method / Remarks</label>
                  <textarea 
                    value={payRemarks}
                    onChange={(e) => setPayRemarks(e.target.value)}
                    className="h-24 w-full rounded-2xl bg-[#0d0d0d] border border-white/5 shadow-[neu-pressed] p-6 text-[14px] font-medium text-white outline-none focus:border-[var(--app-accent)]/20 transition-all resize-none"
                    placeholder="e.g. Paid via GPay, Cash to Mr. Abhay"
                  />
                </div>

                <button 
                  onClick={handleSettle}
                  disabled={isUpdating}
                  className="h-16 w-full btn-neon text-[13px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 active:scale-95 transition-all disabled:opacity-50"
                >
                   {isUpdating ? "Processing..." : "Confirm Receipt"}
                   <CheckCircle2 className="h-5 w-5" />
                </button>
              </>
            ) : (
              <button 
                onClick={handleUnpay}
                disabled={isUpdating}
                className="h-16 w-full rounded-2xl border border-[#ff4d4d]/20 bg-[#ff4d4d05] text-[#ff4d4d] text-[13px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 active:scale-95 transition-all disabled:opacity-50"
              >
                 {isUpdating ? "Reverting..." : "Unmark as Paid"}
                 <AlertCircle className="h-5 w-5" />
              </button>
            )}
         </div>
      </DrawerContent>
    </Drawer>
  );
}





