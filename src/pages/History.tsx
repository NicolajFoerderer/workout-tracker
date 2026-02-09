import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getWorkoutLogs } from '../utils/api';

interface ExerciseLogItem {
  sets: Array<{ weight?: number; reps?: number }>;
}

interface WorkoutLogItem {
  id: string;
  date: string;
  template_name_snapshot: string;
  items: ExerciseLogItem[];
}

export function History() {
  const [logs, setLogs] = useState<WorkoutLogItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    try {
      setLoading(true);
      const data = await getWorkoutLogs() as WorkoutLogItem[];
      setLogs(data);
    } catch (error) {
      console.error('Failed to load workout logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const getWorkoutStats = (log: WorkoutLogItem) => {
    const exercisesWithData = log.items?.filter(item => {
      const sets = Array.isArray(item.sets) ? item.sets : [];
      return sets.some(s => s.weight !== undefined || s.reps !== undefined);
    }) || [];

    return {
      exerciseCount: exercisesWithData.length,
    };
  };

  if (loading) {
    return <div className="text-center py-8 text-zinc-500">Loading...</div>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">History</h1>

      {logs.length === 0 ? (
        <div className="text-center py-12 text-zinc-500">
          <p className="mb-4">No workouts logged yet.</p>
          <Link to="/" className="text-blue-400 hover:text-blue-300">
            Start your first workout
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {logs.map((log) => {
            const stats = getWorkoutStats(log);

            return (
              <Link
                key={log.id}
                to={`/summary/${log.id}`}
                className="block bg-[#141416] rounded-xl border border-zinc-800/50 p-4 hover:border-zinc-700 transition-colors"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-medium text-white">
                      {log.template_name_snapshot}
                    </h3>
                    <p className="text-sm text-zinc-500 mt-0.5">
                      {formatDate(log.date)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-zinc-500">
                      {stats.exerciseCount} exercise{stats.exerciseCount !== 1 ? 's' : ''}
                    </span>
                    <span className="text-zinc-600">→</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
