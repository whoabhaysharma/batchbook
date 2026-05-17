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
