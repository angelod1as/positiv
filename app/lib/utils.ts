import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Used for testing
export const sleep = (time: number) =>
  new Promise((resolve) => setTimeout(resolve, time))
