"use client";

import { useState, useEffect } from "react";
import { IconCalendar, IconCash, IconUsers, IconPlus } from "@/components/icons/dashboard-icons";
import Link from "next/link";
import { useAuth } from "@/components/auth-provider";
import { getStudentById, getEnrollmentsByStudentId } from "@/lib/db";
import { Student } from "@/types/student";
import { SubjectEnrollment } from "@/types/enrollment";
import { useParams } from "next/navigation";

export default function StudentDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const { profile } = useAuth();
  const [isMounted, setIsMounted] = useState(false);
  const [student, setStudent] = useState<Student | null>(null);
  const [enrollments, setEnrollments] = useState<SubjectEnrollment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setIsMounted(true);
    if (!id) return;
    
    const fetchStudentData = async () => {
      try {
        const [studentData, enrollmentData] = await Promise.all([
          getStudentById(id),
          getEnrollmentsByStudentId(id)
        ]);
        setStudent(studentData);
        setEnrollments(enrollmentData);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchStudentData();
  }, [id]);

  const totalFee = enrollments.reduce((acc, curr) => acc + curr.monthlyFee, 0);



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
          <Link href="/students" className="text-[10px] font-black text-[var(--app-accent)] uppercase tracking-widest">
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
        <div className="card-cred p-6 flex flex-col gap-2">
           <span className="text-[9px] font-black uppercase tracking-widest text-[#444444]">Status</span>
           <p className="text-[15px] font-extrabold text-[var(--app-accent)] uppercase">{student.status}</p>
        </div>
      </div>

      {/* 3. Information Sections */}
      <section className="flex flex-col gap-8 px-8">
        {/* Subjects & Curriculum */}
        <div className="flex flex-col gap-4">
          <h3 className="text-[11px] font-black uppercase tracking-[0.4em] text-[#333333]">Curriculum</h3>
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
          </div>
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

      </section>

      {/* 4. Actions Footer */}
      <footer className="px-8 flex flex-col gap-4">
         <Link href={`/ledger?studentId=${student.id}`} className="h-16 w-full btn-neon text-[13px] uppercase tracking-[0.2em] flex items-center justify-center">
           Manage Fee Ledger
         </Link>
         <button className="h-16 w-full card-cred flex items-center justify-center text-[13px] uppercase tracking-[0.2em] text-[#666666] font-black border-dashed border-white/10">
           Edit Profile
         </button>
      </footer>
    </div>
  );
}
