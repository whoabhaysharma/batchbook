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
import { Plus, LayoutGrid, X } from "lucide-react";
import { IconPlus, IconCalendar, IconUsers } from "@/components/icons/dashboard-icons";
import { getBatches, createBatch } from "@/lib/db";
import { type Batch } from "@/types/batch";
import { cn } from "@/lib/utils";
import { APP_CONFIG } from "@/lib/config";




export default function BatchesPage() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [newBatchName, setNewBatchName] = useState("");
  const [newBatchTime, setNewBatchTime] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    if (!newBatchName || !newBatchTime) return;
    setIsSubmitting(true);
    try {
      await createBatch({
        name: newBatchName,
        time: newBatchTime,
        status: "active",
        tuitionId: APP_CONFIG.DEFAULT_TUITION_ID,
      });


      setNewBatchName("");
      setNewBatchTime("");
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
        
        <Drawer>
          <DrawerTrigger asChild>
            <button className="h-14 w-14 rounded-2xl bg-[#0d0d0d] border border-white/5 shadow-[neu-raised] flex items-center justify-center text-[var(--app-accent)] active:shadow-[neu-pressed] transition-all">
              <IconPlus className="h-7 w-7" />
            </button>
          </DrawerTrigger>
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
                 <label className="text-[10px] font-black uppercase tracking-[0.3em] text-[#444444] px-1">Default Timing</label>
                 <input 
                   type="text" 
                   value={newBatchTime}
                   onChange={(e) => setNewBatchTime(e.target.value)}
                   className="h-16 w-full rounded-2xl bg-[#0d0d0d] border border-white/5 shadow-[neu-pressed] px-6 text-[16px] font-bold text-white outline-none focus:border-[var(--app-accent)]/20 transition-all"
                   placeholder="e.g. 08:00 AM - 10:00 AM"
                 />
               </div>
               <DrawerClose asChild>
                 <button 
                   onClick={handleCreateBatch}
                   disabled={isSubmitting || !newBatchName || !newBatchTime}
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
           <div className="card-cred p-10 text-center text-[#444444] font-black uppercase tracking-widest">
             Loading batches...
           </div>
        ) : batches.map((batch, i) => (
          <div key={i} className="card-cred p-8 flex flex-col gap-6 group active:scale-[0.98] transition-all relative overflow-hidden">
            <div className="flex items-start justify-between relative z-10">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-black tracking-[0.2em] text-[#444444]">#{batch.id.slice(0, 6).toUpperCase()}</span>
                <h3 className="text-2xl font-black text-white tracking-tight group-active:text-[var(--app-accent)] transition-colors">
                  {batch.name}
                </h3>
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
                <span className="text-[13px] font-bold text-[#666666]">{batch.time || "Flexible"}</span>
              </div>
            </div>

            {/* Subtle background glow for active batches */}
            {batch.status === "active" && (
               <div className="absolute -right-12 -top-12 h-24 w-24 bg-[var(--app-accent)] opacity-[0.03] blur-3xl pointer-events-none" />
            )}
          </div>
        ))}
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


