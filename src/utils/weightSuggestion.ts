/**
 * Weight suggestion based on double progression principles.
 * See docs/weight-suggestion-feature.md for full spec.
 */

type Equipment = 'barbell' | 'dumbbell' | 'cable' | 'machine' | 'bodyweight' | 'other';

const INCREASE_PERCENTAGE = 0.025; // 2.5%

const EQUIPMENT_INCREMENTS: Record<Equipment, number> = {
  barbell: 2.5,
  dumbbell: 2,
  cable: 2.5,
  machine: 2.5,
  bodyweight: 0, // No weight suggestion
  other: 2.5,
};

interface PreviousSet {
  weight?: number;
  reps?: number;
}

interface SuggestionResult {
  weight: number;
  isIncrease: boolean;
}

/**
 * Round a weight to the nearest increment
 */
function roundToIncrement(weight: number, increment: number): number {
  return Math.round(weight / increment) * increment;
}

/**
 * Calculate suggested weight for next workout based on previous performance.
 *
 * @param previousSets - Sets from the last workout for this exercise
 * @param targetReps - Target reps per set (from template)
 * @param equipment - Equipment type (determines rounding increment)
 * @returns Suggested weight and whether it's an increase, or null if no suggestion
 */
export function calculateSuggestedWeight(
  previousSets: PreviousSet[] | undefined,
  targetReps: number,
  equipment: Equipment = 'other'
): SuggestionResult | null {
  // No suggestion for bodyweight exercises
  if (equipment === 'bodyweight') {
    return null;
  }

  // No previous data
  if (!previousSets || previousSets.length === 0) {
    return null;
  }

  // Filter sets that have weight data
  const setsWithWeight = previousSets.filter(s => s.weight !== undefined && s.weight > 0);
  if (setsWithWeight.length === 0) {
    return null;
  }

  // Get max weight used (for when different weights across sets)
  const maxWeight = Math.max(...setsWithWeight.map(s => s.weight!));

  // Check if target reps were hit on ALL sets
  const hitTargetOnAllSets = setsWithWeight.every(s => (s.reps ?? 0) >= targetReps);

  const increment = EQUIPMENT_INCREMENTS[equipment];

  if (hitTargetOnAllSets) {
    // Suggest increased weight
    const rawIncrease = maxWeight * (1 + INCREASE_PERCENTAGE);
    const suggested = roundToIncrement(rawIncrease, increment);
    // Ensure we actually increase (in case rounding went down)
    const finalWeight = suggested > maxWeight ? suggested : maxWeight + increment;
    return { weight: finalWeight, isIncrease: true };
  } else {
    // Maintain current weight
    return { weight: maxWeight, isIncrease: false };
  }
}

/**
 * Format a weight value for display (remove unnecessary decimals)
 */
export function formatWeight(weight: number): string {
  return weight % 1 === 0 ? weight.toString() : weight.toFixed(1);
}
