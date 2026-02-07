import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getWorkoutLogs, deleteWorkoutLog, updateWorkoutLog, updateExerciseLog } from '../utils/api';

interface SetData {
  set_index: number;
  weight?: number;
  reps?: number;
}

interface ExerciseLogItem {
  id: string;
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

interface EditingExercise {
  logId: string;
  exerciseId: string;
  sets: SetData[];
}

export function History() {
  const [logs, setLogs] = useState<WorkoutLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingDateId, setEditingDateId] = useState<string | null>(null);
  const [editingExercise, setEditingExercise] = useState<EditingExercise | null>(null);
  const [saving, setSaving] = useState(false);

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

  const startEditingExercise = (logId: string, exercise: ExerciseLogItem) => {
    const sets = exercise.sets.length > 0
      ? exercise.sets.map((s, i) => ({ set_index: s.set_index ?? i + 1, weight: s.weight, reps: s.reps }))
      : [{ set_index: 1, weight: undefined, reps: undefined }];
    setEditingExercise({ logId, exerciseId: exercise.id, sets });
  };

  const updateEditingSet = (setIndex: number, field: 'weight' | 'reps', value: string) => {
    if (!editingExercise) return;
    setEditingExercise({
      ...editingExercise,
      sets: editingExercise.sets.map((set, i) =>
        i === setIndex ? { ...set, [field]: value === '' ? undefined : parseFloat(value) } : set
      ),
    });
  };

  const addEditingSet = () => {
    if (!editingExercise) return;
    setEditingExercise({
      ...editingExercise,
      sets: [...editingExercise.sets, { set_index: editingExercise.sets.length + 1, weight: undefined, reps: undefined }],
    });
  };

  const removeEditingSet = (setIndex: number) => {
    if (!editingExercise || editingExercise.sets.length <= 1) return;
    setEditingExercise({
      ...editingExercise,
      sets: editingExercise.sets
        .filter((_, i) => i !== setIndex)
        .map((set, i) => ({ ...set, set_index: i + 1 })),
    });
  };

  const saveExerciseEdit = async () => {
    if (!editingExercise) return;
    setSaving(true);
    try {
      const setsToSave = editingExercise.sets.filter(s => s.weight !== undefined || s.reps !== undefined);
      await updateExerciseLog(editingExercise.exerciseId, { sets: setsToSave });
      setLogs(logs.map(log => {
        if (log.id !== editingExercise.logId) return log;
        return {
          ...log,
          items: log.items.map(item =>
            item.id === editingExercise.exerciseId ? { ...item, sets: setsToSave } : item
          ),
        };
      }));
      setEditingExercise(null);
    } catch (error) {
      console.error('Failed to update exercise:', error);
      alert('Failed to update exercise');
    } finally {
      setSaving(false);
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
                  <Link
                    to={`/summary/${log.id}`}
                    className="font-semibold text-white hover:text-blue-400 transition-colors"
                  >
                    {log.template_name_snapshot}
                    <span className="text-zinc-600 ml-2">→</span>
                  </Link>
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
                  const isEditing = editingExercise?.exerciseId === item.id;

                  if (isEditing) {
                    return (
                      <div key={index} className="bg-[#1c1c1f] rounded-xl p-3 mt-2">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-zinc-300 font-medium">{item.exercise_name_snapshot}</span>
                          <div className="flex gap-2">
                            <button
                              onClick={() => setEditingExercise(null)}
                              className="text-xs text-zinc-500 hover:text-zinc-300"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={saveExerciseEdit}
                              disabled={saving}
                              className="text-xs text-blue-400 hover:text-blue-300 disabled:opacity-50"
                            >
                              {saving ? 'Saving...' : 'Save'}
                            </button>
                          </div>
                        </div>
                        <div className="space-y-2">
                          {editingExercise.sets.map((set, setIdx) => (
                            <div key={setIdx} className="flex items-center gap-2">
                              <span className="text-xs text-zinc-500 w-6">{setIdx + 1}</span>
                              {item.tracking !== 'reps_only' && (
                                <input
                                  type="number"
                                  inputMode="decimal"
                                  placeholder="kg"
                                  value={set.weight ?? ''}
                                  onChange={(e) => updateEditingSet(setIdx, 'weight', e.target.value)}
                                  className="w-20 px-2 py-1 bg-[#141416] border border-zinc-700 rounded-lg text-white text-sm"
                                />
                              )}
                              <input
                                type="number"
                                inputMode="numeric"
                                placeholder="reps"
                                value={set.reps ?? ''}
                                onChange={(e) => updateEditingSet(setIdx, 'reps', e.target.value)}
                                className="w-20 px-2 py-1 bg-[#141416] border border-zinc-700 rounded-lg text-white text-sm"
                              />
                              <button
                                onClick={() => removeEditingSet(setIdx)}
                                className="text-zinc-600 hover:text-red-400 text-sm disabled:opacity-30"
                                disabled={editingExercise.sets.length <= 1}
                              >
                                ×
                              </button>
                            </div>
                          ))}
                        </div>
                        <button
                          onClick={addEditingSet}
                          className="mt-2 text-xs text-blue-400 hover:text-blue-300"
                        >
                          + Add Set
                        </button>
                      </div>
                    );
                  }

                  if (setsWithData.length === 0) return null;

                  return (
                    <div
                      key={index}
                      className="text-sm cursor-pointer hover:bg-[#1c1c1f] rounded px-2 py-1 -mx-2 transition-colors"
                      onClick={() => startEditingExercise(log.id, item)}
                    >
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
