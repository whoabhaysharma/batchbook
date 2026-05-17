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
import { Plus, LayoutGrid, X } from "lucide-react";
import { IconPlus, IconCalendar, IconUsers } from "@/components/icons/dashboard-icons";
import { getBatches, createBatch } from "@/lib/db";
import { type Batch } from "@/types/batch";
import { cn, formatTimeRange } from "@/lib/utils";
import { APP_CONFIG } from "@/lib/config";




const HOURS = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"];
const MINUTES = ["00", "05", "10", "15", "20", "25", "30", "35", "40", "45", "50", "55"];
const PERIODS = ["AM", "PM"];

export default function BatchesPage() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [newBatchName, setNewBatchName] = useState("");
  
  // Start Time Select State
  const [startHour, setStartHour] = useState("08");
  const [startMinute, setStartMinute] = useState("00");
  const [startPeriod, setStartPeriod] = useState("AM");

  // End Time Select State
  const [endHour, setEndHour] = useState("10");
  const [endMinute, setEndMinute] = useState("00");
  const [endPeriod, setEndPeriod] = useState("AM");

  const [newBatchDesc, setNewBatchDesc] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [open, setOpen] = useState(false);

  const fetchBatches = async () => {
    setLoading(true);
    const data = await getBatches();
    setBatches(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchBatches();
  }, []);

  const handleCreateBatch = async () => {
    if (!newBatchName || !startHour || !startMinute || !startPeriod || !endHour || !endMinute || !endPeriod) return;
    setIsSubmitting(true);
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
        tuitionId: APP_CONFIG.DEFAULT_TUITION_ID,
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
      await fetchBatches();
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
            Administration
          </p>
          <h1 className="text-4xl font-extrabold tracking-tighter text-white">
            Batches
          </h1>
        </div>
        
        <Drawer open={open} onOpenChange={setOpen}>
          <button 
            onClick={() => setOpen(true)}
            className="h-14 w-14 rounded-2xl bg-[#0d0d0d] border border-white/5 shadow-[neu-raised] flex items-center justify-center text-[var(--app-accent)] active:shadow-[neu-pressed] transition-all"
          >
            <IconPlus className="h-7 w-7" />
          </button>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>Initialize Batch</DrawerTitle>
              <DrawerDescription>Define a new learning orbit</DrawerDescription>
            </DrawerHeader>
            <div className="px-10 flex flex-col gap-8 pb-10">
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
                    {/* Start Time Select Fields */}
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

                    {/* End Time Select Fields */}
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

                <DrawerClose asChild>
                  <button 
                    onClick={handleCreateBatch}
                    disabled={isSubmitting || !newBatchName || !startHour || !startMinute || !startPeriod || !endHour || !endMinute || !endPeriod}
                    className="h-16 w-full btn-neon text-[13px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 active:scale-95 transition-all disabled:opacity-30"
                  >
                     {isSubmitting ? "Syncing..." : "Launch Batch"}
                     <LayoutGrid className="h-5 w-5" />
                  </button>
                </DrawerClose>
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
            <div key={i} className="card-cred p-8 flex flex-col gap-6 group active:scale-[0.98] transition-all relative overflow-hidden">
              <div className="flex items-start justify-between relative z-10">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-black tracking-[0.2em] text-[#444444]">#{batch.id.slice(0, 6).toUpperCase()}</span>
                  <h3 className="text-2xl font-black text-white tracking-tight group-active:text-[var(--app-accent)] transition-colors">
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


              <div className="flex items-center gap-8 relative z-10">
                <div className="flex items-center gap-2">
                  <IconUsers className="h-5 w-5 text-[#333333]" />
                  <span className="text-[13px] font-bold text-[#666666]">{batch.students} Members</span>
                </div>
                <div className="flex items-center gap-2">
                  <IconCalendar className="h-5 w-5 text-[#333333]" />
                  <span className="text-[13px] font-bold text-[#666666]">{formatTimeRange(batch.startTime, batch.endTime)}</span>
                </div>
              </div>

              {/* Subtle background glow for active batches */}
              {batch.status === "active" && (
                 <div className="absolute -right-12 -top-12 h-24 w-24 bg-[var(--app-accent)] opacity-[0.03] blur-3xl pointer-events-none" />
              )}
            </div>
          ))
        ) : (
          <div className="card-cred p-12 text-center text-[#444444] flex flex-col items-center justify-center gap-4">
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


      {/* 4. Empty State / Action */}
      <footer className="px-8 text-center pt-4">
        <button className="text-[11px] font-black uppercase tracking-[0.3em] text-[#333333] hover:text-[#555555] transition-colors">
          Download Schedule PDF
        </button>
      </footer>
    </div>
  );
}


