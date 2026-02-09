import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { getWorkoutLogById, getExerciseProgress, deleteWorkoutLog } from '../utils/api';
import { calculateSuggestedWeight, formatWeight } from '../utils/weightSuggestion';

type Equipment = 'barbell' | 'dumbbell' | 'cable' | 'machine' | 'bodyweight' | 'other';

interface SetData {
  weight?: number;
  reps?: number;
}

interface ExerciseLogItem {
  id: string;
  exercise_id: string;
  exercise_name: string;
  exercise_name_snapshot: string;
  exercise_equipment: Equipment;
  exercise_tracking: string;
  tracking: string;
  sets: SetData[];
}

interface WorkoutLog {
  id: string;
  date: string;
  template_name_snapshot: string;
  items: ExerciseLogItem[];
}

interface ProgressEntry {
  date: string;
  sets: SetData[];
  tracking: string;
}

interface ProgressDataPoint {
  date: string;
  value: number;
  isCurrentWorkout?: boolean;
}

interface ExerciseStats {
  exerciseId: string;
  exerciseName: string;
  equipment: Equipment;
  tracking: string;
  sets: SetData[];
  totalVolume: number;
  bestE1RM: number;
  bestReps: number;
  isPR: boolean;
  prType: 'e1rm' | 'reps' | null;
  previousBest: number;
  progressData: ProgressDataPoint[];
  suggestedWeight: string | null;
}

function calculateE1RM(weight: number, reps: number): number {
  if (reps <= 0 || weight <= 0) return 0;
  return weight * (1 + reps / 30);
}

function computeE1RMProgress(entries: ProgressEntry[]): ProgressDataPoint[] {
  const progressMap = new Map<string, number>();

  for (const entry of entries) {
    if (entry.tracking !== 'load_reps') continue;
    const sets = Array.isArray(entry.sets) ? entry.sets : [];
    let maxE1rm = 0;

    for (const set of sets) {
      if (set.weight && set.reps) {
        const e1rm = calculateE1RM(set.weight, set.reps);
        if (e1rm > maxE1rm) maxE1rm = e1rm;
      }
    }

    if (maxE1rm > 0) {
      const existing = progressMap.get(entry.date);
      if (!existing || maxE1rm > existing) {
        progressMap.set(entry.date, maxE1rm);
      }
    }
  }

  const result: ProgressDataPoint[] = [];
  progressMap.forEach((value, date) => {
    result.push({ date, value });
  });

  return result.sort((a, b) => a.date.localeCompare(b.date));
}

function computeRepsProgress(entries: ProgressEntry[]): ProgressDataPoint[] {
  const progressMap = new Map<string, number>();

  for (const entry of entries) {
    if (entry.tracking !== 'reps_only') continue;
    const sets = Array.isArray(entry.sets) ? entry.sets : [];
    let maxReps = 0;

    for (const set of sets) {
      if (set.reps && set.reps > maxReps) {
        maxReps = set.reps;
      }
    }

    if (maxReps > 0) {
      const existing = progressMap.get(entry.date);
      if (!existing || maxReps > existing) {
        progressMap.set(entry.date, maxReps);
      }
    }
  }

  const result: ProgressDataPoint[] = [];
  progressMap.forEach((value, date) => {
    result.push({ date, value });
  });

  return result.sort((a, b) => a.date.localeCompare(b.date));
}

