import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getWorkoutLogs, deleteWorkoutLog, updateWorkoutLog } from '../utils/api';

interface SetData {
  weight?: number;
  reps?: number;
}

interface ExerciseLogItem {
  exercise_name_snapshot: string;
  tracking: string;
  sets: SetData[];
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
  const [editingDateId, setEditingDateId] = useState<string | null>(null);

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

  const handleDelete = async (id: string) => {
    if (confirm('Delete this workout log?')) {
      try {
        await deleteWorkoutLog(id);
        await loadLogs();
      } catch (error) {
        console.error('Failed to delete workout log:', error);
        alert('Failed to delete workout log');
      }
    }
  };

  const handleDateChange = async (id: string, newDate: string) => {
    try {
      await updateWorkoutLog(id, { date: newDate });
      setLogs(logs.map(log => log.id === id ? { ...log, date: newDate } : log));
      setEditingDateId(null);
    } catch (error) {
      console.error('Failed to update date:', error);
      alert('Failed to update date');
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
        <div className="space-y-3">
          {logs.map((log) => (
            <div
              key={log.id}
              className="bg-[#141416] rounded-2xl border border-zinc-800/50 p-4"
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-semibold text-white">
                    {log.template_name_snapshot}
                  </h3>
                  {editingDateId === log.id ? (
                    <input
                      type="date"
                      defaultValue={log.date}
                      onBlur={(e) => handleDateChange(log.id, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleDateChange(log.id, (e.target as HTMLInputElement).value);
                        } else if (e.key === 'Escape') {
                          setEditingDateId(null);
                        }
                      }}
                      autoFocus
                      className="text-sm text-zinc-300 bg-[#1c1c1f] border border-zinc-700 rounded-lg px-2 py-1 mt-1"
                    />
                  ) : (
                    <p
                      className="text-sm text-zinc-500 cursor-pointer hover:text-zinc-300 mt-1"
                      onClick={() => setEditingDateId(log.id)}
                    >
                      {formatDate(log.date)}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => handleDelete(log.id)}
                  className="text-zinc-600 hover:text-red-400 text-sm transition-colors"
                >
                  Delete
                </button>
              </div>

              <div className="space-y-1.5">
                {log.items?.map((item, index) => {
                  const sets = Array.isArray(item.sets) ? item.sets : [];
                  const setsWithData = sets.filter(
                    (s) => s.weight !== undefined || s.reps !== undefined
                  );
                  if (setsWithData.length === 0) return null;

                  return (
                    <div key={index} className="text-sm">
                      <span className="text-zinc-300">
                        {item.exercise_name_snapshot}
                      </span>
                      <span className="text-zinc-600 ml-2">
                        {setsWithData.map((set) => {
                          if (item.tracking === 'reps_only') {
                            return `${set.reps}`;
                          }
                          return `${set.weight}×${set.reps}`;
                        }).join(' · ')}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
