import { archiveAssets } from "../data/archive-assets.ts";

export type LunarPhaseIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

export interface LunarPhase {
  index: LunarPhaseIndex;
  name: string;
  ageDays: number;
  illumination: number;
}

const SYNODIC_MONTH = 29.530588853;
const REFERENCE_NEW_MOON = Date.UTC(2000, 0, 6, 18, 14);
const DAY = 86_400_000;
const names = [
  "新月",
  "娥眉月",
  "上弦月",
  "盈凸月",
  "满月",
  "亏凸月",
  "下弦月",
  "残月",
] as const;

export function getLunarPhase(date: Date): LunarPhase {
  const elapsedDays = (date.valueOf() - REFERENCE_NEW_MOON) / DAY;
  const ageDays =
    ((elapsedDays % SYNODIC_MONTH) + SYNODIC_MONTH) % SYNODIC_MONTH;
  const fraction = ageDays / SYNODIC_MONTH;
  const index = (Math.round(fraction * 8) % 8) as LunarPhaseIndex;
  const illumination = Math.round(
    ((1 - Math.cos(fraction * Math.PI * 2)) / 2) * 100,
  );

  return { index, name: names[index], ageDays, illumination };
}

export function getLunarPhaseAsset(index: LunarPhaseIndex): string {
  return archiveAssets.writing.phases[index];
}
