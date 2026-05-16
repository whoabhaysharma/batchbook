import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { GroupedList, GroupedRow } from "@/components/grouped-list";
import { IconPlus, IconUsers } from "@/components/icons/dashboard-icons";

export const metadata: Metadata = {
  title: "Students",
};

export default function StudentsPage() {
  return (
    <div className="flex flex-col gap-6 pb-8">
      <PageHeader 
        title="Students" 
        subtitle="Manage profiles and enrollments"
        trailing={
          <button className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--app-accent)] text-white shadow-md active:scale-95">
            <IconPlus className="h-6 w-6" />
          </button>
        }
      />

      <div className="px-5">
        <div className="card-premium flex flex-col items-center justify-center bg-white p-8 text-center dark:bg-[var(--app-card)]">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20">
            <IconUsers className="h-8 w-8" />
          </div>
          <p className="text-xl font-bold">No students yet</p>
          <p className="mt-2 text-[15px] leading-relaxed text-[var(--app-text-muted)]">
            Add your first student to start tracking attendance and managing fees.
          </p>
        </div>
      </div>

      <GroupedList header="Quick Filters">
        <GroupedRow icon={<IconUsers className="h-5 w-5" />} trailing="148">
          All Students
        </GroupedRow>
        <GroupedRow icon={<IconUsers className="h-5 w-5" />} trailing="12">
          New Enrollments
        </GroupedRow>
        <GroupedRow icon={<IconUsers className="h-5 w-5" />} trailing="3" isLast>
          Pending Fees
        </GroupedRow>
      </GroupedList>
    </div>
  );
}

