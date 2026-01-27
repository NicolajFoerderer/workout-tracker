import { createContext, useContext, useState, useEffect, useRef, useCallback, type ReactNode } from 'react';

interface SetInput {
  weight: string;
  reps: string;
}

interface PreviousSet {
  weight?: number;
  reps?: number;
}

export interface ExerciseInput {
  exerciseId: string;
  exerciseName: string;
  equipment: 'barbell' | 'dumbbell' | 'cable' | 'machine' | 'bodyweight' | 'other';
  tracking: 'load_reps' | 'reps_only' | 'duration';
  targetSets: number;
  targetReps: string;
  targetRir?: number;
  sets: SetInput[];
  previousSets?: PreviousSet[];
}

interface WorkoutDraft {
  templateId: string;
  templateName: string;
  workoutDate: string;
  exerciseInputs: ExerciseInput[];
  startedAt: number;
}

interface WorkoutContextType {
  draft: WorkoutDraft | null;
  setDraft: (draft: WorkoutDraft | null) => void;
  updateExerciseInputs: (exerciseInputs: ExerciseInput[]) => void;
  updateWorkoutDate: (date: string) => void;
  clearWorkout: () => void;
}

const WorkoutContext = createContext<WorkoutContextType | undefined>(undefined);

const STORAGE_KEY = 'workout_draft';
const DEBOUNCE_MS = 300;

function loadDraftFromStorage(): WorkoutDraft | null {
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored) as WorkoutDraft;
    }
  } catch (e) {
    console.error('Failed to load workout draft from storage:', e);
    sessionStorage.removeItem(STORAGE_KEY);
  }
  return null;
}

export function WorkoutProvider({ children }: { children: ReactNode }) {
  const [draft, setDraftState] = useState<WorkoutDraft | null>(loadDraftFromStorage);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced save to sessionStorage
  const saveToStorage = useCallback((draftToSave: WorkoutDraft | null) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      try {
        if (draftToSave) {
          sessionStorage.setItem(STORAGE_KEY, JSON.stringify(draftToSave));
        } else {
          sessionStorage.removeItem(STORAGE_KEY);
        }
      } catch (e) {
        console.error('Failed to save workout draft to storage:', e);
      }
    }, DEBOUNCE_MS);
  }, []);

  const setDraft = useCallback((newDraft: WorkoutDraft | null) => {
    setDraftState(newDraft);
    saveToStorage(newDraft);
  }, [saveToStorage]);

  const updateExerciseInputs = useCallback((exerciseInputs: ExerciseInput[]) => {
    setDraftState(prev => {
      if (!prev) return prev;
      const updated = { ...prev, exerciseInputs };
      saveToStorage(updated);
      return updated;
    });
  }, [saveToStorage]);

  const updateWorkoutDate = useCallback((date: string) => {
    setDraftState(prev => {
      if (!prev) return prev;
      const updated = { ...prev, workoutDate: date };
      saveToStorage(updated);
      return updated;
    });
  }, [saveToStorage]);

  const clearWorkout = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    setDraftState(null);
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.error('Failed to clear workout draft from storage:', e);
    }
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  return (
    <WorkoutContext.Provider value={{ draft, setDraft, updateExerciseInputs, updateWorkoutDate, clearWorkout }}>
      {children}
    </WorkoutContext.Provider>
  );
}

export function useWorkout() {
  const context = useContext(WorkoutContext);
  if (context === undefined) {
    throw new Error('useWorkout must be used within a WorkoutProvider');
  }
  return context;
}
