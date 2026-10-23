"use client";

import { Heart } from "lucide-react";
import { toggleSaved, useSavedSlugs } from "@/lib/saved";

/** Heart toggle for Saved picks. `variant="overlay"` sits on a product photo. */
export function SaveButton({
  slug,
  title,
  variant = "overlay",
}: {
  slug: string;
  title: string;
  variant?: "overlay" | "button";
}) {
  const saved = useSavedSlugs().includes(slug);
  const label = saved ? `Remove ${title} from Saved` : `Save ${title}`;

  if (variant === "button") {
    return (
      <button
        type="button"
        onClick={() => toggleSaved(slug)}
        aria-pressed={saved}
        aria-label={label}
        className="pressable inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-full border border-border bg-card px-5 text-[15px] font-semibold text-foreground hover:bg-card-muted"
      >
        <Heart
          className={`h-5 w-5 ${saved ? "fill-brand text-brand" : ""}`}
          aria-hidden
        />
        {saved ? "Saved" : "Save"}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        toggleSaved(slug);
      }}
      aria-pressed={saved}
      aria-label={label}
      className="pressable absolute right-1 top-1 z-10 inline-flex h-11 w-11 items-center justify-center rounded-full"
    >
      <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/90 shadow-sm ring-1 ring-black/5">
        <Heart
          className={`h-[18px] w-[18px] ${
            saved ? "fill-brand text-brand" : "text-neutral-700"
          }`}
          aria-hidden
        />
      </span>
    </button>
  );
}
