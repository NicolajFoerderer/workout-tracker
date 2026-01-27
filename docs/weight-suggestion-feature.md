# Weight Suggestion Feature

## Overview
Suggest weights for the next workout based on previous performance using double progression principles.

## Research Summary

### Double Progression
- Work at a weight until you hit target reps on all sets, then increase weight
- First coined in 1911, validated over 100+ years
- Ideal for intermediate lifters and isolation exercises
- Sources: [Legion Athletics](https://legionathletics.com/double-progression/), [Alpha Progression](https://alphaprogression.com/en/glossary/double-progression)

### RIR/RPE Autoregulation
- RIR (Reps in Reserve) indicates how hard a set felt
- If RIR is higher than target (set felt easy), ready to progress
- If RIR is lower than target (grinding), maintain or reduce
- Sources: [MASS Research Review](https://massresearchreview.com/2023/05/22/rpe-and-rir-the-complete-guide/), [Barbell Medicine](https://www.barbellmedicine.com/blog/autoregulation-and-rpe-part-i/)

### Key Insight
After increasing weight, it's normal to not hit target reps immediately. The lifter works back up to target reps before increasing again.

## Current App Constraints
- Single target rep per exercise (not a rep range)
- Target RIR is optional
- Tracks: weight, reps, sets per exercise

## Proposed Algorithm

### When to Suggest Increase
```
IF last workout hit target reps on ALL sets
   AND (no target RIR defined OR actual RIR >= target RIR)
THEN suggest: last_weight + increment
```

### When to Suggest Maintain
```
ELSE suggest: last_weight
```

### Weight Decreases
Not automatically suggested. Rationale:
- After a weight increase, being below target is expected
- Without a rep range lower bound, we can't determine "stuck"
- User can manually reduce if needed

### Weight Calculation

**Percentage-based increase:**
```
suggested_weight = last_weight * (1 + increase_percentage)
final_weight = round_to_increment(suggested_weight, increment)
```

**Default increase percentage:** 2.5% (adjustable)

**Rounding increments by equipment:**
| Equipment | Round to nearest |
|-----------|------------------|
| Barbell | 2.5 kg |
| Dumbbell | 2 kg |
| Cable/Machine | 2.5 kg (or smallest plate) |

**Examples (at 2.5% increase):**
| Last Weight | Raw Calculation | Rounded (Barbell) |
|-------------|-----------------|-------------------|
| 40 kg | 41.0 kg | 42.5 kg |
| 60 kg | 61.5 kg | 62.5 kg |
| 100 kg | 102.5 kg | 102.5 kg |
| 25 kg (dumbbell) | 25.6 kg | 26 kg |

This ensures small lifts get reasonable jumps while heavy lifts stay conservative.

## Decisions

### UI Design
**Pre-fill the weight input field** with the suggested value. User can accept or type over it. This is the most seamless UX - no extra clicks needed.

### Equipment → Rounding Increment Mapping
| Equipment | Increment |
|-----------|-----------|
| barbell | 2.5 kg |
| dumbbell | 2 kg |
| cable | 2.5 kg |
| machine | 2.5 kg |
| bodyweight | N/A (no weight suggestion) |
| other | 2.5 kg |

### Edge Cases
| Scenario | Behavior |
|----------|----------|
| No previous data for exercise | Empty field, no suggestion |
| Different weights across sets | Use **max weight** from last workout |
| Hit target reps on some sets but not all | Maintain weight (must hit ALL sets) |
| Exercise is reps_only or duration tracking | No weight suggestion |

### Rounding
**Round to nearest** increment (balanced approach).

### RIR Factor
**Ignore for now.** We don't track actual RIR, only target. Hitting target reps implies sufficient RIR. Keep it simple.

### Time Window
**Most recent workout only.** Simpler and more responsive to current state.

### Increase Percentage
**2.5% default.** Not configurable in v1, can add later if needed.
