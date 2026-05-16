import { IconCalendar, IconCash, IconUsers, IconPlus } from "@/components/icons/dashboard-icons";
import Link from "next/link";

export default function StudentDetailPage({ params }: { params: { id: string } }) {
  // Mock data for the demonstration
  const student = {
    name: "Rahul Sharma",
    id: params.id || "S-1001",
    batch: "Morning STEM",
    joined: "12 Jan 2026",
    status: "PAID",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Rahul",
    guardian: "Mrs. Sunita Sharma",
    phone: "+91 98765 43210",
    email: "rahul.s@example.com",
    fees: {
      total: "₹ 15,000",
      paid: "₹ 15,000",
      pending: "₹ 0",
    }
  };

  return (
    <div className="flex flex-col gap-10 pb-28">
      {/* 1. Profile Header */}
      <header className="flex flex-col items-center gap-6 px-8 pt-16">
        <div className="h-32 w-32 rounded-[2.5rem] bg-[#0d0d0d] border border-white/5 shadow-[neu-raised] flex items-center justify-center overflow-hidden">
          <img
            src={student.avatar}
            alt={student.name}
            className="h-24 w-24 rounded-full grayscale opacity-80"
          />
        </div>
        <div className="flex flex-col items-center gap-1">
          <h1 className="text-3xl font-black text-white tracking-tight">{student.name}</h1>
          <p className="text-[11px] font-black uppercase tracking-[0.4em] text-[#444444]">
            Member ID: {student.id}
          </p>
        </div>
      </header>

      {/* 2. Quick Stats Grid */}
      <div className="grid grid-cols-2 gap-6 px-8">
        <div className="card-cred p-6 flex flex-col gap-2">
           <span className="text-[9px] font-black uppercase tracking-widest text-[#444444]">Batch</span>
           <p className="text-[15px] font-extrabold text-white">{student.batch}</p>
        </div>
        <div className="card-cred p-6 flex flex-col gap-2">
           <span className="text-[9px] font-black uppercase tracking-widest text-[#444444]">Status</span>
           <p className="text-[15px] font-extrabold text-[var(--app-accent)]">{student.status}</p>
        </div>
      </div>

      {/* 3. Information Sections */}
      <section className="flex flex-col gap-8 px-8">
        {/* Contact Info */}
        <div className="flex flex-col gap-4">
          <h3 className="text-[11px] font-black uppercase tracking-[0.4em] text-[#333333]">Contact Details</h3>
          <div className="card-cred p-6 flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase text-[#444444]">Guardian</span>
                <p className="text-[15px] font-bold text-white/90">{student.guardian}</p>
              </div>
              <button className="h-10 w-10 rounded-xl bg-[#0d0d0d] border border-white/5 shadow-[neu-raised] flex items-center justify-center text-[var(--app-accent)] active:shadow-[neu-pressed]">
                 <IconUsers className="h-5 w-5" />
              </button>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase text-[#444444]">Phone</span>
                <p className="text-[15px] font-bold text-white/90">{student.phone}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Fee Summary */}
        <div className="flex flex-col gap-4">
          <h3 className="text-[11px] font-black uppercase tracking-[0.4em] text-[#333333]">Fee Summary</h3>
          <div className="card-cred p-8 flex flex-col gap-6 bg-gradient-to-br from-[var(--app-accent-soft)] to-transparent">
            <div className="flex items-center justify-between">
               <h4 className="text-xl font-black text-white">Full Paid</h4>
               <IconCash className="h-6 w-6 text-[var(--app-accent)]" />
            </div>
            <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
               <div className="h-full w-full bg-[var(--app-accent)] shadow-[0_0_8px_var(--app-accent)]" />
            </div>
            <div className="flex justify-between items-center">
               <span className="text-[12px] font-bold text-[#666666]">Total: {student.fees.total}</span>
               <span className="text-[12px] font-black text-[var(--app-accent)]">NO DUES</span>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Actions Footer */}
      <footer className="px-8 flex flex-col gap-4">
         <button className="h-16 w-full btn-neon text-[13px] uppercase tracking-[0.2em]">
           Collect Fee Receipt
         </button>
         <button className="h-16 w-full card-cred flex items-center justify-center text-[13px] uppercase tracking-[0.2em] text-[#666666] font-black border-dashed border-white/10">
           Edit Profile
         </button>
      </footer>
    </div>
  );
}
