"use client";

import { useState, useEffect } from "react";
import { IconCalendar, IconCash, IconUsers, IconPlus } from "@/components/icons/dashboard-icons";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/auth-provider";
import { 
  getStudentById, 
  getEnrollmentsByStudentId, 
  updateStudent, 
  forceGenerateInvoice,
  getInvoicesByStudentId,
  getPaymentsByStudentId
} from "@/lib/db";
import { Student } from "@/types/student";
import { SubjectEnrollment } from "@/types/enrollment";
import { Invoice } from "@/types/invoice";
import { useParams } from "next/navigation";
import { formatPeriod } from "@/lib/utils";
import { ChevronDown, ChevronUp, Wrench, Sparkles, CheckCircle2, AlertCircle } from "lucide-react";

export default function StudentDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const { profile } = useAuth();
  const [isMounted, setIsMounted] = useState(false);
  const [student, setStudent] = useState<Student | null>(null);
  const [enrollments, setEnrollments] = useState<SubjectEnrollment[]>([]);
  const [loading, setLoading] = useState(true);

  // Status management modal states
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<"active" | "inactive" | "on-hold">("active");
  const [isUpdating, setIsUpdating] = useState(false);

  // Payments and Invoices states
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"curriculum" | "invoices" | "payments">("curriculum");

  // Force invoice generation states (not upfront)
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [billingPeriodInput, setBillingPeriodInput] = useState(() => {
    const today = new Date();
    const y = today.getFullYear();
    const m = (today.getMonth() + 1).toString().padStart(2, "0");
    return `${y}-${m}`;
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [genMessage, setGenMessage] = useState<{ text: string; isError: boolean } | null>(null);

  const handleForceGenerate = async () => {
    if (!student || !profile?.tuitionId) return;
    setIsGenerating(true);
    setGenMessage(null);
    try {
      await forceGenerateInvoice(student.id, profile.tuitionId, billingPeriodInput);
      setGenMessage({ text: `Success! Invoice generated for ${billingPeriodInput}.`, isError: false });
      // Reload invoices list in real-time
      const updatedInvoices = await getInvoicesByStudentId(student.id);
      setInvoices(updatedInvoices);
    } catch (err: any) {
      console.error(err);
      setGenMessage({ text: err.message || "Failed to forcefully generate invoice.", isError: true });
    } finally {
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    setIsMounted(true);
    if (!id) return;
    
    const fetchStudentData = async () => {
      try {
        const [studentData, enrollmentData, invoicesData, paymentsData] = await Promise.all([
          getStudentById(id),
          getEnrollmentsByStudentId(id),
          getInvoicesByStudentId(id),
          getPaymentsByStudentId(id)
        ]);
        setStudent(studentData);
        setEnrollments(enrollmentData);
        setInvoices(invoicesData);
        setPayments(paymentsData);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchStudentData();
  }, [id]);

  const totalFee = enrollments.reduce((acc, curr) => acc + curr.monthlyFee, 0);

  const handleUpdateStatus = async () => {
    if (!student) return;
    setIsUpdating(true);
    try {
      const updates: any = { status: selectedStatus };
      
      // Reactivation rules if transitioning to active
      if (selectedStatus === "active" && student.status !== "active") {
        const today = new Date();
        const currentBillingDay = Math.min(today.getDate(), 28);
        const y = today.getFullYear();
        const m = (today.getMonth() + 1).toString().padStart(2, "0");
        const currentBillingPeriod = `${y}-${m}`;

        updates.billingDay = currentBillingDay;
        updates.billingActiveFrom = currentBillingPeriod;
      }

      await updateStudent(student.id, updates);
      setStudent(prev => prev ? { ...prev, ...updates } : null);
      setIsStatusModalOpen(false);
    } catch (err) {
      console.error("Failed to update status:", err);
    } finally {
      setIsUpdating(false);
    }
  };



  if (!isMounted || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#050505]">
        <div className="text-[10px] font-black uppercase tracking-widest text-[#333333] animate-pulse">
          Loading Profile...
        </div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#050505] p-10 text-center">
        <div className="flex flex-col gap-4">
          <p className="text-xl font-black text-white">Student not found</p>
          <Link href="/app/students" className="text-[10px] font-black text-[var(--app-accent)] uppercase tracking-widest">
            Back to Directory
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-10 pb-28">
      {/* 1. Profile Header */}
      <header className="flex flex-col items-center gap-6 px-8 pt-16">
        <div className="h-32 w-32 rounded-[2.5rem] bg-[#0d0d0d] border border-white/5 shadow-[neu-raised] flex items-center justify-center overflow-hidden">
          <img
            src={student.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${student.name}`}
            alt={student.name}
            className="h-24 w-24 rounded-full grayscale opacity-80"
          />
        </div>
        <div className="flex flex-col items-center gap-1">
          <h1 className="text-3xl font-black text-white tracking-tight">{student.name}</h1>
          <p className="text-[11px] font-black uppercase tracking-[0.4em] text-[#444444]">
            {student.rollNumber || "PENDING ID"}
          </p>
        </div>
      </header>

      {/* 2. Quick Stats Grid */}
      <div className="grid grid-cols-2 gap-6 px-8">
        <div className="card-cred p-6 flex flex-col gap-2">
           <span className="text-[9px] font-black uppercase tracking-widest text-[#444444]">Batch</span>
           <p className="text-[15px] font-extrabold text-white">{student.batch}</p>
        </div>
        <div 
          onClick={() => {
            setSelectedStatus(student.status);
            setIsStatusModalOpen(true);
          }}
          className="card-cred p-6 flex flex-col gap-2 cursor-pointer hover:border-[var(--app-accent)]/25 active:scale-[0.98] transition-all group"
        >
           <span className="text-[9px] font-black uppercase tracking-widest text-[#444444] group-hover:text-[var(--app-accent)] transition-all">Status</span>
           <p className="text-[15px] font-extrabold text-[var(--app-accent)] uppercase">{student.status}</p>
        </div>
      </div>

      {/* 3. Information Sections */}
      <section className="flex flex-col gap-8 px-8">
        {/* ── SEGMENTED TABBED CONTENT ── */}
        <div className="flex flex-col gap-5">
          {/* Tabs selector */}
          <div className="flex p-1 rounded-2xl bg-[#0d0d0d] border border-white/5 shadow-[neu-pressed]">
            {[
              { id: "curriculum", label: "Curriculum" },
              { id: "invoices", label: "Invoices" },
              { id: "payments", label: "Payments" }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  "flex-1 h-11 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all outline-none",
                  activeTab === tab.id
                    ? "bg-[#1a1a1a] text-white shadow-[neu-raised] border border-white/10"
                    : "text-[#444444]"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content: Curriculum */}
          {activeTab === "curriculum" && (
            <div className="flex flex-col gap-3">
               {enrollments.map((sub, i) => (
                 <div key={i} className="card-cred p-5 flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-[13px] font-bold text-white">{sub.subject}</span>
                      <span className="text-[9px] font-black text-[#444444] uppercase tracking-widest">Enrolled {sub.startedAt?.seconds ? new Date(sub.startedAt.seconds * 1000).toLocaleDateString() : "Recent"}</span>
                    </div>
                    <span className="text-[15px] font-black text-[var(--app-accent)]">₹{sub.monthlyFee}</span>
                 </div>
               ))}
               {enrollments.length === 0 && (
                 <div className="flex flex-col items-center justify-center py-10 gap-2 border border-white/5 border-dashed rounded-3xl bg-[#030303]">
                   <span className="text-[10px] font-black uppercase tracking-widest text-[#222222]">No Enrollments Found</span>
                 </div>
               )}
            </div>
          )}

          {/* Tab Content: Invoices */}
          {activeTab === "invoices" && (
            <div className="flex flex-col gap-3">
               {invoices.map((inv) => {
                 const displayDue = inv.remainingAmount ?? inv.amount;
                 return (
                   <div key={inv.id} className="card-cred p-5 flex items-center justify-between">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[14px] font-bold text-white">
                          {formatPeriod(inv.billingPeriod)}
                        </span>
                        <span className="text-[9px] font-black text-[#444444] uppercase tracking-widest">
                          DUE {inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : "—"}
                        </span>
                      </div>
                      <div className="flex flex-col items-end gap-1.5">
                        <span className="text-[15px] font-black text-white">₹{displayDue}</span>
                        <span className={cn(
                          "px-2 py-0.5 rounded border border-white/5 text-[8px] font-black uppercase tracking-widest",
                          inv.status === "paid" ? "text-[var(--app-accent)] bg-[var(--app-accent-soft)]" :
                          inv.status === "overdue" ? "text-[#ff4d4d] bg-[#ff4d4d10]" :
                          "text-[#ffcc00] bg-[#ffcc0010]"
                        )}>
                          {inv.status}
                        </span>
                      </div>
                   </div>
                 );
               })}
               {invoices.length === 0 && (
                 <div className="flex flex-col items-center justify-center py-12 gap-2 border border-white/5 border-dashed rounded-3xl bg-[#030303]">
                   <span className="text-[10px] font-black uppercase tracking-widest text-[#222222]">No Invoices Issued</span>
                 </div>
               )}
            </div>
          )}

          {/* Tab Content: Payments */}
          {activeTab === "payments" && (
            <div className="flex flex-col gap-3">
               {payments.map((p) => (
                 <div key={p.id} className="card-cred p-5 flex items-center justify-between">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[14px] font-bold text-white">₹{p.amount}</span>
                      <span className="text-[9px] font-black text-[#444444] uppercase tracking-widest">
                        {p.paymentDate ? new Date(p.paymentDate).toLocaleDateString() : "Recent"}
                      </span>
                      {p.remarks && (
                        <p className="text-[10px] text-[#555555] italic mt-0.5">"{p.remarks}"</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-[8px] font-black uppercase tracking-widest text-[var(--app-accent)]">
                      <CheckCircle2 className="h-3 w-3 shrink-0" />
                      Cleared
                    </div>
                 </div>
               ))}
               {payments.length === 0 && (
                 <div className="flex flex-col items-center justify-center py-12 gap-2 border border-white/5 border-dashed rounded-3xl bg-[#030303]">
                   <span className="text-[10px] font-black uppercase tracking-widest text-[#222222]">No Receipts Found</span>
                 </div>
               )}
            </div>
          )}
        </div>


        {/* Contact Info */}
        <div className="flex flex-col gap-4">
          <h3 className="text-[11px] font-black uppercase tracking-[0.4em] text-[#333333]">Contact Details</h3>
          <div className="card-cred p-6 flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase text-[#444444]">Guardian</span>
                <p className="text-[15px] font-bold text-white/90">{student.guardianName || "Not Provided"}</p>
              </div>
              <button className="h-10 w-10 rounded-xl bg-[#0d0d0d] border border-white/5 shadow-[neu-raised] flex items-center justify-center text-[var(--app-accent)] active:shadow-[neu-pressed]">
                 <IconUsers className="h-5 w-5" />
              </button>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase text-[#444444]">Phone</span>
                <p className="text-[15px] font-bold text-white/90">{student.phone || "No Phone"}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Fee Summary */}
        <div className="flex flex-col gap-4">
          <h3 className="text-[11px] font-black uppercase tracking-[0.4em] text-[#333333]">Total Monthly Fee</h3>
          <div className="card-cred p-8 flex flex-col gap-6 bg-gradient-to-br from-[var(--app-accent-soft)] to-transparent border-[var(--app-accent)]/20">
            <div className="flex items-center justify-between">
               <h4 className="text-xl font-black text-white">Consolidated Fee</h4>
               <IconCash className="h-6 w-6 text-[var(--app-accent)]" />
            </div>
            <div className="flex justify-between items-end">
               <div className="flex flex-col">
                 <span className="text-[10px] font-black text-[#444444] uppercase tracking-widest">Payable Every Month</span>
                 <span className="text-3xl font-black text-white">₹{totalFee}</span>
               </div>
               <div className="flex flex-col items-end">
                 <span className="text-[10px] font-black text-[#444444] uppercase tracking-widest">Next Billing</span>
                 <span className="text-[12px] font-black text-[var(--app-accent)]">DAY {student.billingDay}</span>
               </div>
            </div>
          </div>
        </div>

        {/* ── NOT-UPFRONT FORCE BILLING GENERATOR ── */}
        {profile?.role === "owner" && (
          <div className="flex flex-col gap-3">
            <button
              onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
              className="flex items-center justify-between px-6 py-4 rounded-2xl bg-[#0d0d0d] border border-white/5 shadow-[neu-pressed] text-[11px] font-black uppercase tracking-widest text-[#444444] active:scale-[0.99] transition-all outline-none"
            >
              <div className="flex items-center gap-2">
                <Wrench className="h-3.5 w-3.5 text-[#444444]" />
                Advanced Billing Admin
              </div>
              {isAdvancedOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>

            {isAdvancedOpen && (
              <div className="card-cred p-6 flex flex-col gap-5 border border-dashed border-white/10 bg-black/20 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="flex flex-col gap-1.5">
                  <h4 className="text-[12px] font-black text-white uppercase tracking-wider">Force Invoice Generation</h4>
                  <p className="text-[10px] text-[#444444] font-semibold leading-normal">
                    Instantly issue a deterministic invoice for any billing month. Bypasses billing day checks. Safe from duplicates.
                  </p>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-[9px] font-black uppercase tracking-wider text-[#666666]">Billing Period (YYYY-MM)</label>
                  <input
                    type="text"
                    value={billingPeriodInput}
                    onChange={(e) => setBillingPeriodInput(e.target.value)}
                    className="h-12 w-full rounded-xl bg-[#0d0d0d] border border-white/5 px-4 text-[13px] font-bold text-white outline-none focus:border-[var(--app-accent)]/20 transition-all"
                    placeholder="e.g. 2026-08"
                  />
                </div>

                {genMessage && (
                  <div className={cn(
                    "p-4 rounded-xl text-[11px] font-bold flex items-start gap-2.5 border",
                    genMessage.isError 
                      ? "bg-red-500/10 border-red-500/20 text-[#ff4d4d]" 
                      : "bg-[var(--app-accent-soft)]/20 border-[var(--app-accent)]/20 text-[var(--app-accent)]"
                  )}>
                    {genMessage.isError ? <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" /> : <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />}
                    <span>{genMessage.text}</span>
                  </div>
                )}

                <button
                  onClick={handleForceGenerate}
                  disabled={isGenerating || !billingPeriodInput}
                  className="h-12 w-full bg-[#111111] hover:bg-[#151515] active:scale-95 text-[10px] font-black uppercase tracking-widest text-white rounded-xl border border-white/5 shadow-[neu-raised] flex items-center justify-center gap-2 transition-all disabled:opacity-30 disabled:pointer-events-none"
                >
                  <Sparkles className="h-3.5 w-3.5 text-[var(--app-accent)]" />
                  {isGenerating ? "Generating..." : "Generate Invoice Now"}
                </button>
              </div>
            )}
          </div>
        )}

      </section>

      {/* 4. Actions Footer */}
      <footer className="px-8 flex flex-col gap-4">
         <Link href="/app/payments" className="h-16 w-full btn-neon text-[13px] uppercase tracking-[0.2em] flex items-center justify-center">
           Manage Finance Hub
         </Link>
         <button 
           onClick={() => {
             setSelectedStatus(student.status);
             setIsStatusModalOpen(true);
           }}
           className="h-16 w-full card-cred flex items-center justify-center text-[13px] uppercase tracking-[0.2em] text-white/70 hover:text-white hover:border-white/20 transition-all font-black border-dashed border-white/10 active:scale-[0.98]"
         >
           Manage Student Status
         </button>
      </footer>

      {/* Edit Status Modal */}
      {isStatusModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md transition-all duration-300">
          <div className="w-full max-w-md p-8 rounded-[2.5rem] bg-[#0d0d0d] border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.8)] flex flex-col gap-6 relative animate-in fade-in zoom-in-95 duration-200">
            <div className="flex flex-col gap-2">
              <h3 className="text-xl font-black text-white">Manage Student Status</h3>
              <p className="text-[11px] font-black text-[#555] uppercase tracking-wider">
                Control active billing state & status
              </p>
            </div>

            <div className="flex flex-col gap-4">
              <label className="text-[10px] font-black uppercase text-[#666] tracking-widest">Select Status</label>
              <div className="grid grid-cols-3 gap-3">
                {(["active", "on-hold", "inactive"] as const).map((status) => {
                  const isActive = selectedStatus === status;
                  return (
                    <button
                      key={status}
                      type="button"
                      onClick={() => setSelectedStatus(status)}
                      className={`h-14 rounded-2xl border text-[11px] font-black uppercase tracking-wider flex items-center justify-center transition-all ${
                        isActive
                          ? "bg-[var(--app-accent-soft)] border-[var(--app-accent)] text-white shadow-[0_0_15px_rgba(200,80,255,0.15)]"
                          : "bg-black/40 border-white/5 text-[#555] hover:text-white/60 hover:border-white/10"
                      }`}
                    >
                      {status}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Explanatory reactivation warning banner */}
            {selectedStatus === "active" && student.status !== "active" && (
              <div className="p-5 rounded-2xl bg-[var(--app-accent-soft)]/20 border border-[var(--app-accent)]/20 flex flex-col gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-[var(--app-accent)]">
                  ⚡ Reactivation Auto-Rules
                </span>
                <p className="text-[11px] font-medium text-white/70 leading-relaxed">
                  Billing cycle will restart today (Day {Math.min(new Date().getDate(), 28)}) from the current month ({new Date().getFullYear()}-{(new Date().getMonth() + 1).toString().padStart(2, "0")}). Previous paused/on-hold months will be safely locked to prevent old invoice generation.
                </p>
              </div>
            )}

            <div className="flex gap-4 mt-2">
              <button
                type="button"
                onClick={() => setIsStatusModalOpen(false)}
                className="flex-1 h-14 rounded-2xl bg-black/40 border border-white/5 text-[11px] font-black uppercase tracking-widest text-[#555] hover:text-white/60 transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleUpdateStatus}
                disabled={isUpdating}
                className="flex-1 h-14 rounded-2xl btn-neon text-[11px] uppercase tracking-widest flex items-center justify-center"
              >
                {isUpdating ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


