import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getTemplateById, createWorkoutLog } from '../utils/api';

interface SetInput {
  weight: string;
  reps: string;
}

interface ExerciseInput {
  exerciseId: string;
  exerciseName: string;
  tracking: 'load_reps' | 'reps_only' | 'duration';
  targetSets: number;
  targetReps: string;
  targetRir?: number;
  sets: SetInput[];
}

interface TemplateItem {
  exercise_id: string;
  exercise_name: string;
  target_sets: number;
  target_reps: string;
  target_rir?: number;
  tracking: 'load_reps' | 'reps_only' | 'duration';
}

interface Template {
  id: string;
  name: string;
  items: TemplateItem[];
}

export function LogWorkout() {
  const { templateId } = useParams<{ templateId: string }>();
  const navigate = useNavigate();
  const [template, setTemplate] = useState<Template | null>(null);
  const [exerciseInputs, setExerciseInputs] = useState<ExerciseInput[]>([]);
  const [workoutDate, setWorkoutDate] = useState(new Date().toISOString().split('T')[0]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!templateId) return;

    const loadTemplate = async () => {
      try {
        const tmpl = await getTemplateById(templateId) as Template;
        setTemplate(tmpl);

        const inputs: ExerciseInput[] = tmpl.items.map((item) => {
          const sets: SetInput[] = [];
          for (let i = 0; i < item.target_sets; i++) {
            sets.push({ weight: '', reps: '' });
          }
          return {
            exerciseId: item.exercise_id,
            exerciseName: item.exercise_name,
            tracking: item.tracking,
            targetSets: item.target_sets,
            targetReps: item.target_reps,
            targetRir: item.target_rir,
            sets,
          };
        });

        setExerciseInputs(inputs);
      } catch (error) {
        console.error('Failed to load template:', error);
        navigate('/');
      } finally {
        setLoading(false);
      }
    };

    loadTemplate();
  }, [templateId, navigate]);

  const handleSetChange = (
    exerciseIndex: number,
    setIndex: number,
    field: 'weight' | 'reps',
    value: string
  ) => {
    setExerciseInputs((prev) => {
      const updated = [...prev];
      updated[exerciseIndex] = {
        ...updated[exerciseIndex],
        sets: updated[exerciseIndex].sets.map((set, i) =>
          i === setIndex ? { ...set, [field]: value } : set
        ),
      };
      return updated;
    });
  };

  const addSet = (exerciseIndex: number) => {
    setExerciseInputs((prev) => {
      const updated = [...prev];
      updated[exerciseIndex] = {
        ...updated[exerciseIndex],
        sets: [...updated[exerciseIndex].sets, { weight: '', reps: '' }],
      };
      return updated;
    });
  };

  const removeSet = (exerciseIndex: number, setIndex: number) => {
    setExerciseInputs((prev) => {
      const updated = [...prev];
      if (updated[exerciseIndex].sets.length > 1) {
        updated[exerciseIndex] = {
          ...updated[exerciseIndex],
          sets: updated[exerciseIndex].sets.filter((_, i) => i !== setIndex),
        };
      }
      return updated;
    });
  };

  const handleSave = async () => {
    if (!template) return;

    setSaving(true);

    try {
      const items = exerciseInputs.map((input) => {
        const sets = input.sets
          .map((set, index) => ({
            set_index: index + 1,
            weight: set.weight ? parseFloat(set.weight) : undefined,
            reps: set.reps ? parseInt(set.reps, 10) : undefined,
          }))
          .filter((set) => set.weight !== undefined || set.reps !== undefined);

        return {
          exercise_id: input.exerciseId,
          exercise_name_snapshot: input.exerciseName,
          tracking: input.tracking,
          sets,
        };
      });

      await createWorkoutLog({
        date: workoutDate,
        template_id: template.id,
        template_name_snapshot: template.name,
        items,
      });

      navigate('/history');
    } catch (error) {
      console.error('Failed to save workout:', error);
      alert('Failed to save workout. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8 text-gray-500">Loading template...</div>
    );
  }

  if (!template) {
    return (
      <div className="text-center py-8 text-gray-500">Template not found</div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{template.name}</h1>
          <input
            type="date"
            value={workoutDate}
            onChange={(e) => setWorkoutDate(e.target.value)}
            className="text-sm text-gray-600 border border-gray-300 rounded px-2 py-1 mt-1"
          />
        </div>
        <button
          onClick={() => navigate('/')}
          className="text-gray-500 hover:text-gray-700"
        >
          Cancel
        </button>
      </div>

      <div className="space-y-6">
        {exerciseInputs.map((exercise, exerciseIndex) => (
          <div
            key={exerciseIndex}
            className="bg-white rounded-lg border border-gray-200 p-4"
          >
            <div className="mb-3">
              <h3 className="font-medium text-gray-900">{exercise.exerciseName}</h3>
              <p className="text-sm text-gray-500">
                Target: {exercise.targetSets} x {exercise.targetReps}
                {exercise.targetRir !== undefined && ` @ RIR ${exercise.targetRir}`}
              </p>
            </div>

            <div className="space-y-2">
              <div className="grid grid-cols-12 gap-2 text-xs text-gray-500 font-medium">
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
                  <div className="col-span-2 text-sm text-gray-600 font-medium">
                    {setIndex + 1}
                  </div>
                  {exercise.tracking === 'load_reps' && (
                    <div className="col-span-4">
                      <input
                        type="number"
                        inputMode="decimal"
                        value={set.weight}
                        onChange={(e) =>
                          handleSetChange(exerciseIndex, setIndex, 'weight', e.target.value)
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="0"
                    />
                  </div>
                  <div className="col-span-2">
                    <button
                      onClick={() => removeSet(exerciseIndex, setIndex)}
                      className="text-red-500 hover:text-red-700 text-sm px-2"
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
              className="mt-3 text-sm text-blue-600 hover:text-blue-800"
            >
              + Add Set
            </button>
          </div>
        ))}
      </div>

      <div className="mt-8 sticky bottom-20 bg-gray-50 py-4">
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 disabled:bg-blue-400 transition-colors"
        >
          {saving ? 'Saving...' : 'Save Workout'}
        </button>
      </div>
    </div>
  );
}
