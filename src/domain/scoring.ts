// Scoring per the doctor's answer 4A: a simple count of signs per area.
// 0 to 1 signs is Low, 2 to 3 is Moderate, 4 or more is High.

import { MARKERS, QUESTIONS, type MarkerId } from './questions';
import { AREAS, asList, type Answers, type Area, type Level } from './types';

/** Every distinct marker the answers trigger, in questionnaire order. */
export function markersFrom(answers: Answers): MarkerId[] {
  const found: MarkerId[] = [];
  for (const q of QUESTIONS) {
    if (!q.options) continue;
    if (q.showIf && !q.showIf(answers)) continue;
    const chosen = asList(answers[q.id]);
    for (const opt of q.options) {
      if (opt.marker && chosen.includes(opt.id) && !found.includes(opt.marker)) found.push(opt.marker);
    }
  }
  return found;
}

export function levelFor(count: number): Level {
  if (count >= 4) return 'high';
  if (count >= 2) return 'moderate';
  return 'low';
}

export function areaCounts(markers: MarkerId[]): Record<Area, number> {
  const counts: Record<Area, number> = { pcos: 0, insulin: 0, inflammation: 0, thyroid: 0 };
  for (const m of markers) {
    const area = MARKERS[m].area;
    if (area !== 'stress') counts[area] += 1;
  }
  return counts;
}

export function stressCount(markers: MarkerId[]): number {
  return markers.filter((m) => MARKERS[m].area === 'stress').length;
}

export function areaLevels(counts: Record<Area, number>): Record<Area, Level> {
  return Object.fromEntries(AREAS.map((a) => [a, levelFor(counts[a])])) as Record<Area, Level>;
}

/** How many markers exist per area in the questionnaire (the denominator). */
export const MARKER_TOTALS: Record<Area, number> = (() => {
  const totals: Record<Area, number> = { pcos: 0, insulin: 0, inflammation: 0, thyroid: 0 };
  for (const m of Object.values(MARKERS)) if (m.area !== 'stress') totals[m.area] += 1;
  return totals;
})();
