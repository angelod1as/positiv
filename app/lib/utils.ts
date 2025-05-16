import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Used for testing
export const sleep = (time: number) =>
  new Promise((resolve) => setTimeout(resolve, time))

export const dateRegex =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})?$/

export const dateTimeFormat = "yyyy-MM-dd'T'hh:mm"
