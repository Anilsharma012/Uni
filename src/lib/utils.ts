import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

const API_BASE = (import.meta as any)?.env?.VITE_API_BASE_URL || "";

function isLocalhost(url: string) {
  try {
    return url.includes("localhost") || url.includes("127.0.0.1");
  } catch {
    return false;
  }
}

function trimTrailingSlash(value: string) {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function resolveMediaUrl(input?: string | null, fallback = "/placeholder.svg") {
  const src = String(input ?? "").trim();
  if (!src) return fallback;
  if (src.startsWith("data:")) return src;
  if (/^https?:/i.test(src)) return src;

  const normalized = src.startsWith("/") ? src : `/${src}`;
  if (!normalized.startsWith("/uploads")) {
    return normalized;
  }

  const origin = (() => {
    if (API_BASE) {
      if (typeof window !== "undefined") {
        const pageOrigin = window.location.origin;
        if (isLocalhost(API_BASE) && !isLocalhost(pageOrigin)) {
          return trimTrailingSlash(pageOrigin);
        }
      }
      return trimTrailingSlash(API_BASE);
    }
    if (typeof window !== "undefined") {
      return trimTrailingSlash(window.location.origin);
    }
    return "";
  })();

  if (!origin) {
    return normalized;
  }

  return `${origin}${normalized}`;
}
