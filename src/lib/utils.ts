import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { type TimeSlot } from "@/types/batch";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const formatTimeSlot = (slot: TimeSlot): string => {
  if (!slot) return "";
  const hr = slot.hour.toString().padStart(2, "0");
  const min = slot.minute.toString().padStart(2, "0");
  return `${hr}:${min} ${slot.period}`;
};

export const formatTimeRange = (start: TimeSlot, end: TimeSlot): string => {
  if (!start || !end) return "Flexible";
  return `${formatTimeSlot(start)} - ${formatTimeSlot(end)}`;
};

export const formatPeriod = (period: string): string => {
  if (!period || !period.includes("-")) return period;
  const [year, month] = period.split("-");
  const date = new Date(parseInt(year, 10), parseInt(month, 10) - 1, 1);
  return date.toLocaleString('default', { month: 'long', year: 'numeric' });
};

export const getPeriodString = (date: Date): string => {
  const y = date.getFullYear();
  const m = (date.getMonth() + 1).toString().padStart(2, "0");
  return `${y}-${m}`;
};
