import type { Tables } from "./types";
import { startOfDay, isOverdue, isDueWithin, parseLocalDateString } from "./dates";
import { DUE_SOON_DAYS } from "./constants";

type HealthLog = Tables<"health_logs">;
type WeightLog = Tables<"weight_logs">;

export type SuggestedStatus = "Needs Attention" | "Monitor" | "Healthy";

export interface StatusSuggestion {
  suggested: SuggestedStatus;
  reasons: string[];
  nextVaccine?: Date | null;
  nextFlea?: Date | null;
  nextDeworm?: Date | null;
  lastWeight?: { date: Date; weightKg: number } | null;
}

export function buildStatusSuggestion(args: {
  healthLogs: HealthLog[];
  weightLogs: WeightLog[];
}): StatusSuggestion {
  const { healthLogs, weightLogs } = args;
  const today = startOfDay(new Date());
  const reasons: string[] = [];

  const nextVaccine = findNextDue(healthLogs, "VACCINE");
  const nextFlea = findNextDue(healthLogs, "FLEA");
  const nextDeworm = findNextDue(healthLogs, "DEWORM");

  const anyOverdue =
    isOverdue(nextVaccine, today) ||
    isOverdue(nextFlea, today) ||
    isOverdue(nextDeworm, today);

  const anyDueSoon =
    isDueWithin(nextVaccine, today, DUE_SOON_DAYS) ||
    isDueWithin(nextFlea, today, DUE_SOON_DAYS) ||
    isDueWithin(nextDeworm, today, DUE_SOON_DAYS);

  const activeTreatment = healthLogs.some((h) => h.is_active_treatment);

  const sortedWeights = [...weightLogs].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );

  let lastWeight: StatusSuggestion["lastWeight"] = null;
  let weightDropCritical = false;

  if (sortedWeights.length > 0) {
    const latest = sortedWeights[0];
    lastWeight = {
      date: new Date(latest.date),
      weightKg: Number(latest.weight_kg),
    };
  }

  if (sortedWeights.length >= 2) {
    const [latest, previous] = sortedWeights;
    const latestW = Number(latest.weight_kg);
    const prevW = Number(previous.weight_kg);
    if (prevW > 0 && latestW < prevW * 0.9) {
      weightDropCritical = true;
    }
  }

  const overdueItems: string[] = [];
  if (isOverdue(nextVaccine, today)) overdueItems.push("Vaksin");
  if (isOverdue(nextFlea, today)) overdueItems.push("Flea");
  if (isOverdue(nextDeworm, today)) overdueItems.push("Deworm");
  if (overdueItems.length > 0) {
    reasons.push(`${overdueItems.join(", ")} terlambat`);
  }

  const dueSoonItems: string[] = [];
  if (anyDueSoon && !isOverdue(nextVaccine, today) && isDueWithin(nextVaccine, today, DUE_SOON_DAYS))
    dueSoonItems.push("Vaksin");
  if (anyDueSoon && !isOverdue(nextFlea, today) && isDueWithin(nextFlea, today, DUE_SOON_DAYS))
    dueSoonItems.push("Flea");
  if (anyDueSoon && !isOverdue(nextDeworm, today) && isDueWithin(nextDeworm, today, DUE_SOON_DAYS))
    dueSoonItems.push("Deworm");
  if (dueSoonItems.length > 0) {
    reasons.push(`${dueSoonItems.join(", ")} jatuh tempo dalam ${DUE_SOON_DAYS} hari`);
  }

  if (activeTreatment) {
    reasons.push("Sedang dalam perawatan aktif");
  }
  if (weightDropCritical) {
    reasons.push("Berat badan turun >10% dari log sebelumnya");
  }

  let suggested: SuggestedStatus = "Healthy";
  if (anyOverdue || activeTreatment || weightDropCritical) {
    suggested = "Needs Attention";
  } else if (anyDueSoon) {
    suggested = "Monitor";
  }

  return {
    suggested,
    reasons,
    nextVaccine,
    nextFlea,
    nextDeworm,
    lastWeight,
  };
}

function findNextDue(
  healthLogs: HealthLog[],
  type: "VACCINE" | "FLEA" | "DEWORM",
): Date | null {
  const candidates = healthLogs
    .filter((h) => h.type === type && h.next_due_date)
    .map((h) => parseLocalDateString(h.next_due_date as string))
    .filter((d): d is Date => d != null && !Number.isNaN(d.getTime()))
    .sort((a, b) => a.getTime() - b.getTime());

  return candidates[0] ?? null;
}

