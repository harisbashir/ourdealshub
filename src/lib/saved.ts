"use client";

import { useSyncExternalStore } from "react";

/**
 * Saved picks — kept only in this browser (localStorage), no account needed.
 * We store slugs, not product data, so the Saved page always shows current
 * details and quietly drops picks that are no longer live.
 */

const KEY = "odh-saved";
const MAX_SAVED = 200;
const listeners = new Set<() => void>();
let snapshot: string[] | null = null;

function read(): string[] {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed)
      ? parsed.filter((s): s is string => typeof s === "string").slice(0, MAX_SAVED)
      : [];
  } catch {
    return [];
  }
}

function emit() {
  snapshot = null;
  for (const l of listeners) l();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) emit();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

function getSnapshot(): string[] {
  if (snapshot === null) snapshot = read();
  return snapshot;
}

const EMPTY: string[] = [];

export function useSavedSlugs(): string[] {
  return useSyncExternalStore(subscribe, getSnapshot, () => EMPTY);
}

export function toggleSaved(slug: string): boolean {
  const current = read();
  const has = current.includes(slug);
  const next = has
    ? current.filter((s) => s !== slug)
    : [slug, ...current].slice(0, MAX_SAVED);
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* storage blocked — nothing to persist */
  }
  emit();
  return !has;
}

export function removeSaved(slugs: string[]) {
  if (!slugs.length) return;
  const drop = new Set(slugs);
  try {
    localStorage.setItem(KEY, JSON.stringify(read().filter((s) => !drop.has(s))));
  } catch {
    /* ignore */
  }
  emit();
}
