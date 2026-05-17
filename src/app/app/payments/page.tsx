"use client";

import { useEffect, useState } from "react";
import { cn, formatPeriod } from "@/lib/utils";
import { 
  CreditCard, 
  Clock, 
  Plus, 
  IndianRupee,
  CheckCircle2, 
  History,
  AlertCircle,
  ArrowRightLeft,
  FileText
} from "lucide-react";
import { 
  Drawer, 
  DrawerContent, 
  DrawerHeader, 
  DrawerTitle, 
  DrawerDescription, 
  DrawerTrigger 
} from "@/components/ui/drawer";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getPayments, getStudents, getLedgerEntries, recordStudentPayment, getEnrollmentsByStudentId } from "@/lib/db";
import { Invoice } from "@/types/invoice";
import { Student } from "@/types/student";
import { useAuth } from "@/components/auth-provider";

interface PaymentLog {
  id: string;
  studentId: string;
  tuitionId: string;
  amount: number;
  paymentDate: number;
  remarks: string;
  createdAt: any;
}

type Tab = "payments" | "invoices";

export default function FinancePage() {
  const { profile } = useAuth();
  const [tab, setTab] = useState<Tab>("payments");

  // Shared data
  const [students, setStudents] = useState<Student[]>([]);
  const [studentsMap, setStudentsMap] = useState<Record<string, Student>>({});
  const [loading, setLoading] = useState(true);

  // Payments tab
  const [payments, setPayments] = useState<PaymentLog[]>([]);

  // Invoices tab
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [invoiceFilter, setInvoiceFilter] = useState("all");

  // Direct Pay form (owner only)
  const [payOpen, setPayOpen] = useState(false);
  const [targetStudentId, setTargetStudentId] = useState("");
  const [amountReceived, setAmountReceived] = useState("");
  const [remarks, setRemarks] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [paymentsData, studentsData, invoicesData] = await Promise.all([
        getPayments(),
        getStudents(),
        getLedgerEntries(),
      ]);
      const sMap = studentsData.reduce((acc, s) => ({ ...acc, [s.id]: s }), {});
      setStudentsMap(sMap);
      setStudents(studentsData);
      setPayments(paymentsData);
      setInvoices(invoicesData);
    } catch (err) {
      console.error("Error loading finance data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleStudentSelect = async (studentId: string) => {
    setTargetStudentId(studentId);
    try {
      const enrollments = await getEnrollmentsByStudentId(studentId);
      const totalFee = enrollments.reduce((acc: number, curr: any) => acc + (curr.monthlyFee || 0), 0);
      setAmountReceived(totalFee.toString());
    } catch {
      setAmountReceived("0");
    }
  };

  const handleRecordDirectPay = async () => {
    if (!targetStudentId || !amountReceived || !profile?.tuitionId) return;
    setIsSubmitting(true);
    try {
      await recordStudentPayment(targetStudentId, profile.tuitionId, Number(amountReceived), remarks);
      setTargetStudentId("");
      setAmountReceived("");
      setRemarks("");
      setPayOpen(false);
      await fetchData();
    } catch (err) {
      console.error(err);
      alert("Failed to record payment.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalCollected = payments.reduce((acc, p) => acc + (p.amount || 0), 0);
  const totalOutstanding = invoices
    .filter(l => l.status !== "paid" && l.status !== "cancelled")
    .reduce((acc, curr) => acc + (curr.remainingAmount ?? curr.amount), 0);
  const filteredInvoices = invoices.filter(i => invoiceFilter === "all" || i.status === invoiceFilter);
  const isOwner = profile?.role === "owner";

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#050505]">
        <div className="text-[10px] font-black uppercase tracking-widest text-[#333333] animate-pulse">
          Synchronizing Finance...
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 pb-28">

      {/* 1. Header */}
      <header className="flex items-end justify-between px-8 pt-16">
        <div className="flex flex-col gap-1">
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[#333333]">Finance</p>
          <h1 className="text-4xl font-extrabold tracking-tighter text-white">
            {tab === "payments" ? "Payments" : "Invoices"}
          </h1>
        </div>

        {/* Direct Pay — owner only, only on payments tab */}
        {isOwner && tab === "payments" && (
          <Drawer open={payOpen} onOpenChange={setPayOpen}>
            <DrawerTrigger asChild>
              <button className="h-14 px-6 rounded-2xl bg-[#0d0d0d] border border-white/5 shadow-[neu-raised] flex items-center gap-2 text-[var(--app-accent)] active:shadow-[neu-pressed] transition-all text-[11px] font-black uppercase tracking-widest outline-none">
                <Plus className="h-4 w-4" /> Pay
              </button>
            </DrawerTrigger>
            <DrawerContent>
              <DrawerHeader className="pb-2">
                <DrawerTitle>Direct Receipt Recording</DrawerTitle>
                <DrawerDescription>Fees are automatically allocated across outstanding invoices.</DrawerDescription>
              </DrawerHeader>
              <div className="flex flex-col overflow-hidden max-h-[80vh]">
                <div className="px-10 flex flex-col gap-6 pb-6 overflow-y-auto pt-2">
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-[#444444] px-1">Student</label>
                    <Select onValueChange={handleStudentSelect} value={targetStudentId}>
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

                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-[#444444] px-1">Amount Received (₹)</label>
                    <div className="relative">
                      <IndianRupee className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-[#444444]" />
                      <input
                        type="number"
                        value={amountReceived}
                        onChange={(e) => setAmountReceived(e.target.value)}
                        className="h-14 w-full rounded-2xl bg-[#0d0d0d] border border-white/5 shadow-[neu-pressed] pl-16 pr-6 text-[15px] font-bold text-white outline-none focus:border-[var(--app-accent)]/20 transition-all"
                        placeholder="e.g. 5000"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-[#444444] px-1">Remarks / Note</label>
                    <textarea
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                      className="h-20 w-full rounded-2xl bg-[#0d0d0d] border border-white/5 shadow-[neu-pressed] p-5 text-[13px] font-medium text-white outline-none focus:border-[var(--app-accent)]/20 transition-all resize-none"
                      placeholder="e.g. GPay Ref: 1029482, Cash"
                    />
                  </div>
                </div>

                <div className="px-10 py-8 bg-[#0d0d0d] border-t border-white/5">
                  <button
                    onClick={handleRecordDirectPay}
                    disabled={isSubmitting || !targetStudentId || !amountReceived}
                    className="h-16 w-full btn-neon text-[13px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 active:scale-95 transition-all disabled:opacity-30 disabled:pointer-events-none"
                  >
                    {isSubmitting ? "Recording..." : "Record Receipt"}
                    <CheckCircle2 className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </DrawerContent>
          </Drawer>
        )}
      </header>

      {/* 2. Segment Switcher */}
      <section className="px-8">
        <div className="flex p-1 rounded-2xl bg-[#0d0d0d] border border-white/5 shadow-[neu-pressed]">
          <button
            onClick={() => setTab("payments")}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 h-11 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all",
              tab === "payments"
                ? "bg-[#1a1a1a] text-white shadow-[neu-raised] border border-white/10"
                : "text-[#444444]"
            )}
          >
            <CreditCard className="h-3.5 w-3.5" />
            Payments
          </button>
          <button
            onClick={() => setTab("invoices")}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 h-11 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all",
              tab === "invoices"
                ? "bg-[#1a1a1a] text-white shadow-[neu-raised] border border-white/10"
                : "text-[#444444]"
            )}
          >
            <FileText className="h-3.5 w-3.5" />
            Invoices
          </button>
        </div>
      </section>

      {/* 3. Payments Tab */}
      {tab === "payments" && (
        <>
          {/* Stats */}
          <section className="px-8">
            <div className="card-cred p-8 flex items-center justify-between shadow-[neu-pressed]">
              <div className="flex flex-col gap-1">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#666666]">Total Collected</p>
                <h3 className="text-4xl font-black text-white tracking-tighter">₹ {totalCollected.toLocaleString()}</h3>
                <p className="text-[11px] font-bold text-[var(--app-accent)]">Across all receipts</p>
              </div>
              <div className="h-12 w-12 rounded-2xl bg-[#0d0d0d] border border-white/5 shadow-[neu-raised] flex items-center justify-center text-[var(--app-accent)]">
                <CreditCard className="h-6 w-6" />
              </div>
            </div>
          </section>

          {/* Receipt feed */}
          <section className="px-8 flex flex-col gap-3">
            <h2 className="text-[11px] font-black uppercase tracking-[0.3em] text-[#444444]">Receipt Feed</h2>
            {payments.map((p) => {
              const student = studentsMap[p.studentId];
              const dateStr = new Date(p.paymentDate).toLocaleString("en-IN", {
                day: "numeric", month: "short", year: "numeric",
                hour: "2-digit", minute: "2-digit",
              });
              return (
                <div key={p.id} className="card-cred p-5 flex items-center justify-between bg-[#0d0d0d] border border-white/5 rounded-2xl">
                  <div className="flex flex-col gap-0.5 overflow-hidden flex-1 pr-4">
                    <h4 className="text-[15px] font-black text-white truncate">{student?.name || "Unknown Student"}</h4>
                    <span className="text-[10px] font-bold text-[#444444] uppercase tracking-wider">{student?.batch || "—"} • {dateStr}</span>
                    {p.remarks && (
                      <p className="text-[11px] text-[#555555] italic line-clamp-1 mt-0.5">"{p.remarks}"</p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className="text-[17px] font-black text-[var(--app-accent)]">+₹{p.amount.toLocaleString()}</span>
                    <div className="flex items-center gap-1 text-[8px] font-black uppercase tracking-widest text-[#444444]">
                      <CheckCircle2 className="h-2.5 w-2.5 text-[var(--app-accent)]" />
                      Cleared
                    </div>
                  </div>
                </div>
              );
            })}
            {payments.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 gap-3 border border-white/5 border-dashed rounded-3xl bg-[#030303]">
                <History className="h-8 w-8 text-[#1a1a1a]" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#222222]">No Payments Yet</span>
              </div>
            )}
          </section>
        </>
      )}

      {/* 4. Invoices Tab */}
      {tab === "invoices" && (
        <>
          {/* Outstanding stat */}
          <section className="px-8">
            <div className="card-cred p-8 flex items-center justify-between shadow-[neu-pressed]">
              <div className="flex flex-col gap-1">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#666666]">Outstanding Amount</p>
                <h3 className="text-4xl font-black text-[#ff4d4d] tracking-tighter">₹{totalOutstanding.toLocaleString()}</h3>
                <p className="text-[11px] font-bold text-[#444444]">Uncollected dues</p>
              </div>
              <div className="h-12 w-12 rounded-2xl bg-[#0d0d0d] border border-white/5 shadow-[neu-raised] flex items-center justify-center text-[#ff4d4d]">
                <AlertCircle className="h-6 w-6" />
              </div>
            </div>
          </section>

          {/* Status filters */}
          <section className="px-8 flex gap-2 overflow-x-auto scrollbar-none py-1">
            {["all", "pending", "partial", "overdue", "paid"].map((f) => (
              <button
                key={f}
                onClick={() => setInvoiceFilter(f)}
                className={cn(
                  "h-9 px-4 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border outline-none active:scale-[0.98] shrink-0",
                  invoiceFilter === f
                    ? "bg-white text-black border-white shadow-[neu-raised]"
                    : "bg-[#0d0d0d] text-[#444444] border-white/5 shadow-[neu-pressed]"
                )}
              >
                {f}
              </button>
            ))}
          </section>

          {/* Invoice list */}
          <section className="px-8 flex flex-col gap-3">
            {filteredInvoices.map((item) => {
              const student = studentsMap[item.studentId];
              const displayDue = item.remainingAmount ?? item.amount;
              return (
                <div key={item.id} className="card-cred p-5 flex items-center justify-between bg-[#0d0d0d] border border-white/5 rounded-2xl">
                  <div className="flex flex-col gap-1">
                    <h4 className="text-[15px] font-black text-white">{student?.name || "Unknown Student"}</h4>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-[#444444] uppercase tracking-wider">{student?.batch || "—"}</span>
                      <span className="h-1 w-1 rounded-full bg-[#222222]" />
                      <span className="text-[10px] font-bold text-[#444444] uppercase tracking-wider">{formatPeriod(item.billingPeriod)}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className="text-[16px] font-black text-white">₹{displayDue.toLocaleString()}</span>
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
              );
            })}
            {filteredInvoices.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 gap-3 border border-white/5 border-dashed rounded-3xl bg-[#030303]">
                <ArrowRightLeft className="h-8 w-8 text-[#1a1a1a]" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#222222]">No Invoices Found</span>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
