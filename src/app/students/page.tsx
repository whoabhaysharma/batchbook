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
import { Plus, UserPlus, X, ChevronDown } from "lucide-react";
import { getStudents, createStudent, getBatches, type Batch } from "@/lib/db";
import { type Student } from "@/types/student";
import { cn } from "@/lib/utils";



export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [newStudentName, setNewStudentName] = useState("");
  const [newStudentBatch, setNewStudentBatch] = useState("");
  const [selectedSubjects, setSelectedSubjects] = useState<{name: string, price: number}[]>([]);
  const [customSubjectName, setCustomSubjectName] = useState("");
  const [customSubjectPrice, setCustomSubjectPrice] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const totalFee = selectedSubjects.reduce((acc, s) => acc + s.price, 0);

  const addCustomSubject = () => {
    if (!customSubjectName || !customSubjectPrice) return;
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
    setLoading(true);
    const [studentData, batchData] = await Promise.all([
      getStudents(),
      getBatches()
    ]);
    setStudents(studentData);
    setBatches(batchData);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateStudent = async () => {
    if (!newStudentName || !newStudentBatch || selectedSubjects.length === 0) return;
    setIsSubmitting(true);
    try {
      await createStudent({
        name: newStudentName,
        batch: newStudentBatch,
        subjects: selectedSubjects.map(s => s.name),
        fee: totalFee,
        status: "PAID",
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${newStudentName}`,
      });
      setNewStudentName("");
      setNewStudentBatch("");
      setSelectedSubjects([]);
      await fetchData();
    } catch (err) {
      console.error(err);
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
        
        <Drawer>
          <DrawerTrigger asChild>
            <button className="h-14 w-14 rounded-2xl bg-[#0d0d0d] border border-white/5 shadow-[neu-raised] flex items-center justify-center text-[var(--app-accent)] active:shadow-[neu-pressed] transition-all">
              <IconPlus className="h-7 w-7" />
            </button>
          </DrawerTrigger>
          <DrawerContent>
            <DrawerHeader className="pb-2">
              <DrawerTitle>Onboard Student</DrawerTitle>
              <DrawerDescription>Secure their spot in your center</DrawerDescription>
            </DrawerHeader>
            <div className="flex flex-col overflow-hidden max-h-[85vh]">
              <div className="px-10 flex flex-col gap-6 pb-6 overflow-y-auto pt-2">
                 <div className="flex flex-col gap-2">
                   <label className="text-[10px] font-black uppercase tracking-[0.3em] text-[#444444] px-1">Full Name</label>
                   <input 
                     type="text" 
                     value={newStudentName}
                     onChange={(e) => setNewStudentName(e.target.value)}
                     className="h-14 w-full rounded-2xl bg-[#0d0d0d] border border-white/5 shadow-[neu-pressed] px-6 text-[15px] font-bold text-white outline-none focus:border-[var(--app-accent)]/20 transition-all"
                     placeholder="e.g. Rahul Sharma"
                   />
                 </div>
                 
                 <div className="flex flex-col gap-2">
                   <label className="text-[10px] font-black uppercase tracking-[0.3em] text-[#444444] px-1">Batch Assignment</label>
                   <Select onValueChange={setNewStudentBatch} value={newStudentBatch}>
                      <SelectTrigger className="h-14">
                        <SelectValue placeholder="Select a batch" />
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

                 <div className="flex flex-col gap-3">
                   <label className="text-[10px] font-black uppercase tracking-[0.3em] text-[#444444] px-1">Configure Curriculum</label>
                   
                   <div className="grid grid-cols-[1fr,80px,56px] gap-2">
                      <input 
                        type="text" 
                        value={customSubjectName}
                        onChange={(e) => setCustomSubjectName(e.target.value)}
                        placeholder="Subject Name"
                        className="h-14 rounded-xl bg-[#111111] border border-white/5 px-4 text-[13px] font-bold text-white outline-none"
                      />
                      <input 
                        type="number" 
                        value={customSubjectPrice}
                        onChange={(e) => setCustomSubjectPrice(e.target.value)}
                        placeholder="Price"
                        className="h-14 rounded-xl bg-[#111111] border border-white/5 px-4 text-[13px] font-bold text-white outline-none"
                      />
                      <button 
                        onClick={addCustomSubject}
                        className="h-14 rounded-xl bg-[var(--app-accent-soft)] border border-[var(--app-accent)]/20 flex items-center justify-center text-[var(--app-accent)]"
                      >
                        <Plus className="h-5 w-5" />
                      </button>
                   </div>

                   <div className="flex flex-col gap-2 mt-2">
                      {selectedSubjects.map((subject, i) => (
                        <div key={i} className="flex items-center justify-between p-4 rounded-xl bg-[#0d0d0d] border border-white/5">
                          <div className="flex flex-col">
                            <span className="text-[13px] font-bold text-white">{subject.name}</span>
                            <span className="text-[10px] font-black text-[var(--app-accent)]">₹{subject.price}</span>
                          </div>
                          <button onClick={() => removeSubject(i)} className="text-[#333333] hover:text-red-500 transition-colors">
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                   </div>
                 </div>
              </div>

              {/* Sticky Footer */}
              <div className="px-10 py-8 bg-[#0d0d0d] border-t border-white/5 shadow-[0_-20px_40px_rgba(0,0,0,0.4)]">
                 <DrawerClose asChild>
                   <button 
                     onClick={handleCreateStudent}
                     disabled={isSubmitting || !newStudentName || !newStudentBatch || selectedSubjects.length === 0}
                     className="h-16 w-full btn-neon text-[13px] font-black uppercase tracking-[0.2em] flex items-center justify-between px-8 active:scale-95 transition-all disabled:opacity-30"
                   >
                      <div className="flex items-center gap-3">
                        {isSubmitting ? "Syncing..." : "Onboard"}
                        <UserPlus className="h-5 w-5" />
                      </div>

                      <div className="flex items-center gap-2 pl-4 border-l border-black/10">
                        <span className="opacity-60 text-[10px]">TOTAL</span>
                        <span className="text-[16px] tracking-tight">₹{totalFee}</span>
                      </div>
                   </button>
                 </DrawerClose>
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


