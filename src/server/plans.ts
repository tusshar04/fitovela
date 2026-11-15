// Builds the plan stored on an order, for either track.

import type { Assessment } from '@/domain/assessment';
import type { Track } from '@/domain/energy';
import { TIERS } from '@/domain/offer';
import { generatePlan, type Plan } from '@/domain/plan/generator';
import type { Order } from './store';

export function buildPlan(order: Pick<Order, 'id' | 'tier'>, assessment: Assessment, track: Track): Plan {
  const energy = track === 'intensive' ? assessment.intensive.energy : assessment.energy;
  const plan = generatePlan({
    // A different seed per track, so a plan moved to standard is not the intensive one with extras.
    seed: track === 'intensive' ? `${order.id}:intensive` : order.id,
    days: TIERS[order.tier].days,
    targetKcal: energy.targetKcal,
    typeId: assessment.result.type,
    cuisines: assessment.cuisines,
    diet: assessment.diet,
    avoid: assessment.avoid,
    weekOneLighterOn: assessment.weekOneLighterOn,
    medicationAdvisory: assessment.eligibility.medicationAdvisory,
    movement: energy.movement,
    track,
  });
  plan.journey = track === 'intensive' ? assessment.intensive.journey : assessment.journey;
  return plan;
}
