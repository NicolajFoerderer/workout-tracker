import { useEffect, useState } from 'react';
import {
  getExercises,
  createExercise,
  updateExercise,
  deleteExercise,
} from '../utils/api';

type ExerciseCategory = 'compound' | 'isolation' | 'core' | 'cardio' | 'other';
type Equipment = 'barbell' | 'dumbbell' | 'cable' | 'machine' | 'bodyweight' | 'other';
type TrackingType = 'load_reps' | 'reps_only' | 'duration';

interface Exercise {
  id: string;
  name: string;
  category: ExerciseCategory;
  equipment: Equipment;
  default_tracking: TrackingType;
}

const categories: ExerciseCategory[] = [
  'compound',
  'isolation',
  'core',
  'cardio',
  'other',
];
const equipmentList: Equipment[] = [
  'barbell',
  'dumbbell',
  'cable',
  'machine',
  'bodyweight',
  'other',
];
const trackingTypes: TrackingType[] = ['load_reps', 'reps_only', 'duration'];

export function Exercises() {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState({
    name: '',
    category: 'compound' as ExerciseCategory,
    equipment: 'barbell' as Equipment,
    default_tracking: 'load_reps' as TrackingType,
  });

  useEffect(() => {
    loadExercises();
  }, []);

  const loadExercises = async () => {
    try {
      setLoading(true);
      const data = await getExercises() as Exercise[];
      setExercises(data);
    } catch (error) {
      console.error('Failed to load exercises:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      category: 'compound',
      equipment: 'barbell',
      default_tracking: 'load_reps',
    });
    setEditingExercise(null);
    setShowForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) return;

    try {
      if (editingExercise) {
        await updateExercise(editingExercise.id, {
          name: formData.name.trim(),
          category: formData.category,
          equipment: formData.equipment,
          default_tracking: formData.default_tracking,
        });
      } else {
        await createExercise({
          name: formData.name.trim(),
          category: formData.category,
          equipment: formData.equipment,
          default_tracking: formData.default_tracking,
        });
      }

      await loadExercises();
      resetForm();
    } catch (error) {
      console.error('Failed to save exercise:', error);
      alert(error instanceof Error ? error.message : 'Failed to save exercise');
    }
  };

  const handleEdit = (exercise: Exercise) => {
    setEditingExercise(exercise);
    setFormData({
      name: exercise.name,
      category: exercise.category,
      equipment: exercise.equipment,
      default_tracking: exercise.default_tracking,
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Delete this exercise? This may affect your progress history.')) {
      try {
        await deleteExercise(id);
        await loadExercises();
      } catch (error) {
        console.error('Failed to delete exercise:', error);
        alert(error instanceof Error ? error.message : 'Failed to delete exercise');
      }
    }
  };

  const filteredExercises = exercises.filter((e) =>
    e.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatLabel = (str: string) =>
    str.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  if (loading) {
    return <div className="text-center py-8 text-zinc-500">Loading...</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Exercises</h1>
        <button
          onClick={() => setShowForm(true)}
          className="bg-white text-black px-4 py-2 rounded-xl text-sm font-medium hover:bg-zinc-200 transition-colors"
        >
          + Add
        </button>
      </div>

      {showForm && (
        <div className="bg-[#141416] rounded-2xl border border-zinc-800/50 p-4 mb-6">
          <h2 className="text-lg font-semibold text-white mb-4">
            {editingExercise ? 'Edit Exercise' : 'New Exercise'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">
                Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="w-full px-3 py-2 bg-[#1c1c1f] border border-zinc-800 rounded-xl text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-600 transition-colors"
                placeholder="e.g., Barbell Squat"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">
                  Category
                </label>
                <select
                  value={formData.category}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      category: e.target.value as ExerciseCategory,
                    })
                  }
                  className="w-full px-3 py-2 bg-[#1c1c1f] border border-zinc-800 rounded-xl text-white focus:outline-none focus:border-zinc-600 transition-colors"
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {formatLabel(cat)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">
                  Equipment
                </label>
                <select
                  value={formData.equipment}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      equipment: e.target.value as Equipment,
                    })
                  }
                  className="w-full px-3 py-2 bg-[#1c1c1f] border border-zinc-800 rounded-xl text-white focus:outline-none focus:border-zinc-600 transition-colors"
                >
                  {equipmentList.map((eq) => (
                    <option key={eq} value={eq}>
                      {formatLabel(eq)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">
                Tracking Type
              </label>
              <select
                value={formData.default_tracking}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    default_tracking: e.target.value as TrackingType,
                  })
                }
                className="w-full px-3 py-2 bg-[#1c1c1f] border border-zinc-800 rounded-xl text-white focus:outline-none focus:border-zinc-600 transition-colors"
              >
                {trackingTypes.map((tt) => (
                  <option key={tt} value={tt}>
                    {formatLabel(tt)}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                className="flex-1 bg-white text-black py-2 rounded-xl font-medium hover:bg-zinc-200 transition-colors"
              >
                {editingExercise ? 'Update' : 'Create'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="flex-1 bg-zinc-800 text-zinc-300 py-2 rounded-xl font-medium hover:bg-zinc-700 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="mb-4">
        <input
          type="text"
          placeholder="Search exercises..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-4 py-3 bg-[#141416] border border-zinc-800 rounded-xl text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-600 transition-colors"
        />
      </div>

      <div className="space-y-3">
        {filteredExercises.map((exercise) => (
          <div
            key={exercise.id}
            className="bg-[#141416] rounded-2xl border border-zinc-800/50 p-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-white">{exercise.name}</h3>
                <p className="text-sm text-zinc-500">
                  {formatLabel(exercise.category)} • {formatLabel(exercise.equipment)} •{' '}
                  {formatLabel(exercise.default_tracking)}
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => handleEdit(exercise)}
                  className="text-zinc-500 hover:text-white text-sm transition-colors"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(exercise.id)}
                  className="text-zinc-600 hover:text-red-400 text-sm transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}

        {filteredExercises.length === 0 && searchQuery && (
          <div className="text-center py-8 text-zinc-500">
            No exercises match your search.
          </div>
        )}
      </div>
    </div>
  );
}
