"use client";

import { useEffect, useState } from "react";
import type { Machine } from "@/lib/types";
import { getPhoto } from "@/lib/photos";
import { CATEGORY_ICON, CATEGORY_GROUP, type CatalogGroup } from "@/lib/movement";

// Fallback tile background per catalog group (static classes for Tailwind).
const GROUP_BG: Record<CatalogGroup, string> = {
  push: "from-push/25 to-surface2",
  pull: "from-pull/25 to-surface2",
  legs: "from-legs/25 to-surface2",
  cardio: "from-cond/25 to-surface2",
  core: "from-accent/20 to-surface2",
};

/** Shows the real gym photo once taken; otherwise a clear "no photo yet" placeholder
 *  (category glyph on a tinted background) — not a generic stock icon. */
export default function PhotoTile({ machine, className = "" }: { machine: Machine; className?: string }) {
  const [gym, setGym] = useState<string | null>(null);
  useEffect(() => {
    setGym(getPhoto(machine.gymPhotoId));
  }, [machine.gymPhotoId]);

  if (gym) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={gym} alt={machine.name} className={`h-full w-full object-cover ${className}`} />;
  }

  const group = CATEGORY_GROUP[machine.category];
  return (
    <div className={`flex h-full w-full flex-col items-center justify-center gap-1 bg-gradient-to-br ${GROUP_BG[group]} ${className}`}>
      <span className="text-3xl opacity-80" aria-hidden>
        {CATEGORY_ICON[machine.category]}
      </span>
      <span className="text-[9px] font-semibold uppercase tracking-wide text-faint">No photo yet</span>
    </div>
  );
}
