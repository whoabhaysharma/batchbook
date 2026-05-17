"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { IconPlus, IconUsers, IconSearch } from "@/components/icons/dashboard-icons";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerTrigger,
  DrawerFooter,
  DrawerClose
} from "@/components/ui/drawer";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, UserPlus, X, ChevronDown, AlertCircle, Loader2 } from "lucide-react";
import { getStudents, createStudent, getBatches, createEnrollment } from "@/lib/db";
import { getFirebaseDb } from "@/lib/firebase";
import { onSnapshot, query, collection, where } from "firebase/firestore";
import { useAuth } from "@/components/auth-provider";
import { type Batch } from "@/types/batch";
import { type Student } from "@/types/student";
import { cn } from "@/lib/utils";
import { APP_CONFIG } from "@/lib/config";

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Student Form States
  const [newStudentName, setNewStudentName] = useState("");
  const [newStudentPhone, setNewStudentPhone] = useState("");
  const [newStudentBatch, setNewStudentBatch] = useState("");
  const [newStudentBillingDay, setNewStudentBillingDay] = useState("1");
  const [selectedSubjects, setSelectedSubjects] = useState<{ name: string, price: number }[]>([]);
  
  const [customSubjectName, setCustomSubjectName] = useState("");
  const [customSubjectPrice, setCustomSubjectPrice] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [studentError, setStudentError] = useState<string | null>(null);

  const [open, setOpen] = useState(false);

  const totalFee = selectedSubjects.reduce((acc, s) => acc + s.price, 0);

  // Generate days 1-28
  const billingDays = Array.from({ length: 28 }, (_, i) => (i + 1).toString());

  const { profile } = useAuth();

  const addCustomSubject = () => {
    if (!customSubjectName || !customSubjectPrice || !profile?.tuitionId) return;
    setSelectedSubjects([...selectedSubjects, {
      name: customSubjectName,
      price: Number(customSubjectPrice)
    }]);

    setCustomSubjectName("");
    setCustomSubjectPrice("");
  };

  const removeSubject = (index: number) => {
    setSelectedSubjects(selectedSubjects.filter((_, i) => i !== index));
  };

  const fetchData = async () => {
    if (!profile?.tuitionId) return;
    try {
      const batchData = await getBatches(profile.tuitionId);
      setBatches(batchData);
    } catch (err) {
      console.error("Error fetching batches data:", err);
    }
  };

  useEffect(() => {
    if (!profile?.tuitionId) return;
    
    setLoading(true);
    fetchData();

    const db = getFirebaseDb();
    const q = query(collection(db, "students"), where("tuitionId", "==", profile.tuitionId));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const studentData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student));
      setStudents(studentData);
      setLoading(false);
    }, (err) => {
      console.error("Error listening to students:", err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [profile?.tuitionId]);

  const handleCreateStudent = async () => {
    if (!newStudentName || !newStudentBatch || selectedSubjects.length === 0 || !profile?.tuitionId) return;
    setIsSubmitting(true);
    setStudentError(null);
    try {
      // 1. Create the Student Document (Core Info Only)
      const today = new Date();
      const y = today.getFullYear();
      const m = (today.getMonth() + 1).toString().padStart(2, "0");
      const currentPeriod = `${y}-${m}`;

      const studentId = await createStudent({
        name: newStudentName,
        phone: newStudentPhone || undefined,
        batch: newStudentBatch,
        billingDay: Number(newStudentBillingDay),
        billingActiveFrom: currentPeriod,
        status: "active",
        tuitionId: profile.tuitionId,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${newStudentName}`,
      });

      // 2. Create Normalized Subject Enrollments (The Source of Truth)
      const enrollmentPromises = selectedSubjects.map(s => 
        createEnrollment({
          studentId: studentId,
          tuitionId: profile.tuitionId!,
          subject: s.name,
          monthlyFee: s.price,
          status: "active",
          endedAt: null
        })
      );

      await Promise.all(enrollmentPromises);

      // Reset form states
      setNewStudentName("");
      setNewStudentPhone("");
      setNewStudentBatch("");
      setNewStudentBillingDay("1");
      setSelectedSubjects([]);
      setStudentError(null);
      setOpen(false); // Cleanly close drawer on success
      await fetchData();
    } catch (err: any) {
      console.error(err);
      setStudentError(err.message || "Failed to onboard student. Please verify database connectivity.");
    } finally {
      setIsSubmitting(false);
    }
  };

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

        <Drawer open={open} onOpenChange={(val) => { setOpen(val); if (!val) setStudentError(null); }}>
          <button 
            onClick={() => setOpen(true)}
            className="h-14 w-14 rounded-2xl bg-[#0d0d0d] border border-white/5 shadow-[neu-raised] flex items-center justify-center text-[var(--app-accent)] active:shadow-[neu-pressed] transition-all"
          >
            <IconPlus className="h-7 w-7" />
          </button>
          <DrawerContent className="max-h-[92vh] flex flex-col overflow-hidden">
            <DrawerHeader className="pb-2">
              <DrawerTitle>Onboard Student</DrawerTitle>
              <DrawerDescription>Secure their spot in your center</DrawerDescription>
            </DrawerHeader>

            {studentError && (
              <div className="mx-10 mt-2 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-[#ff4d4d] text-xs font-bold flex items-start gap-2.5 animate-in fade-in duration-200">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{studentError}</span>
              </div>
            )}

            <div className="flex flex-col overflow-hidden flex-1">
              <div className="px-10 flex flex-col gap-6 pb-6 overflow-y-auto pt-2 flex-1">
                <div className="grid grid-cols-1 gap-6">
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-[#444444] px-1">Full Name</label>
                    <input
                      type="text"
                      value={newStudentName}
                      onChange={(e) => setNewStudentName(e.target.value)}
                      className="h-14 w-full rounded-2xl bg-[#0d0d0d] border border-white/5 shadow-[neu-pressed] px-6 text-[15px] font-bold text-white outline-none focus:border-[var(--app-accent)]/20 transition-all"
                      placeholder="e.g. Rahul Sharma"
                      disabled={isSubmitting}
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-[#444444] px-1">Phone Number (Optional)</label>
                    <input
                      type="tel"
                      value={newStudentPhone}
                      onChange={(e) => setNewStudentPhone(e.target.value)}
                      className="h-14 w-full rounded-2xl bg-[#0d0d0d] border border-white/5 shadow-[neu-pressed] px-6 text-[15px] font-bold text-white outline-none focus:border-[var(--app-accent)]/20 transition-all"
                      placeholder="+91 00000 00000"
                      disabled={isSubmitting}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-[#444444] px-1">Batch</label>
                    <Select onValueChange={setNewStudentBatch} value={newStudentBatch} disabled={isSubmitting}>
                      <SelectTrigger className="h-14">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        {batches.map((batch) => (
                          <SelectItem key={batch.id} value={batch.name}>
                            {batch.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-[#444444] px-1">Billing Day</label>
                    <Select onValueChange={setNewStudentBillingDay} value={newStudentBillingDay} disabled={isSubmitting}>
                      <SelectTrigger className="h-14">
                        <SelectValue placeholder="Day" />
                      </SelectTrigger>
                      <SelectContent>
                        {billingDays.map((day) => (
                          <SelectItem key={day} value={day}>
                            Day {day}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <label className="text-[10px] font-black uppercase tracking-[0.3em] text-[#444444] px-1">Configure Curriculum</label>

                  <div className="grid grid-cols-[1fr,80px,56px] gap-2">
                    <input
                      type="text"
                      value={customSubjectName}
                      onChange={(e) => setCustomSubjectName(e.target.value)}
                      placeholder="Subject Name"
                      className="h-14 rounded-xl bg-[#111111] border border-white/5 px-4 text-[13px] font-bold text-white outline-none"
                      disabled={isSubmitting}
                    />
                    <input
                      type="number"
                      value={customSubjectPrice}
                      onChange={(e) => setCustomSubjectPrice(e.target.value)}
                      placeholder="Price"
                      className="h-14 rounded-xl bg-[#111111] border border-white/5 px-4 text-[13px] font-bold text-white outline-none"
                      disabled={isSubmitting}
                    />
                    <button
                      onClick={addCustomSubject}
                      disabled={isSubmitting}
                      className="h-14 rounded-xl bg-[var(--app-accent-soft)] border border-[var(--app-accent)]/20 flex items-center justify-center text-[var(--app-accent)] disabled:opacity-30"
                    >
                      <Plus className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="flex flex-col gap-2 mt-2">
                    {selectedSubjects.map((subject, i) => (
                      <div key={i} className="flex items-center justify-between p-4 rounded-xl bg-[#0d0d0d] border border-white/5 animate-in fade-in duration-200">
                        <div className="flex flex-col">
                          <span className="text-[13px] font-bold text-white">{subject.name}</span>
                          <span className="text-[10px] font-black text-[var(--app-accent)]">₹{subject.price}</span>
                        </div>
                        <button 
                          onClick={() => removeSubject(i)}
                          disabled={isSubmitting}
                          className="text-[#333333] hover:text-red-500 transition-colors disabled:opacity-20"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Sticky Footer */}
              <div className="px-10 py-6 bg-[#0d0d0d] border-t border-white/5 shadow-[0_-20px_40px_rgba(0,0,0,0.4)] flex gap-4 items-center">
                <button
                  onClick={handleCreateStudent}
                  disabled={isSubmitting || !newStudentName || !newStudentBatch || selectedSubjects.length === 0}
                  className="h-16 flex-1 btn-neon text-[13px] font-black uppercase tracking-[0.2em] flex items-center justify-between px-8 active:scale-95 transition-all disabled:opacity-30"
                >
                  <div className="flex items-center gap-3">
                    {isSubmitting ? "Onboarding..." : "Onboard"}
                    {isSubmitting ? (
                      <Loader2 className="h-5 w-5 animate-spin text-black" />
                    ) : (
                      <UserPlus className="h-5 w-5" />
                    )}
                  </div>

                  <div className="flex items-center gap-2 pl-4 border-l border-black/10">
                    <span className="opacity-60 text-[10px]">TOTAL</span>
                    <span className="text-[16px] tracking-tight">₹{totalFee}</span>
                  </div>
                </button>
                <button 
                  onClick={() => setOpen(false)}
                  disabled={isSubmitting}
                  className="h-16 px-6 rounded-2xl bg-[#111111] hover:bg-[#1a1a1a] border border-white/5 text-[13px] font-black uppercase tracking-[0.2em] text-[#555] active:scale-95 transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          </DrawerContent>
        </Drawer>
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
          <Link href={`/app/students/detail?id=${student.id}`} key={i} className="card-cred p-6 flex items-center gap-6 group active:scale-[0.98] transition-all">
            <div className="relative">
              <div className="h-16 w-16 rounded-2xl bg-[#0d0d0d] border border-white/5 shadow-[neu-raised] flex items-center justify-center overflow-hidden">
                <img
                  src={student.avatar}
                  alt={student.name}
                  className="h-12 w-12 rounded-full grayscale opacity-60 group-active:grayscale-0 group-active:opacity-100 transition-all"
                />
              </div>
              {student.status === "active" && (
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

            <div className={cn(
              "text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-md border border-white/5",
              student.status === "active" ? "text-[var(--app-accent)] bg-[var(--app-accent-soft)]" : "text-[#ff4d4d] bg-[#ff4d4d10]"
            )}>
              {student.status}
            </div>
          </Link>
        ))}
      </section>
    </div>
  );
}
