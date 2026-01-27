import { useEffect, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { getExercises, getExerciseProgress } from '../utils/api';

interface Exercise {
  id: string;
  name: string;
  default_tracking: string;
}

interface SetData {
  weight?: number;
  reps?: number;
}

interface ProgressEntry {
  date: string;
  sets: SetData[];
  tracking: string;
}

interface ProgressDataPoint {
  date: string;
  value: number;
}

interface ExerciseProgress {
  exercise: Exercise;
  data: ProgressDataPoint[];
  personalRecord: ProgressDataPoint | null;
  latestDate: string;
  trackingType: 'load_reps' | 'reps_only';
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

export function Progress() {
  const [exerciseProgressList, setExerciseProgressList] = useState<ExerciseProgress[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAllProgress = async () => {
      try {
        const allExercises = await getExercises() as Exercise[];
        const trackableExercises = allExercises.filter(
          (e) => e.default_tracking === 'load_reps' || e.default_tracking === 'reps_only'
        );

        const progressList: ExerciseProgress[] = [];

        for (const exercise of trackableExercises) {
          const entries = await getExerciseProgress(exercise.id) as ProgressEntry[];
          const isRepsOnly = exercise.default_tracking === 'reps_only';
          const data = isRepsOnly
            ? computeRepsProgress(entries)
            : computeE1RMProgress(entries);

          if (data.length > 0) {
            const personalRecord = data.reduce((max, curr) =>
              curr.value > max.value ? curr : max
            );
            const latestDate = data[data.length - 1].date;

            progressList.push({
              exercise,
              data,
              personalRecord,
              latestDate,
              trackingType: isRepsOnly ? 'reps_only' : 'load_reps',
            });
          }
        }

        progressList.sort((a, b) => b.latestDate.localeCompare(a.latestDate));
        setExerciseProgressList(progressList);
      } catch (error) {
        console.error('Failed to load progress:', error);
      } finally {
        setLoading(false);
      }
    };

    loadAllProgress();
  }, []);

  const filteredProgress = exerciseProgressList.filter((ep) =>
    ep.exercise.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  if (loading) {
    return <div className="text-center py-8 text-zinc-500">Loading...</div>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Progress</h1>

      <div className="mb-6">
        <input
          type="text"
          placeholder="Search exercises..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-4 py-3 bg-[#141416] border border-zinc-800 rounded-xl text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-600 transition-colors"
        />
      </div>

      {filteredProgress.length > 0 ? (
        <div className="space-y-4">
          {filteredProgress.map((ep) => {
            const isRepsOnly = ep.trackingType === 'reps_only';
            const label = isRepsOnly ? 'Best Reps' : 'e1RM';

            return (
              <div key={ep.exercise.id} className="bg-[#141416] rounded-2xl border border-zinc-800/50 p-4">
                <h2 className="text-lg font-semibold text-white mb-1">
                  {ep.exercise.name}
                </h2>

                {ep.personalRecord && (
                  <p className="text-sm text-zinc-500 mb-4">
                    PR: <span className="text-green-400">
                      {isRepsOnly
                        ? `${ep.personalRecord.value} reps`
                        : `${ep.personalRecord.value.toFixed(1)} kg`}
                    </span> {label}
                  </p>
                )}

                <div className="h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={ep.data}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                      <XAxis
                        dataKey="date"
                        tickFormatter={formatDate}
                        fontSize={11}
                        stroke="#52525b"
                        tickLine={false}
                      />
                      <YAxis
                        domain={isRepsOnly ? ['dataMin - 1', 'dataMax + 1'] : ['dataMin - 5', 'dataMax + 5']}
                        fontSize={11}
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
                        }}
                        labelFormatter={(labelValue) => formatDate(labelValue as string)}
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
                        dot={{ fill: '#3b82f6', strokeWidth: 0, r: 3 }}
                        activeDot={{ r: 5, fill: '#3b82f6' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12 text-zinc-500">
          <p>No progress data yet.</p>
          <p className="text-sm mt-2">
            Log some workouts to see your progress.
          </p>
        </div>
      )}
    </div>
  );
}