export function WorkoutSummary() {
  const { workoutLogId } = useParams<{ workoutLogId: string }>();
  const navigate = useNavigate();
  const [workoutLog, setWorkoutLog] = useState<WorkoutLog | null>(null);
  const [exerciseStats, setExerciseStats] = useState<ExerciseStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!workoutLogId) return;
    if (!confirm('Delete this workout? This cannot be undone.')) return;

    setDeleting(true);
    try {
      await deleteWorkoutLog(workoutLogId);
      navigate('/history');
    } catch (error) {
      console.error('Failed to delete workout:', error);
      alert('Failed to delete workout');
      setDeleting(false);
    }
  };

  useEffect(() => {
    if (!workoutLogId) return;

    const loadWorkoutSummary = async () => {
      try {
        const log = await getWorkoutLogById(workoutLogId) as WorkoutLog;
        setWorkoutLog(log);

        const stats: ExerciseStats[] = [];

        for (const item of log.items) {
          const isRepsOnly = item.tracking === 'reps_only';
          const sets = Array.isArray(item.sets) ? item.sets : [];

          // Calculate stats for this workout
          let totalVolume = 0;
          let bestE1RM = 0;
          let bestReps = 0;

          for (const set of sets) {
            if (set.weight && set.reps) {
              totalVolume += set.weight * set.reps;
              const e1rm = calculateE1RM(set.weight, set.reps);
              if (e1rm > bestE1RM) bestE1RM = e1rm;
            }
            if (set.reps && set.reps > bestReps) {
              bestReps = set.reps;
            }
          }

          // Get historical progress
          const entries = await getExerciseProgress(item.exercise_id) as ProgressEntry[];
          const progressData = isRepsOnly
            ? computeRepsProgress(entries)
            : computeE1RMProgress(entries);

          // Mark current workout in progress data
          const currentValue = isRepsOnly ? bestReps : bestE1RM;
          const progressWithCurrent = progressData.map(p => ({
            ...p,
            isCurrentWorkout: p.date === log.date,
          }));

          // Check for PR (compare to all previous entries, not including current)
          const previousEntries = progressData.filter(p => p.date < log.date);
          const previousBest = previousEntries.length > 0
            ? Math.max(...previousEntries.map(p => p.value))
            : 0;
          const isPR = currentValue > previousBest && currentValue > 0;

          // Calculate suggested weight for next workout
          let suggestedWeight: string | null = null;
          if (!isRepsOnly && sets.length > 0) {
            // Get target reps from the first set (assume consistent target)
            const targetReps = sets[0]?.reps || 8;
            const suggestion = calculateSuggestedWeight(
              sets,
              targetReps,
              item.exercise_equipment
            );
            if (suggestion) {
              suggestedWeight = formatWeight(suggestion.weight);
            }
          }

          stats.push({
            exerciseId: item.exercise_id,
            exerciseName: item.exercise_name,
            equipment: item.exercise_equipment,
            tracking: item.tracking,
            sets,
            totalVolume,
            bestE1RM,
            bestReps,
            isPR,
            prType: isPR ? (isRepsOnly ? 'reps' : 'e1rm') : null,
            previousBest,
            progressData: progressWithCurrent,
            suggestedWeight,
          });
        }

        setExerciseStats(stats);
      } catch (error) {
        console.error('Failed to load workout summary:', error);
      } finally {
        setLoading(false);
      }
    };

    loadWorkoutSummary();
  }, [workoutLogId]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatShortDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  if (loading) {
    return <div className="text-center py-8 text-zinc-500">Loading summary...</div>;
  }

  if (!workoutLog) {
    return <div className="text-center py-8 text-zinc-500">Workout not found</div>;
  }

  const totalSets = exerciseStats.reduce((sum, e) => sum + e.sets.length, 0);
  const totalVolume = exerciseStats.reduce((sum, e) => sum + e.totalVolume, 0);
  const totalPRs = exerciseStats.filter(e => e.isPR).length;

  return (
    <div className="pb-20">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Workout Complete!</h1>
        <p className="text-zinc-500">{workoutLog.template_name_snapshot} • {formatDate(workoutLog.date)}</p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-[#141416] rounded-xl border border-zinc-800/50 p-4 text-center">
          <p className="text-2xl font-bold text-white">{exerciseStats.length}</p>
          <p className="text-xs text-zinc-500">Exercises</p>
        </div>
        <div className="bg-[#141416] rounded-xl border border-zinc-800/50 p-4 text-center">
          <p className="text-2xl font-bold text-white">{totalSets}</p>
          <p className="text-xs text-zinc-500">Sets</p>
        </div>
        <div className="bg-[#141416] rounded-xl border border-zinc-800/50 p-4 text-center">
          <p className="text-2xl font-bold text-white">{(totalVolume / 1000).toFixed(1)}k</p>
          <p className="text-xs text-zinc-500">Volume (kg)</p>
        </div>
      </div>

      {/* PRs Section */}
      {totalPRs > 0 && (
        <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 rounded-2xl border border-yellow-500/30 p-4 mb-6">
          <h2 className="text-lg font-semibold text-yellow-400 mb-3">
            🏆 Personal Records ({totalPRs})
          </h2>
          <div className="space-y-2">
            {exerciseStats.filter(e => e.isPR).map(e => (
              <div key={e.exerciseId} className="flex justify-between items-center">
                <span className="text-white">{e.exerciseName}</span>
                <span className="text-yellow-400 font-medium">
                  {e.prType === 'reps'
                    ? `${e.bestReps} reps`
                    : `${e.bestE1RM.toFixed(1)} kg e1RM`}
                  {e.previousBest > 0 && (
                    <span className="text-zinc-500 text-sm ml-2">
                      (+{((e.prType === 'reps' ? e.bestReps : e.bestE1RM) - e.previousBest).toFixed(1)})
                    </span>
                  )}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Exercise Details with Graphs */}
      <div className="space-y-4 mb-6">
        <h2 className="text-lg font-semibold text-white">Exercise Performance</h2>
        {exerciseStats.map(e => {
          const isRepsOnly = e.tracking === 'reps_only';
          const label = isRepsOnly ? 'Best Reps' : 'e1RM';

          return (
            <div key={e.exerciseId} className="bg-[#141416] rounded-2xl border border-zinc-800/50 p-4">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="font-medium text-white">{e.exerciseName}</h3>
                  <p className="text-sm text-zinc-500">
                    {e.sets.length} sets • {isRepsOnly
                      ? `Best: ${e.bestReps} reps`
                      : `${e.bestE1RM.toFixed(1)} kg e1RM`}
                  </p>
                </div>
                {e.isPR && (
                  <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded-full">
                    PR!
                  </span>
                )}
              </div>

              {/* Progress Graph */}
              {e.progressData.length > 1 && (
                <div className="h-32 mt-3">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={e.progressData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                      <XAxis
                        dataKey="date"
                        tickFormatter={formatShortDate}
                        fontSize={10}
                        stroke="#52525b"
                        tickLine={false}
                      />
                      <YAxis
                        domain={isRepsOnly ? ['dataMin - 1', 'dataMax + 1'] : ['dataMin - 5', 'dataMax + 5']}
                        fontSize={10}
                        stroke="#52525b"
                        tickLine={false}
                        tickFormatter={(value) => `${Number(value).toFixed(0)}`}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#1c1c1f',
                          border: '1px solid #27272a',
                          borderRadius: '8px',
                          color: '#fafafa',
                          fontSize: '12px',
                        }}
                        labelFormatter={(labelValue) => formatShortDate(labelValue as string)}
                        formatter={(value) => [
                          isRepsOnly
                            ? `${value} reps`
                            : `${(value as number).toFixed(1)} kg`,
                          label,
                        ]}
                      />
                      <Line
                        type="monotone"
                        dataKey="value"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        dot={(props) => {
                          const { cx, cy, payload } = props;
                          if (payload.isCurrentWorkout) {
                            return (
                              <circle
                                cx={cx}
                                cy={cy}
                                r={6}
                                fill={e.isPR ? '#eab308' : '#22c55e'}
                                stroke="white"
                                strokeWidth={2}
                              />
                            );
                          }
                          return (
                            <circle
                              cx={cx}
                              cy={cy}
                              r={3}
                              fill="#3b82f6"
                            />
                          );
                        }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Next Workout Suggestion */}
              {e.suggestedWeight && (
                <div className="mt-3 pt-3 border-t border-zinc-800">
                  <p className="text-sm text-zinc-400">
                    Next workout: <span className="text-blue-400 font-medium">{e.suggestedWeight} kg</span>
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 mb-6">
        <Link
          to={`/edit/${workoutLogId}`}
          className="flex-1 bg-zinc-700 text-white py-3 px-4 rounded-xl font-medium text-center hover:bg-zinc-600 transition-colors"
        >
          Edit Workout
        </Link>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="bg-zinc-800 text-red-400 py-3 px-4 rounded-xl font-medium hover:bg-zinc-700 transition-colors disabled:opacity-50"
        >
          {deleting ? 'Deleting...' : 'Delete'}
        </button>
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-[calc(52px+env(safe-area-inset-bottom))] left-0 right-0 bg-[#0a0a0b]/80 backdrop-blur-lg py-3 px-4">
        <div className="max-w-lg mx-auto flex gap-3">
          <Link
            to="/history"
            className="flex-1 bg-zinc-700 text-white py-3 px-4 rounded-xl font-medium text-center hover:bg-zinc-600 transition-colors"
          >
            View History
          </Link>
          <Link
            to="/"
            className="flex-1 bg-white text-black py-3 px-4 rounded-xl font-medium text-center hover:bg-zinc-200 transition-colors"
          >
            Done
          </Link>
        </div>
      </div>
    </div>
  );
}
