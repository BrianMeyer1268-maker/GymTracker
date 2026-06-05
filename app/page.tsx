"use client";

import { useState } from "react";
import type { WorkoutGoal } from "@/lib/types";
import { useStore } from "@/lib/store";
import Nav, { type Tab } from "@/components/Nav";
import Today from "@/components/Today";
import MachineCatalog from "@/components/MachineCatalog";
import Timing from "@/components/Timing";
import BodyComp from "@/components/BodyComp";
import Stats from "@/components/Stats";

export default function Page() {
  const { ready, setGoal } = useStore();
  const [tab, setTab] = useState<Tab>("today");
  const [toast, setToast] = useState<string | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    if (typeof window !== "undefined") window.setTimeout(() => setToast(null), 1900);
  }

  function startGoal(g: WorkoutGoal) {
    setGoal(g);
    setTab("today");
  }

  return (
    <div className="mx-auto flex min-h-[100dvh] max-w-app flex-col">
      <main className="flex-1 px-4 pb-28 pt-5">
        {!ready ? (
          <div className="grid min-h-[60dvh] place-items-center text-faint">Loading…</div>
        ) : tab === "today" ? (
          <Today showToast={showToast} />
        ) : tab === "machines" ? (
          <MachineCatalog showToast={showToast} />
        ) : tab === "timing" ? (
          <Timing />
        ) : tab === "body" ? (
          <BodyComp showToast={showToast} />
        ) : (
          <Stats onStartGoal={startGoal} showToast={showToast} />
        )}
      </main>

      <Nav active={tab} onChange={setTab} />

      {toast ? (
        <div className="fixed bottom-[92px] left-1/2 z-[60] -translate-x-1/2 animate-pop rounded-full bg-good px-5 py-2.5 text-sm font-bold text-[#04210f] shadow-lg">
          {toast}
        </div>
      ) : null}
    </div>
  );
}
