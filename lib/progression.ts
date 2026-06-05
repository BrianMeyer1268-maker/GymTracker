import type { ExerciseLog, Machine, Phase, ProgressionRule } from "./types";

export type Tone = "up" | "hold" | "down" | "neutral";

/**
 * The key a log's progression history is grouped under:
 *  - `machineId + exerciseId` for a multi-exercise station (cable / functional trainer)
 *  - `equipmentGroup + exerciseId` for free weights / bodyweight / kettlebells / bands
 *  - `machineId` alone for a single-purpose machine (chest press, leg press)
 */
export function progressionKey(opts: { machineId?: string; exerciseId?: string; equipmentGroup?: string; multiExercise?: boolean }): string {
  const { machineId, exerciseId, equipmentGroup, multiExercise } = opts;
  if (machineId && exerciseId && multiExercise) return `${machineId}+${exerciseId}`;
  if (equipmentGroup && exerciseId) return `${equipmentGroup}+${exerciseId}`;
  if (machineId) return machineId;
  return exerciseId ?? "";
}

/** The progression key for an existing log — falls back to machineId for legacy logs. */
export function keyForLog(log: ExerciseLog): string {
  return log.progressionKey || log.machineId || log.exerciseId || "";
}

export interface Recommendation {
  action: "increase" | "maintain" | "repeat" | "reduce" | "start";
  suggestedWeight: number | null;
  headline: string;
  detail: string;
  tone: Tone;
  target: [number, number];
  /** e.g. "8+" for display */
  targetLabel: string;
  /** "180 × 10/10/8" or null when no history */
  lastText: string | null;
  /** "180 × 8+" */
  targetText: string;
  /** Short why, e.g. "Repeat 180 because the last set dropped below target." */
  reason: string;
}

// Default load jump per progression rule.
const INCREMENT: Record<ProgressionRule, number> = {
  machine: 10,
  smith: 10,
  barbell: 10,
  cable: 5,
  dumbbell: 5, // "next pair up"
  bodyweight: 0,
  cardio: 0,
};

export function incrementFor(machine: Machine): number {
  if (machine.smallestJump && machine.smallestJump > 0) return machine.smallestJump;
  return INCREMENT[machine.progression] ?? 5;
}

function jumpLabel(machine: Machine): string {
  if (machine.progression === "dumbbell" && !machine.smallestJump) return "the next pair up (~5 lb)";
  return `${incrementFor(machine)} lb`;
}

/** Phase shifts the working rep band. */
export function effectiveTarget(machine: Machine, phase: Phase): [number, number] {
  const [lo, hi] = machine.repTarget;
  if (lo === 0 && hi === 0) return [0, 0]; // cardio / mobility
  if (phase === "strength") return [Math.max(4, lo - 2), Math.max(6, hi - 2)];
  if (phase === "fat-loss") return [lo + 2, hi + 3];
  return [lo, hi];
}

function label(target: [number, number]): string {
  return target[0] > 0 ? `${target[0]}+` : "—";
}

function lastLine(machine: Machine, last: ExerciseLog | undefined): string | null {
  if (!last) return null;
  const reps = last.sets.filter((r) => r > 0).join("/");
  const unit = machine.inverted ? " assist" : "";
  return reps ? `${last.weight}${unit} × ${reps}` : `${last.weight}${unit}`;
}

/**
 * Recommend next-session load for a machine from its last session.
 *
 * Pain (explicit): significant -> reduce + flag; minor -> hold, slow tempo.
 * Then: hard / below range -> repeat; easy + hit top -> increase; right -> maintain.
 * Assisted (inverted) movements flip the direction of "harder".
 */
