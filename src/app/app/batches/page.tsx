"use client";

import { useEffect, useState } from "react";
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
import { Plus, LayoutGrid, X, Trash2, UserPlus, Settings, Save, AlertCircle, Loader2 } from "lucide-react";
import { IconPlus, IconCalendar, IconUsers } from "@/components/icons/dashboard-icons";
import { getBatches, createBatch, getStudents, updateStudent, updateBatch } from "@/lib/db";
import { type Batch } from "@/types/batch";
import { type Student } from "@/types/student";
import { cn, formatTimeRange } from "@/lib/utils";
import { useAuth } from "@/components/auth-provider";

const HOURS = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"];
const MINUTES = ["00", "05", "10", "15", "20", "25", "30", "35", "40", "45", "50", "55"];
const PERIODS = ["AM", "PM"];

export default function BatchesPage() {
  const { profile } = useAuth();
  const [batches, setBatches] = useState<Batch[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Create Batch Drawer States
  const [newBatchName, setNewBatchName] = useState("");
  const [startHour, setStartHour] = useState("08");
  const [startMinute, setStartMinute] = useState("00");
  const [startPeriod, setStartPeriod] = useState("AM");
  const [endHour, setEndHour] = useState("10");
  const [endMinute, setEndMinute] = useState("00");
  const [endPeriod, setEndPeriod] = useState("AM");
  const [newBatchDesc, setNewBatchDesc] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  
  // Edit Batch Drawer States
  const [editingBatch, setEditingBatch] = useState<Batch | null>(null);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editStatus, setEditStatus] = useState<"active" | "inactive">("active");
  const [editStartHour, setEditStartHour] = useState("08");
  const [editStartMinute, setEditStartMinute] = useState("00");
  const [editStartPeriod, setEditStartPeriod] = useState("AM");
  const [editEndHour, setEditEndHour] = useState("10");
  const [editEndMinute, setEditEndMinute] = useState("00");
  const [editEndPeriod, setEditEndPeriod] = useState("AM");
  const [editError, setEditError] = useState<string | null>(null);

  // Members Management states
  const [memberActionLoading, setMemberActionLoading] = useState<string | null>(null); // holds studentId or "adding"
  const [memberError, setMemberError] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    if (!profile?.tuitionId) return;
    try {
      const [batchData, studentData] = await Promise.all([
        getBatches(profile.tuitionId),
        getStudents(profile.tuitionId)
      ]);
      setBatches(batchData);
      setStudents(studentData);
    } catch (err) {
      console.error("Error fetching batches/students data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (profile?.tuitionId) {
      fetchData();
    }
  }, [profile?.tuitionId]);

  // Open Edit Drawer Prefilled
  const openEditDrawer = (batch: Batch) => {
    setEditingBatch(batch);
    setEditName(batch.name);
    setEditDesc(batch.description || "");
    setEditStatus(batch.status);
    setEditStartHour(batch.startTime.hour.toString().padStart(2, "0"));
    setEditStartMinute(batch.startTime.minute.toString().padStart(2, "0"));
    setEditStartPeriod(batch.startTime.period);
    setEditEndHour(batch.endTime.hour.toString().padStart(2, "0"));
    setEditEndMinute(batch.endTime.minute.toString().padStart(2, "0"));
    setEditEndPeriod(batch.endTime.period);
    setEditError(null);
    setMemberError(null);
    setMemberActionLoading(null);
    setEditOpen(true);
  };

  const handleCreateBatch = async () => {
    if (!newBatchName || !startHour || !startMinute || !startPeriod || !endHour || !endMinute || !endPeriod || !profile?.tuitionId) return;
    setIsSubmitting(true);
    setCreateError(null);
    try {
      const colors = [
        "from-emerald-500/20",
        "from-blue-500/20",
        "from-purple-500/20",
        "from-rose-500/20",
        "from-amber-500/20",
        "from-cyan-500/20"
      ];
      const randomColor = colors[Math.floor(Math.random() * colors.length)];

      await createBatch({
        name: newBatchName,
        startTime: {
          hour: parseInt(startHour, 10),
          minute: parseInt(startMinute, 10),
          period: startPeriod as "AM" | "PM"
        },
        endTime: {
          hour: parseInt(endHour, 10),
          minute: parseInt(endMinute, 10),
          period: endPeriod as "AM" | "PM"
        },
        status: "active",
        tuitionId: profile.tuitionId,
        description: newBatchDesc,
        color: randomColor,
      });

      setNewBatchName("");
      setStartHour("08");
      setStartMinute("00");
      setStartPeriod("AM");
      setEndHour("10");
      setEndMinute("00");
      setEndPeriod("AM");
      setNewBatchDesc("");
      setOpen(false); // Close drawer on success
      await fetchData();
    } catch (err: any) {
      console.error(err);
      setCreateError(err.message || "Failed to launch batch orbit. Please verify Firestore connectivity.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateBatch = async () => {
    if (!editingBatch || !editName || !profile?.tuitionId) return;
    setIsSubmitting(true);
    setEditError(null);
    try {
      // 1. Maintain Referer Integrity: If batch name changed, update all student batch fields
      if (editName !== editingBatch.name) {
        const batchStudents = students.filter(s => s.batch === editingBatch.name);
        const updatePromises = batchStudents.map(s => updateStudent(s.id, { batch: editName }));
        await Promise.all(updatePromises);
      }

      // 2. Update Batch details
      await updateBatch(editingBatch.id, {
        name: editName,
        description: editDesc,
        status: editStatus,
        startTime: {
          hour: parseInt(editStartHour, 10),
          minute: parseInt(editStartMinute, 10),
          period: editStartPeriod as "AM" | "PM"
        },
        endTime: {
          hour: parseInt(editEndHour, 10),
          minute: parseInt(editEndMinute, 10),
          period: editEndPeriod as "AM" | "PM"
        }
      });

      setEditOpen(false);
      setEditingBatch(null);
      await fetchData();
    } catch (err: any) {
      console.error(err);
      setEditError(err.message || "Failed to update batch details. Please verify your connection.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const removeStudentFromBatch = async (student: Student) => {
    if (!editingBatch) return;
    setMemberActionLoading(student.id);
    setMemberError(null);
    try {
      await updateStudent(student.id, { batch: "" });
      
      const newCount = Math.max(0, editingBatch.students - 1);
      await updateBatch(editingBatch.id, { students: newCount });
      
      setEditingBatch({ ...editingBatch, students: newCount });
      await fetchData();
    } catch (err: any) {
      console.error("Error removing student:", err);
      setMemberError(`Failed to remove ${student.name}: ${err.message || "Error"}`);
    } finally {
      setMemberActionLoading(null);
    }
  };

  const addStudentToBatch = async (studentId: string) => {
    if (!editingBatch) return;
    setMemberActionLoading(studentId);
    setMemberError(null);
    try {
      await updateStudent(studentId, { batch: editingBatch.name });
      
      const newCount = editingBatch.students + 1;
      await updateBatch(editingBatch.id, { students: newCount });
      
      setEditingBatch({ ...editingBatch, students: newCount });
      await fetchData();
    } catch (err: any) {
      console.error("Error adding student:", err);
      setMemberError(`Failed to enroll student: ${err.message || "Error"}`);
    } finally {
      setMemberActionLoading(null);
    }
  };

  const currentMembers = editingBatch 
    ? students.filter(s => s.batch === editingBatch.name) 
    : [];

  const nonMembers = editingBatch 
    ? students.filter(s => s.batch !== editingBatch.name) 
    : [];

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
        
        <Drawer open={open} onOpenChange={(val) => { setOpen(val); if(!val) setCreateError(null); }}>
          <button 
            onClick={() => setOpen(true)}
            className="h-14 w-14 rounded-2xl bg-[#0d0d0d] border border-white/5 shadow-[neu-raised] flex items-center justify-center text-[var(--app-accent)] active:shadow-[neu-pressed] transition-all"
          >
            <IconPlus className="h-7 w-7" />
          </button>
          <DrawerContent className="max-h-[92vh] flex flex-col overflow-hidden">
            <DrawerHeader>
              <DrawerTitle>Initialize Batch</DrawerTitle>
              <DrawerDescription>Define a new learning orbit</DrawerDescription>
            </DrawerHeader>
            <div className="px-10 flex flex-col gap-8 pb-8 overflow-y-auto pt-2 flex-1">
                {createError && (
                  <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-[#ff4d4d] text-xs font-bold flex items-start gap-2.5 animate-in fade-in slide-in-from-top-2 duration-250">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-500" />
                    <span>{createError}</span>
                  </div>
                )}

                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.3em] text-[#444444] px-1">Batch Name</label>
                  <input 
                    type="text" 
                    value={newBatchName}
                    onChange={(e) => setNewBatchName(e.target.value)}
                    className="h-16 w-full rounded-2xl bg-[#0d0d0d] border border-white/5 shadow-[neu-pressed] px-6 text-[16px] font-bold text-white outline-none focus:border-[var(--app-accent)]/20 transition-all"
                    placeholder="e.g. Morning STEM"
                  />
                </div>
                
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.3em] text-[#444444] px-1">Default Timing (Range)</label>
                  <div className="flex flex-col gap-4">
                    {/* Start Time */}
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[9px] font-bold text-[#555555] uppercase px-1">Start Time</span>
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <Select value={startHour} onValueChange={setStartHour}>
                            <SelectTrigger className="h-12 text-sm px-4 rounded-xl shadow-[neu-pressed]">
                              <SelectValue placeholder="Hour" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
                              {HOURS.map((hr) => (
                                <SelectItem key={hr} value={hr} className="py-2.5 pl-6 text-sm rounded-lg">
                                  {hr}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex-1">
                          <Select value={startMinute} onValueChange={setStartMinute}>
                            <SelectTrigger className="h-12 text-sm px-4 rounded-xl shadow-[neu-pressed]">
                              <SelectValue placeholder="Minute" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
                              {MINUTES.map((min) => (
                                <SelectItem key={min} value={min} className="py-2.5 pl-6 text-sm rounded-lg">
                                  {min}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="w-24">
                          <Select value={startPeriod} onValueChange={setStartPeriod}>
                            <SelectTrigger className="h-12 text-sm px-4 rounded-xl shadow-[neu-pressed]">
                              <SelectValue placeholder="Period" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
                              {PERIODS.map((prd) => (
                                <SelectItem key={prd} value={prd} className="py-2.5 pl-6 text-sm rounded-lg">
                                  {prd}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>

                    {/* End Time */}
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[9px] font-bold text-[#555555] uppercase px-1">End Time</span>
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <Select value={endHour} onValueChange={setEndHour}>
                            <SelectTrigger className="h-12 text-sm px-4 rounded-xl shadow-[neu-pressed]">
                              <SelectValue placeholder="Hour" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
                              {HOURS.map((hr) => (
                                <SelectItem key={hr} value={hr} className="py-2.5 pl-6 text-sm rounded-lg">
                                  {hr}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex-1">
                          <Select value={endMinute} onValueChange={setEndMinute}>
                            <SelectTrigger className="h-12 text-sm px-4 rounded-xl shadow-[neu-pressed]">
                              <SelectValue placeholder="Minute" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
                              {MINUTES.map((min) => (
                                <SelectItem key={min} value={min} className="py-2.5 pl-6 text-sm rounded-lg">
                                  {min}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="w-24">
                          <Select value={endPeriod} onValueChange={setEndPeriod}>
                            <SelectTrigger className="h-12 text-sm px-4 rounded-xl shadow-[neu-pressed]">
                              <SelectValue placeholder="Period" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
                              {PERIODS.map((prd) => (
                                <SelectItem key={prd} value={prd} className="py-2.5 pl-6 text-sm rounded-lg">
                                  {prd}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.3em] text-[#444444] px-1">Description</label>
                  <textarea 
                    value={newBatchDesc}
                    onChange={(e) => setNewBatchDesc(e.target.value)}
                    className="h-24 w-full rounded-2xl bg-[#0d0d0d] border border-white/5 shadow-[neu-pressed] p-5 text-[15px] font-bold text-white outline-none focus:border-[var(--app-accent)]/20 transition-all resize-none"
                    placeholder="e.g. Intensive coaching for STEM olympiads and core competitive examinations."
                  />
                </div>
            </div>

            <div className="px-10 py-6 bg-[#0d0d0d] border-t border-white/5 flex gap-4">
              <button 
                onClick={handleCreateBatch}
                disabled={isSubmitting || !newBatchName || !startHour || !startMinute || !startPeriod || !endHour || !endMinute || !endPeriod}
                className="h-16 flex-1 btn-neon text-[13px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 active:scale-95 transition-all disabled:opacity-30"
              >
                 {isSubmitting ? "Launching..." : "Launch Batch"}
                 {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin text-black" /> : <LayoutGrid className="h-5 w-5" />}
              </button>
              <button 
                onClick={() => setOpen(false)}
                disabled={isSubmitting}
                className="h-16 px-6 rounded-xl bg-[#111111] hover:bg-[#1a1a1a] border border-white/5 text-[13px] font-black uppercase tracking-[0.2em] text-[#555] active:scale-95 transition-all"
              >
                Cancel
              </button>
            </div>
          </DrawerContent>
        </Drawer>
      </header>

      {/* 2. Batch Search / Filter (Minimalist) */}
      <div className="px-8">
        <div className="flex items-center gap-4 rounded-2xl bg-[#111111] border border-white/5 p-1">
           <button className="flex-1 h-10 rounded-xl bg-[#1a1a1a] text-[11px] font-black uppercase tracking-widest text-white">Active</button>
           <button className="flex-1 h-10 rounded-xl text-[11px] font-black uppercase tracking-widest text-[#444444]">Inactive</button>
        </div>
      </div>

      {/* 3. Neomorphic Batch List */}
      <section className="flex flex-col gap-6 px-8">
        {loading ? (
           <div className="card-cred p-10 text-center text-[#444444] font-black uppercase tracking-widest animate-pulse">
             Loading batches...
           </div>
        ) : batches.length > 0 ? (
          batches.map((batch, i) => (
            <div key={i} className="card-cred p-8 flex flex-col gap-6 group relative overflow-hidden animate-in fade-in zoom-in-98 duration-200">
              <div className="flex items-start justify-between relative z-10">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-black tracking-[0.2em] text-[#444444]">#{batch.id.slice(0, 6).toUpperCase()}</span>
                  <h3 className="text-2xl font-black text-white tracking-tight">
                    {batch.name}
                  </h3>
                  {batch.description && (
                    <p className="text-xs text-[#555555] font-bold mt-1 max-w-xl">
                      {batch.description}
                    </p>
                  )}
                </div>
                <div className={cn(
                  "text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-black/40 border border-white/5",
                  batch.status === "active" ? "text-[var(--app-accent)]" : "text-[#444444]"
                )}>
                  {batch.status}
                </div>
              </div>

              <div className="flex items-center justify-between mt-2 relative z-10">
                <div className="flex items-center gap-8">
                  <div className="flex items-center gap-2">
                    <IconUsers className="h-5 w-5 text-[#333333]" />
                    <span className="text-[13px] font-bold text-[#666666]">{batch.students || 0} Members</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <IconCalendar className="h-5 w-5 text-[#333333]" />
                    <span className="text-[13px] font-bold text-[#666666]">{formatTimeRange(batch.startTime, batch.endTime)}</span>
                  </div>
                </div>

                <button 
                  onClick={() => openEditDrawer(batch)}
                  className="h-10 px-4 rounded-xl bg-[#111111] hover:bg-[#1a1a1a] border border-white/5 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-[0.15em] text-white active:scale-95 transition-all"
                >
                  <Settings className="h-3.5 w-3.5 text-[var(--app-accent)]" />
                  Manage
                </button>
              </div>

              {/* Subtle background glow for active batches */}
              {batch.status === "active" && (
                 <div className="absolute -right-12 -top-12 h-24 w-24 bg-[var(--app-accent)] opacity-[0.03] blur-3xl pointer-events-none" />
              )}
            </div>
          ))
        ) : (
          <div className="card-cred p-12 text-center text-[#444444] flex flex-col items-center justify-center gap-4 animate-in fade-in duration-200">
            <LayoutGrid className="h-8 w-8 text-[#222222]" />
            <div className="flex flex-col gap-1">
              <span className="text-sm font-bold text-white">No Batches Configured</span>
              <span className="text-xs text-[#555555]">Create a new learning orbit to get started</span>
            </div>
            <button 
              onClick={() => setOpen(true)}
              className="btn-neon text-[11px] font-black uppercase tracking-[0.2em] px-6 py-3 rounded-xl active:scale-95 transition-all"
            >
               Initialize First Batch
            </button>
          </div>
        )}
      </section>

      {/* 4. Edit Batch Drawer */}
      <Drawer open={editOpen} onOpenChange={(val) => { setEditOpen(val); if (!val) { setEditingBatch(null); setEditError(null); setMemberError(null); } }}>
        <DrawerContent className="max-h-[92vh] flex flex-col overflow-hidden">
          <DrawerHeader>
            <DrawerTitle>Manage Batch Orbit</DrawerTitle>
            <DrawerDescription>Configure schedule, settings, and student enrollments</DrawerDescription>
          </DrawerHeader>
          
          {editingBatch && (
            <div className="flex flex-col flex-1 overflow-hidden">
              <div className="px-10 flex flex-col gap-8 pb-8 overflow-y-auto pt-2 flex-1">
                {editError && (
                  <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-[#ff4d4d] text-xs font-bold flex items-start gap-2.5 animate-in fade-in slide-in-from-top-2 duration-250">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>{editError}</span>
                  </div>
                )}

                {/* Name */}
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.3em] text-[#444444] px-1">Batch Name</label>
                  <input 
                    type="text" 
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="h-14 w-full rounded-2xl bg-[#0d0d0d] border border-white/5 shadow-[neu-pressed] px-6 text-[15px] font-bold text-white outline-none focus:border-[var(--app-accent)]/20 transition-all"
                    placeholder="Morning STEM"
                    disabled={isSubmitting}
                  />
                </div>

                {/* Timing */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Start Time */}
                  <div className="flex flex-col gap-2">
                    <label className="text-[9px] font-black uppercase tracking-[0.2em] text-[#555555] px-1">Start Time</label>
                    <div className="flex gap-1.5">
                      <Select value={editStartHour} onValueChange={setEditStartHour} disabled={isSubmitting}>
                        <SelectTrigger className="h-11 text-xs">
                          <SelectValue placeholder="Hr" />
                        </SelectTrigger>
                        <SelectContent>
                          {HOURS.map(hr => <SelectItem key={hr} value={hr}>{hr}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <Select value={editStartMinute} onValueChange={setEditStartMinute} disabled={isSubmitting}>
                        <SelectTrigger className="h-11 text-xs">
                          <SelectValue placeholder="Min" />
                        </SelectTrigger>
                        <SelectContent>
                          {MINUTES.map(min => <SelectItem key={min} value={min}>{min}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <Select value={editStartPeriod} onValueChange={setEditStartPeriod} disabled={isSubmitting}>
                        <SelectTrigger className="h-11 text-xs">
                          <SelectValue placeholder="AM/PM" />
                        </SelectTrigger>
                        <SelectContent>
                          {PERIODS.map(prd => <SelectItem key={prd} value={prd}>{prd}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* End Time */}
                  <div className="flex flex-col gap-2">
                    <label className="text-[9px] font-black uppercase tracking-[0.2em] text-[#555555] px-1">End Time</label>
                    <div className="flex gap-1.5">
                      <Select value={editEndHour} onValueChange={setEditEndHour} disabled={isSubmitting}>
                        <SelectTrigger className="h-11 text-xs">
                          <SelectValue placeholder="Hr" />
                        </SelectTrigger>
                        <SelectContent>
                          {HOURS.map(hr => <SelectItem key={hr} value={hr}>{hr}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <Select value={editEndMinute} onValueChange={setEditEndMinute} disabled={isSubmitting}>
                        <SelectTrigger className="h-11 text-xs">
                          <SelectValue placeholder="Min" />
                        </SelectTrigger>
                        <SelectContent>
                          {MINUTES.map(min => <SelectItem key={min} value={min}>{min}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <Select value={editEndPeriod} onValueChange={setEditEndPeriod} disabled={isSubmitting}>
                        <SelectTrigger className="h-11 text-xs">
                          <SelectValue placeholder="AM/PM" />
                        </SelectTrigger>
                        <SelectContent>
                          {PERIODS.map(prd => <SelectItem key={prd} value={prd}>{prd}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Status & Desc */}
                <div className="grid grid-cols-[120px,1fr] gap-6">
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-[#444444] px-1">Status</label>
                    <Select value={editStatus} onValueChange={(val: any) => setEditStatus(val)} disabled={isSubmitting}>
                      <SelectTrigger className="h-12">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-[#444444] px-1">Description</label>
                    <input 
                      type="text"
                      value={editDesc}
                      onChange={(e) => setEditDesc(e.target.value)}
                      className="h-12 w-full rounded-xl bg-[#0d0d0d] border border-white/5 shadow-[neu-pressed] px-4 text-[13px] font-bold text-white outline-none focus:border-[var(--app-accent)]/20 transition-all"
                      placeholder="Batch Description..."
                      disabled={isSubmitting}
                    />
                  </div>
                </div>

                {/* Student Enrollment Section */}
                <div className="border-t border-white/5 pt-6 flex flex-col gap-4">
                  <div className="flex items-center justify-between px-1">
                    <h4 className="text-[11px] font-black uppercase tracking-[0.25em] text-white">Student Directory</h4>
                    <span className="text-[9px] font-black uppercase tracking-wider text-[#555555]">{currentMembers.length} Enrolled</span>
                  </div>

                  {memberError && (
                    <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-[#ff4d4d] text-xs font-bold flex items-start gap-2.5 animate-in fade-in duration-200">
                      <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                      <span>{memberError}</span>
                    </div>
                  )}

                  {/* Add Student Dropdown */}
                  <div className="flex flex-col gap-2 bg-[#0d0d0d]/40 border border-white/5 rounded-2xl p-4">
                    <label className="text-[9px] font-black uppercase tracking-[0.2em] text-[#444444] px-1">Enroll New Student</label>
                    <Select 
                      onValueChange={(id) => addStudentToBatch(id)}
                      disabled={memberActionLoading !== null || isSubmitting}
                    >
                      <SelectTrigger className="h-12 w-full text-xs">
                        {memberActionLoading === "adding" ? (
                          <div className="flex items-center gap-2 text-[#444444]">
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            <span>Adding student...</span>
                          </div>
                        ) : (
                          <SelectValue placeholder="Choose a student to add..." />
                        )}
                      </SelectTrigger>
                      <SelectContent>
                        {nonMembers.length > 0 ? (
                          nonMembers.map(s => (
                            <SelectItem key={s.id} value={s.id}>
                              {s.name} ({s.batch || "No Batch"})
                            </SelectItem>
                          ))
                        ) : (
                          <div className="p-3 text-center text-[10px] text-[#444444] font-bold">All students already enrolled</div>
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* List Enrolled Students */}
                  <div className="flex flex-col gap-3 mt-1">
                    {currentMembers.length > 0 ? (
                      currentMembers.map((student) => {
                        const isThisLoading = memberActionLoading === student.id;
                        return (
                          <div key={student.id} className="flex items-center justify-between p-4 rounded-xl bg-[#0d0d0d] border border-white/5">
                            <div className="flex flex-col gap-0.5">
                              <span className="text-[13px] font-bold text-white">{student.name}</span>
                              <span className="text-[9px] font-bold uppercase tracking-wider text-[#444444]">{student.rollNumber}</span>
                            </div>
                            <button 
                              onClick={() => removeStudentFromBatch(student)}
                              disabled={memberActionLoading !== null || isSubmitting}
                              className="h-9 w-9 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/10 flex items-center justify-center text-red-500 active:scale-95 transition-all disabled:opacity-30"
                              title="Remove from batch"
                            >
                              {isThisLoading ? (
                                <Loader2 className="h-4 w-4 animate-spin text-red-500" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-center py-6 text-[11px] font-bold text-[#333333] border border-dashed border-white/5 rounded-xl">
                        No students enrolled in this batch yet.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Sticky Footer */}
              <div className="px-10 py-6 bg-[#0d0d0d] border-t border-white/5 shadow-[0_-20px_40px_rgba(0,0,0,0.4)] flex gap-4">
                <button 
                  onClick={handleUpdateBatch}
                  disabled={isSubmitting || !editName || memberActionLoading !== null}
                  className="h-14 flex-1 btn-neon text-[12px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-30"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin text-black" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Save Details
                    </>
                  )}
                </button>
                <button 
                  onClick={() => setEditOpen(false)}
                  disabled={isSubmitting}
                  className="h-14 px-6 rounded-xl bg-[#111111] hover:bg-[#1a1a1a] border border-white/5 text-[12px] font-black uppercase tracking-[0.2em] text-[#555] active:scale-95 transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </DrawerContent>
      </Drawer>

      {/* 5. Empty State / Action */}
      <footer className="px-8 text-center pt-4">
        <button className="text-[11px] font-black uppercase tracking-[0.3em] text-[#333333] hover:text-[#555555] transition-colors">
          Download Schedule PDF
        </button>
      </footer>
    </div>
  );
}
