"use client";

import { useEffect, useState } from "react";
import { IconSearch } from "@/components/icons/dashboard-icons";
import { cn, formatPeriod } from "@/lib/utils";
import { 
  CreditCard, 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  IndianRupee,
  Plus,
  ArrowRightLeft
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { APP_CONFIG } from "@/lib/config";
import { getLedgerEntries, getStudents, updateLedgerStatus, recordAdHocPayment, getEnrollmentsByStudentId, recordStudentPayment } from "@/lib/db";
import { Invoice } from "@/types/invoice";
import { Student } from "@/types/student";
import { useAuth } from "@/components/auth-provider";

export default function LedgerPage() {
  const { profile } = useAuth();
  const [ledger, setLedger] = useState<Invoice[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [studentsMap, setStudentsMap] = useState<Record<string, Student>>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [payAmount, setPayAmount] = useState("");
  const [payRemarks, setPayRemarks] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  // Ad-hoc payment state
  const [adHocOpen, setAdHocOpen] = useState(false);
  const [adHocStudentId, setAdHocStudentId] = useState("");
  const [adHocMonth, setAdHocMonth] = useState("");
  const [adHocAmount, setAdHocAmount] = useState("");
  const [adHocRemarks, setAdHocRemarks] = useState("");
  const [adHocSubmitting, setAdHocSubmitting] = useState(false);

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
      setStudents(studentsData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAdHocStudentChange = async (studentId: string) => {
    setAdHocStudentId(studentId);
    try {
      const enrollments = await getEnrollmentsByStudentId(studentId);
      const totalMonthlyFee = enrollments.reduce((acc: number, curr: any) => acc + (curr.monthlyFee || 0), 0);
      setAdHocAmount(totalMonthlyFee.toString());
    } catch (err) {
      console.error("Error fetching student monthly fee:", err);
      setAdHocAmount("0");
    }
  };

  const handleRecordAdHocPayment = async () => {
    if (!adHocStudentId || !adHocMonth || !adHocAmount || !profile?.tuitionId) return;
    setAdHocSubmitting(true);
    try {
      await recordAdHocPayment({
        studentId: adHocStudentId,
        tuitionId: profile.tuitionId,
        amount: Number(adHocAmount),
        billingMonth: adHocMonth,
        remarks: adHocRemarks,
      });
      setAdHocStudentId("");
      setAdHocMonth("");
      setAdHocAmount("");
      setAdHocRemarks("");
      setAdHocOpen(false);
      await fetchData();
    } catch (err) {
      console.error("Error recording ad-hoc payment:", err);
      alert("Failed to record payment.");
    } finally {
      setAdHocSubmitting(false);
    }
  };

  const getMonthOptions = () => {
    const options = [];
    const now = new Date();
    for (let i = -3; i <= 3; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const period = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
      const label = d.toLocaleString('default', { month: 'long', year: 'numeric' });
      options.push({ period, label });
    }
    return options;
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
        
        <Drawer open={adHocOpen} onOpenChange={setAdHocOpen}>
          <DrawerTrigger asChild>
            <button className="h-14 px-6 rounded-2xl bg-[#0d0d0d] border border-white/5 shadow-[neu-raised] flex items-center gap-2 text-[var(--app-accent)] active:shadow-[neu-pressed] transition-all text-[11px] font-black uppercase tracking-widest outline-none">
              <Plus className="h-4 w-4" /> Direct Pay
            </button>
          </DrawerTrigger>
          <DrawerContent>
            <DrawerHeader className="pb-2">
              <DrawerTitle>Direct Receipt Recording</DrawerTitle>
              <DrawerDescription>Collect fees instantly without pre-existing due entries.</DrawerDescription>
            </DrawerHeader>
            <div className="flex flex-col overflow-hidden max-h-[85vh]">
              <div className="px-10 flex flex-col gap-6 pb-6 overflow-y-auto pt-2 animate-fadeIn">
                
                {/* Student Selector */}
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.3em] text-[#444444] px-1">Select Student</label>
                  <Select onValueChange={handleAdHocStudentChange} value={adHocStudentId}>
                    <SelectTrigger className="h-14">
                      <SelectValue placeholder="Choose a student" />
                    </SelectTrigger>
                    <SelectContent>
                      {students.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name} ({s.batch || "No Batch"})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Billing Month Selector */}
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.3em] text-[#444444] px-1">Billing Month</label>
                  <Select onValueChange={setAdHocMonth} value={adHocMonth}>
                    <SelectTrigger className="h-14">
                      <SelectValue placeholder="Choose billing cycle" />
                    </SelectTrigger>
                    <SelectContent>
                      {getMonthOptions().map(({ period, label }) => (
                        <SelectItem key={period} value={period}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Amount Received Input */}
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.3em] text-[#444444] px-1">Amount Received (₹)</label>
                  <div className="relative">
                    <IndianRupee className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-[#444444]" />
                    <input
                      type="number"
                      value={adHocAmount}
                      onChange={(e) => setAdHocAmount(e.target.value)}
                      className="h-14 w-full rounded-2xl bg-[#0d0d0d] border border-white/5 shadow-[neu-pressed] pl-16 pr-6 text-[15px] font-bold text-white outline-none focus:border-[var(--app-accent)]/20 transition-all"
                      placeholder="e.g. 5000"
                    />
                  </div>
                </div>

                {/* Remarks / Payment Method */}
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.3em] text-[#444444] px-1">Remarks / Note</label>
                  <textarea
                    value={adHocRemarks}
                    onChange={(e) => setAdHocRemarks(e.target.value)}
                    className="h-20 w-full rounded-2xl bg-[#0d0d0d] border border-white/5 shadow-[neu-pressed] p-5 text-[13px] font-medium text-white outline-none focus:border-[var(--app-accent)]/20 transition-all resize-none"
                    placeholder="e.g. GPay Ref: 1029482, Cash handed directly"
                  />
                </div>

              </div>

              {/* Sticky Submit Button */}
              <div className="px-10 py-8 bg-[#0d0d0d] border-t border-white/5 shadow-[0_-20px_40px_rgba(0,0,0,0.4)]">
                <button
                  onClick={handleRecordAdHocPayment}
                  disabled={adHocSubmitting || !adHocStudentId || !adHocMonth || !adHocAmount}
                  className="h-16 w-full btn-neon text-[13px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 active:scale-95 transition-all disabled:opacity-30"
                >
                  {adHocSubmitting ? "Processing Transaction..." : "Record Ad-Hoc Receipt"}
                  <ArrowRightLeft className="h-5 w-5" />
                </button>
              </div>
            </div>
          </DrawerContent>
        </Drawer>
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

function LedgerItem({ item, student, onSettle }: { item: Invoice, student?: Student, onSettle: () => void }) {
  const [payAmount, setPayAmount] = useState((item.remainingAmount !== undefined ? item.remainingAmount : item.amount).toString());
  const [payRemarks, setPayRemarks] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [open, setOpen] = useState(false);

  const handleSettle = async () => {
    setIsUpdating(true);
    try {
      await recordStudentPayment(
        item.studentId,
        item.tuitionId,
        Number(payAmount) || (item.remainingAmount !== undefined ? item.remainingAmount : item.amount),
        payRemarks
      );
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
        paidAmount: 0,
        remainingAmount: item.amount,
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
  const displayDue = item.remainingAmount !== undefined ? item.remainingAmount : item.amount;

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
              <span className="text-[10px] font-bold text-[#444444] uppercase tracking-wider">{formatPeriod(item.billingPeriod)}</span>
            </div>
          </div>

          <div className="flex flex-col items-end gap-2">
             <span className="text-[17px] font-black text-white">₹{displayDue.toLocaleString()}</span>
             <div className={cn(
               "flex items-center gap-1.5 px-2 py-0.5 rounded-md border border-white/5 text-[8px] font-black uppercase tracking-widest",
               item.status === "paid" ? "text-[var(--app-accent)] bg-[var(--app-accent-soft)]" :
               item.status === "overdue" ? "text-[#ff4d4d] bg-[#ff4d4d10]" :
               item.status === "partial" ? "text-[#ffcc00] bg-[#ffcc0010]" :
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
                  <span className="text-2xl font-black text-white">₹{isPaid ? item.amount : displayDue}</span>
               </div>
               <div className="h-px w-full bg-white/5" />
               <div className="flex justify-between items-center text-[11px] font-bold">
                  <span className="text-[#444444]">Billing Cycle</span>
                  <span className="text-white uppercase">{formatPeriod(item.billingPeriod)}</span>
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





