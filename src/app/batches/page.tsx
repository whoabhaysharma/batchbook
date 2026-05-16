import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { GroupedList, GroupedRow } from "@/components/grouped-list";
import { IconPlus, IconCalendar } from "@/components/icons/dashboard-icons";

export const metadata: Metadata = {
  title: "Batches",
};

export default function BatchesPage() {
  return (
    <div className="flex flex-col gap-6 pb-8">
      <PageHeader 
        title="Batches" 
        subtitle="Manage your classes and schedules"
        trailing={
          <button className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--app-accent)] text-white shadow-md active:scale-95">
            <IconPlus className="h-6 w-6" />
          </button>
        }
      />

      <div className="px-5">
        <div className="card-premium flex flex-col items-center justify-center bg-white p-8 text-center dark:bg-[var(--app-card)]">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20">
            <IconCalendar className="h-8 w-8" />
          </div>
          <p className="text-xl font-bold">No batches found</p>
          <p className="mt-2 text-[15px] leading-relaxed text-[var(--app-text-muted)]">
            Start by creating your first batch to manage students and schedules.
          </p>
        </div>
      </div>

      <GroupedList header="Recent Templates">
        <GroupedRow 
          icon={<IconCalendar className="h-5 w-5" />} 
          trailing={<span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[12px] text-indigo-600">Active</span>}
        >
          Morning STEM
        </GroupedRow>
        <GroupedRow 
          icon={<IconCalendar className="h-5 w-5" />} 
          trailing={<span className="rounded-full bg-amber-50 px-2 py-0.5 text-[12px] text-amber-600">Pending</span>}
        >
          Weekend Revision
        </GroupedRow>
        <GroupedRow 
          icon={<IconCalendar className="h-5 w-5" />} 
          trailing={<span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[12px] text-indigo-600">Active</span>}
          isLast
        >
          Evening Language
        </GroupedRow>
      </GroupedList>
    </div>
  );
}

