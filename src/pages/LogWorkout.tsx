import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getTemplateById, createWorkoutLog, getLastExerciseSets } from '../utils/api';
import { useWorkout, type ExerciseInput } from '../contexts/WorkoutContext';
import { calculateSuggestedWeight, formatWeight } from '../utils/weightSuggestion';

type Equipment = 'barbell' | 'dumbbell' | 'cable' | 'machine' | 'bodyweight' | 'other';

interface SetInput {
  weight: string;
  reps: string;
}

interface TemplateItem {
  exercise_id: string;
  exercise_name: string;
  exercise_equipment: Equipment;
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
  const { draft, setDraft, updateExerciseInputs, updateWorkoutDate, clearWorkout } = useWorkout();
  const [template, setTemplate] = useState<Template | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showResumePrompt, setShowResumePrompt] = useState(false);
  const initializedForTemplateRef = useRef<string | null>(null);

  // Derive exerciseInputs and workoutDate from draft
  const exerciseInputs = draft?.exerciseInputs ?? [];
  const workoutDate = draft?.workoutDate ?? new Date().toISOString().split('T')[0];

  useEffect(() => {
    if (!templateId) return;

    // Skip if we already initialized for this template
    if (initializedForTemplateRef.current === templateId) {
      return;
    }

    const loadTemplate = async () => {
      try {
        const tmpl = await getTemplateById(templateId) as Template;
        setTemplate(tmpl);

        // Check if there's an existing draft for a different template
        if (draft && draft.templateId !== templateId) {
          setShowResumePrompt(true);
          setLoading(false);
          return;
        }

        // Mark as initialized for this template
        initializedForTemplateRef.current = templateId;

        // If draft exists for this template, use it (no need to update previousSets on every render)
        if (draft && draft.templateId === templateId) {
          setLoading(false);
          return;
        }

        // No draft exists, create fresh inputs
        const exerciseIds = tmpl.items.map(item => item.exercise_id);
        const previousData = await getLastExerciseSets(exerciseIds);

        const inputs: ExerciseInput[] = tmpl.items.map((item) => {
          const previousSets = previousData[item.exercise_id];
          const targetReps = parseInt(item.target_reps, 10) || 0;
          const suggestion = calculateSuggestedWeight(previousSets, targetReps, item.exercise_equipment);
          const suggestedWeight = suggestion ? formatWeight(suggestion.weight) : '';

          const sets: SetInput[] = [];
          for (let i = 0; i < item.target_sets; i++) {
            sets.push({ weight: suggestedWeight, reps: '' });
          }
          return {
            exerciseId: item.exercise_id,
            exerciseName: item.exercise_name,
            equipment: item.exercise_equipment,
            tracking: item.tracking,
            targetSets: item.target_sets,
            targetReps: item.target_reps,
            targetRir: item.target_rir,
            sets,
            previousSets,
          };
        });

        setDraft({
          templateId,
          templateName: tmpl.name,
          workoutDate: new Date().toISOString().split('T')[0],
          exerciseInputs: inputs,
          startedAt: Date.now(),
        });
      } catch (error) {
        console.error('Failed to load template:', error);
        navigate('/');
      } finally {
        setLoading(false);
      }
    };

    loadTemplate();
  }, [templateId, navigate, draft, setDraft]);

  const handleStartFresh = async () => {
    if (!templateId || !template) return;

    setShowResumePrompt(false);
    setLoading(true);
    initializedForTemplateRef.current = templateId;

    try {
      const exerciseIds = template.items.map(item => item.exercise_id);
      const previousData = await getLastExerciseSets(exerciseIds);

      const inputs: ExerciseInput[] = template.items.map((item) => {
        const previousSets = previousData[item.exercise_id];
        const targetReps = parseInt(item.target_reps, 10) || 0;
        const suggestion = calculateSuggestedWeight(previousSets, targetReps, item.exercise_equipment);
        const suggestedWeight = suggestion ? formatWeight(suggestion.weight) : '';

        const sets: SetInput[] = [];
        for (let i = 0; i < item.target_sets; i++) {
          sets.push({ weight: suggestedWeight, reps: '' });
        }
        return {
          exerciseId: item.exercise_id,
          exerciseName: item.exercise_name,
          equipment: item.exercise_equipment,
          tracking: item.tracking,
          targetSets: item.target_sets,
          targetReps: item.target_reps,
          targetRir: item.target_rir,
          sets,
          previousSets,
        };
      });

      setDraft({
        templateId,
        templateName: template.name,
        workoutDate: new Date().toISOString().split('T')[0],
        exerciseInputs: inputs,
        startedAt: Date.now(),
      });
    } catch (error) {
      console.error('Failed to start fresh workout:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleResumePrevious = () => {
    if (!draft) return;
    setShowResumePrompt(false);
    navigate(`/log/${draft.templateId}`);
  };

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
    updateExerciseInputs(updated);
  };

  const addSet = (exerciseIndex: number) => {
    const updated = [...exerciseInputs];
    updated[exerciseIndex] = {
      ...updated[exerciseIndex],
      sets: [...updated[exerciseIndex].sets, { weight: '', reps: '' }],
    };
    updateExerciseInputs(updated);
  };

  const removeSet = (exerciseIndex: number, setIndex: number) => {
    const updated = [...exerciseInputs];
    if (updated[exerciseIndex].sets.length > 1) {
      updated[exerciseIndex] = {
        ...updated[exerciseIndex],
        sets: updated[exerciseIndex].sets.filter((_, i) => i !== setIndex),
      };
      updateExerciseInputs(updated);
    }
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

      clearWorkout();
      navigate('/history');
    } catch (error) {
      console.error('Failed to save workout:', error);
      alert('Failed to save workout. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    clearWorkout();
    navigate('/');
  };

  if (loading) {
    return (
      <div className="text-center py-8 text-zinc-500">Loading template...</div>
    );
  }

  if (!template) {
    return (
      <div className="text-center py-8 text-zinc-500">Template not found</div>
    );
  }

  if (showResumePrompt) {
    return (
      <div className="py-8">
        <div className="bg-[#141416] rounded-2xl border border-zinc-800/50 p-6">
          <h2 className="text-lg font-medium text-white mb-2">Workout in Progress</h2>
          <p className="text-zinc-400 mb-4">
            You have an unfinished workout for <span className="text-white">{draft?.templateName}</span>.
            Would you like to resume it or start a new workout?
          </p>
          <div className="flex gap-3">
            <button
              onClick={handleResumePrevious}
              className="flex-1 bg-blue-500 text-white py-2 px-4 rounded-xl font-medium hover:bg-blue-600 transition-colors"
            >
              Resume Previous
            </button>
            <button
              onClick={handleStartFresh}
              className="flex-1 bg-zinc-700 text-white py-2 px-4 rounded-xl font-medium hover:bg-zinc-600 transition-colors"
            >
              Start Fresh
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-20">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">{template.name}</h1>
          <input
            type="date"
            value={workoutDate}
            onChange={(e) => updateWorkoutDate(e.target.value)}
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
              <p className="text-sm text-zinc-500">
                Target: {exercise.targetSets} x {exercise.targetReps}
                {exercise.targetRir !== undefined && ` @ RIR ${exercise.targetRir}`}
              </p>
              {exercise.previousSets && exercise.previousSets.length > 0 && (
                <p className="text-sm text-zinc-600 mt-1">
                  Last: {exercise.previousSets.map((s) => {
                    if (exercise.tracking === 'reps_only') {
                      return s.reps;
                    }
                    return `${s.weight || 0}×${s.reps || 0}`;
                  }).join(' · ')}
                </p>
              )}
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
          {saving ? 'Saving...' : 'Save Workout'}
        </button>
        </div>
      </div>
    </div>
  );
}