export function recommend(machine: Machine, last: ExerciseLog | undefined, phase: Phase, flagged: boolean): Recommendation {
  const target = effectiveTarget(machine, phase);
  const [lo, hi] = target;
  const targetLabel = label(target);
  const inc = incrementFor(machine);
  const isCardio = machine.progression === "cardio";
  const lastText = lastLine(machine, last);

  const make = (
    r: Pick<Recommendation, "action" | "suggestedWeight" | "headline" | "detail" | "tone" | "reason">,
  ): Recommendation => {
    const w = r.suggestedWeight;
    const targetText = isCardio ? "beat last effort" : w != null ? `${w} × ${targetLabel}` : targetLabel;
    return { ...r, target, targetLabel, lastText, targetText };
  };

  if (!last) {
    const startW = machine.usualWeight ?? machine.startingWeight ?? null;
    return make({
      action: "start",
      suggestedWeight: startW,
      headline: isCardio ? "Pick an effort" : startW ? `Start ~${startW} lb` : "Log a baseline",
      detail: isCardio ? "Log time or distance to start tracking." : `First time — find a weight you can hit for ${targetLabel} clean reps.`,
      tone: "neutral",
      reason: isCardio ? "First session — log an effort to start tracking." : `Set a baseline${startW ? ` around ${startW} lb` : ""} for ${targetLabel} reps.`,
    });
  }

  if (isCardio) {
    return make({
      action: "maintain",
      suggestedWeight: last.weight || null,
      headline: "Beat last session",
      detail: "Aim to add a little time, distance, or pace versus last time.",
      tone: "hold",
      reason: "Beat last session — a little more time, distance, or pace.",
    });
  }

  const working = last.sets.filter((r) => r > 0);

  if (last.pain === "significant" || flagged) {
    const lighter = machine.inverted ? last.weight + inc : Math.max(0, last.weight - inc);
    return make({
      action: "reduce",
      suggestedWeight: lighter,
      headline: machine.inverted ? `More assist · ${lighter} lb` : `Back off · ${lighter} lb`,
      detail: "Flagged for pain. Drop the load, slow the tempo, and only work a pain-free range. Clear the flag once it feels right.",
      tone: "down",
      reason: `Back off to ${lighter} because pain was flagged — control the movement and stay pain-free.`,
    });
  }
  if (last.pain === "minor") {
    return make({
      action: "maintain",
      suggestedWeight: last.weight,
      headline: `Hold · ${last.weight} lb`,
      detail: "Minor pain last time — repeat the weight, control the tempo, and stop if it worsens.",
      tone: "hold",
      reason: `Hold ${last.weight} because of minor pain last time — watch it.`,
    });
  }

  if (working.length === 0) {
    return make({
      action: "repeat",
      suggestedWeight: last.weight,
      headline: `Repeat ${last.weight} lb`,
      detail: `Aim for ${lo}–${hi} reps on every set.`,
      tone: "neutral",
      reason: `Repeat ${last.weight} and log your sets.`,
    });
  }

  const allHitTop = working.every((r) => r >= hi);
  const anyBelow = working.some((r) => r < lo);
  const allInRange = working.every((r) => r >= lo);

  if (last.difficulty === "hard" || anyBelow) {
    return make({
      action: "repeat",
      suggestedWeight: last.weight,
      headline: `Repeat ${last.weight} lb`,
      detail: anyBelow
        ? `Reps fell under ${lo}. Stay here until all sets are back in the ${lo}–${hi} range.`
        : `Tough last time. Lock in ${last.weight} lb and earn clean ${lo}–${hi} rep sets.`,
      tone: "hold",
      reason: anyBelow ? `Repeat ${last.weight} because the last set dropped below target.` : `Repeat ${last.weight} because it felt hard last time.`,
    });
  }

  if (last.difficulty === "easy" && allHitTop) {
    if (machine.inverted) {
      const lighter = Math.max(0, last.weight - inc);
      return make({
        action: "increase",
        suggestedWeight: lighter,
        headline: `Less assist · ${lighter} lb`,
        detail: `Easy and you hit ${hi}+ every set. Take ${inc} lb off the assist next time.`,
        tone: "up",
        reason: `Drop assist to ${lighter} because all sets hit ${hi}+ and it was easy.`,
      });
    }
    const heavier = last.weight + inc;
    return make({
      action: "increase",
      suggestedWeight: heavier,
      headline: `Go up · ${heavier} lb`,
      detail: `Easy and you topped the range. Add ${jumpLabel(machine)} and aim for ${lo}+ reps.`,
      tone: "up",
      reason: `Increase to ${heavier} because all sets hit target and it felt easy.`,
    });
  }

  if (last.difficulty === "right" && allInRange) {
    if (allHitTop) {
      const next = machine.inverted ? Math.max(0, last.weight - inc) : last.weight + inc;
      return make({
        action: "maintain",
        suggestedWeight: next,
        headline: machine.inverted ? `Try less assist · ${next} lb` : `Hold or +${inc} · ${next} lb`,
        detail: `Solid at the top of the range. Repeat ${last.weight} lb, or move to ${next} lb if it felt strong.`,
        tone: "hold",
        reason: `Hold ${last.weight} or try ${next} — you topped the range and it felt right.`,
      });
    }
    return make({
      action: "maintain",
      suggestedWeight: last.weight,
      headline: `Repeat ${last.weight} lb`,
      detail: `Good working weight. Push toward ${hi} reps on every set.`,
      tone: "hold",
      reason: `Repeat ${last.weight} because reps were in range — chase ${hi} next.`,
    });
  }

  return make({
    action: "repeat",
    suggestedWeight: last.weight,
    headline: `Repeat ${last.weight} lb`,
    detail: `Felt easy but short of ${hi}. Same weight — earn ${hi} reps before adding load.`,
    tone: "hold",
    reason: `Repeat ${last.weight} because reps were short of ${hi}.`,
  });
}
