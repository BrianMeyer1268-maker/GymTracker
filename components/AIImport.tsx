"use client";

import { useState } from "react";
import Sheet from "./Sheet";
import GymScan from "./GymScan";
import BodyScan from "./BodyScan";
import ClassifyMachine from "./ClassifyMachine";

type Mode = "menu" | "gym" | "machine" | "body";

function Option({ icon, title, sub, onClick }: { icon: string; title: string; sub: string; onClick: () => void }) {
  return (
    <button className="tap flex items-center gap-3 rounded-2xl border border-line bg-surface2 p-4 text-left active:bg-surface3" onClick={onClick}>
      <span className="text-3xl" aria-hidden>{icon}</span>
      <div className="min-w-0 flex-1">
        <div className="font-bold">{title}</div>
        <div className="text-xs text-muted">{sub}</div>
      </div>
      <span className="text-xl text-faint">›</span>
    </button>
  );
}

export default function AIImport({ onClose, showToast }: { onClose: () => void; showToast: (m: string) => void }) {
  const [mode, setMode] = useState<Mode>("menu");

  if (mode === "gym") return <GymScan onClose={() => setMode("menu")} showToast={showToast} />;
  if (mode === "machine") return <ClassifyMachine onClose={() => setMode("menu")} showToast={showToast} />;
  if (mode === "body") return <BodyScan onClose={() => setMode("menu")} showToast={showToast} />;

  return (
    <Sheet open onClose={onClose} title="✨ AI Import">
      <p className="text-sm text-muted">Let AI read your uploads and fill in the details. You always review before anything is saved — nothing overwrites your existing data.</p>
      <div className="mt-3 flex flex-col gap-3">
        <Option icon="🏟️" title="Scan a gym" sub="Photos, flyer, floor, or a website → machine catalog" onClick={() => setMode("gym")} />
        <Option icon="📷" title="Identify a machine" sub="Snap an unknown machine → name, muscles, how to start" onClick={() => setMode("machine")} />
        <Option icon="⚖️" title="Import a body scan" sub="Fitdays / InBody screenshot → body composition" onClick={() => setMode("body")} />
      </div>
      <p className="mt-4 text-[11px] text-faint">⚠ Uploaded images/text leave your device and go to OpenAI to be read. Everything else stays on your phone.</p>
    </Sheet>
  );
}
