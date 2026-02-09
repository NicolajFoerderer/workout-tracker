import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getWorkoutLogById, updateWorkoutLog, updateExerciseLog } from '../utils/api';

interface SetInput {
  weight: string;
  reps: string;
}

interface ExerciseInput {
  exerciseLogId: string;
  exerciseName: string;
  tracking: string;
  sets: SetInput[];
}

interface WorkoutLog {
  id: string;
  date: string;
  template_name_snapshot: string;
  items: Array<{
    id: string;
    exercise_name_snapshot: string;
    tracking: string;
    sets: Array<{ weight?: number; reps?: number }>;
  }>;
}

export function EditWorkout() {
  const { workoutLogId } = useParams<{ workoutLogId: string }>();
  const navigate = useNavigate();
  const [workoutName, setWorkoutName] = useState('');
  const [workoutDate, setWorkoutDate] = useState('');
  const [exerciseInputs, setExerciseInputs] = useState<ExerciseInput[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!workoutLogId) return;

    const loadWorkout = async () => {
      try {
        const log = await getWorkoutLogById(workoutLogId) as WorkoutLog;
        setWorkoutName(log.template_name_snapshot);
        setWorkoutDate(log.date);

        const inputs: ExerciseInput[] = log.items.map((item) => {
          const sets = item.sets.length > 0
            ? item.sets.map((s) => ({
                weight: s.weight?.toString() ?? '',
                reps: s.reps?.toString() ?? '',
              }))
            : [{ weight: '', reps: '' }];

          return {
            exerciseLogId: item.id,
            exerciseName: item.exercise_name_snapshot,
            tracking: item.tracking,
            sets,
          };
        });

        setExerciseInputs(inputs);
      } catch (error) {
        console.error('Failed to load workout:', error);
        navigate('/history');
      } finally {
        setLoading(false);
      }
    };

    loadWorkout();
  }, [workoutLogId, navigate]);

  const handleSetChange = (
    exerciseIndex: number,
    setIndex: number,
    field: 'weight' | 'reps',
    value: string
  ) => {
    const updated = [...exerciseInputs];
    updated[exerciseIndex] = {
      ...updated[exerciseIndex],
      sets: updated[exerciseIndex].sets.map((set, i) =>
        i === setIndex ? { ...set, [field]: value } : set
      ),
    };
    setExerciseInputs(updated);
  };

  const addSet = (exerciseIndex: number) => {
    const updated = [...exerciseInputs];
    updated[exerciseIndex] = {
      ...updated[exerciseIndex],
      sets: [...updated[exerciseIndex].sets, { weight: '', reps: '' }],
    };
    setExerciseInputs(updated);
  };

  const removeSet = (exerciseIndex: number, setIndex: number) => {
    const updated = [...exerciseInputs];
    if (updated[exerciseIndex].sets.length > 1) {
      updated[exerciseIndex] = {
        ...updated[exerciseIndex],
        sets: updated[exerciseIndex].sets.filter((_, i) => i !== setIndex),
      };
      setExerciseInputs(updated);
    }
  };

  const handleSave = async () => {
    if (!workoutLogId) return;

    setSaving(true);

    try {
      // Update workout date if changed
      await updateWorkoutLog(workoutLogId, { date: workoutDate });

      // Update each exercise log
      for (const input of exerciseInputs) {
        const sets = input.sets
          .map((set, index) => ({
            set_index: index + 1,
            weight: set.weight ? parseFloat(set.weight) : undefined,
            reps: set.reps ? parseInt(set.reps, 10) : undefined,
          }))
          .filter((set) => set.weight !== undefined || set.reps !== undefined);

        await updateExerciseLog(input.exerciseLogId, { sets });
      }

      navigate(`/summary/${workoutLogId}`);
    } catch (error) {
      console.error('Failed to save workout:', error);
      alert('Failed to save workout. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    navigate(`/summary/${workoutLogId}`);
  };

  if (loading) {
    return (
      <div className="text-center py-8 text-zinc-500">Loading workout...</div>
    );
  }

  return (
    <div className="pb-20">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">{workoutName}</h1>
          <input
            type="date"
            value={workoutDate}
            onChange={(e) => setWorkoutDate(e.target.value)}
            className="text-sm text-zinc-300 bg-[#1c1c1f] border border-zinc-700 rounded-lg px-2 py-1 mt-1"
          />
        </div>
        <button
          onClick={handleCancel}
          className="text-zinc-500 hover:text-white transition-colors"
        >
          Cancel
        </button>
      </div>

      <div className="space-y-4">
        {exerciseInputs.map((exercise, exerciseIndex) => (
          <div
            key={exerciseIndex}
            className="bg-[#141416] rounded-2xl border border-zinc-800/50 p-4"
          >
            <div className="mb-3">
              <h3 className="font-medium text-white">{exercise.exerciseName}</h3>
            </div>

            <div className="space-y-2">
              <div className="grid grid-cols-12 gap-2 text-xs text-zinc-500 font-medium">
                <div className="col-span-2">Set</div>
                {exercise.tracking === 'load_reps' && (
                  <div className="col-span-4">Weight (kg)</div>
                )}
                <div className={exercise.tracking === 'load_reps' ? 'col-span-4' : 'col-span-8'}>
                  Reps
                </div>
                <div className="col-span-2"></div>
              </div>

              {exercise.sets.map((set, setIndex) => (
                <div key={setIndex} className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-2 text-sm text-zinc-400 font-medium">
                    {setIndex + 1}
                  </div>
                  {exercise.tracking === 'load_reps' && (
                    <div className="col-span-4">
                      <input
                        type="text"
                        inputMode="decimal"
                        autoComplete="off"
                        autoCorrect="off"
                        value={set.weight}
                        onChange={(e) =>
                          handleSetChange(exerciseIndex, setIndex, 'weight', e.target.value)
                        }
                        className="w-full px-3 py-2 bg-[#1c1c1f] border border-zinc-800 rounded-xl text-white text-sm focus:outline-none focus:border-zinc-600 transition-colors"
                        placeholder="0"
                      />
                    </div>
                  )}
                  <div className={exercise.tracking === 'load_reps' ? 'col-span-4' : 'col-span-8'}>
                    <input
                      type="number"
                      inputMode="numeric"
                      value={set.reps}
                      onChange={(e) =>
                        handleSetChange(exerciseIndex, setIndex, 'reps', e.target.value)
                      }
                      className="w-full px-3 py-2 bg-[#1c1c1f] border border-zinc-800 rounded-xl text-white text-sm focus:outline-none focus:border-zinc-600 transition-colors"
                      placeholder="0"
                    />
                  </div>
                  <div className="col-span-2">
                    <button
                      onClick={() => removeSet(exerciseIndex, setIndex)}
                      className="text-zinc-600 hover:text-red-400 text-sm px-2 transition-colors disabled:opacity-30"
                      disabled={exercise.sets.length <= 1}
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => addSet(exerciseIndex)}
              className="mt-3 text-sm text-blue-400 hover:text-blue-300 transition-colors"
            >
              + Add Set
            </button>
          </div>
        ))}
      </div>

      <div className="fixed bottom-[calc(52px+env(safe-area-inset-bottom))] left-0 right-0 bg-[#0a0a0b]/80 backdrop-blur-lg py-3 px-4">
        <div className="max-w-lg mx-auto">
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-white text-black py-3 px-4 rounded-xl font-medium hover:bg-zinc-200 disabled:bg-zinc-600 disabled:text-zinc-400 transition-colors"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
