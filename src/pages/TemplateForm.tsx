import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import {
  getTemplateById,
  createTemplate,
  updateTemplate,
  getExercises,
} from '../utils/api';

type TrackingType = 'load_reps' | 'reps_only' | 'duration';

interface Exercise {
  id: string;
  name: string;
  default_tracking: TrackingType;
}

interface ItemFormData {
  id: string;
  exerciseId: string;
  targetSets: string;
  targetReps: string;
  targetRir: string;
  tracking: TrackingType;
}

interface TemplateData {
  id: string;
  name: string;
  description?: string;
  items: Array<{
    id: string;
    exercise_id: string;
    target_sets: number;
    target_reps: string;
    target_rir?: number;
    tracking: TrackingType;
  }>;
}

export function TemplateForm() {
  const { templateId } = useParams<{ templateId: string }>();
  const navigate = useNavigate();
  const isEditing = !!templateId;

  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [items, setItems] = useState<ItemFormData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const allExercises = await getExercises() as Exercise[];
        setExercises(allExercises);

        if (templateId) {
          const template = await getTemplateById(templateId) as TemplateData;
          if (template) {
            setName(template.name);
            setDescription(template.description || '');
            setItems(
              template.items.map((item) => ({
                id: item.id,
                exerciseId: item.exercise_id,
                targetSets: item.target_sets.toString(),
                targetReps: item.target_reps,
                targetRir: item.target_rir?.toString() || '',
                tracking: item.tracking,
              }))
            );
          }
        }
      } catch (error) {
        console.error('Failed to load data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [templateId]);

  const addItem = () => {
    if (exercises.length === 0) {
      alert('Please create some exercises first');
      return;
    }

    const defaultExercise = exercises[0];
    setItems([
      ...items,
      {
        id: uuidv4(),
        exerciseId: defaultExercise.id,
        targetSets: '3',
        targetReps: '10',
        targetRir: '',
        tracking: defaultExercise.default_tracking,
      },
    ]);
  };

  const updateItem = (index: number, field: keyof ItemFormData, value: string) => {
    setItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };

      if (field === 'exerciseId') {
        const exercise = exercises.find((e) => e.id === value);
        if (exercise) {
          updated[index].tracking = exercise.default_tracking;
        }
      }

      return updated;
    });
  };

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const moveItem = (index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === items.length - 1)
    ) {
      return;
    }

    setItems((prev) => {
      const updated = [...prev];
      const newIndex = direction === 'up' ? index - 1 : index + 1;
      [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      alert('Please enter a template name');
      return;
    }

    if (items.length === 0) {
      alert('Please add at least one exercise');
      return;
    }

    const templateItems = items.map((item) => ({
      exercise_id: item.exerciseId,
      target_sets: parseInt(item.targetSets, 10) || 1,
      target_reps: item.targetReps || '1',
      target_rir: item.targetRir ? parseInt(item.targetRir, 10) : undefined,
      tracking: item.tracking,
    }));

    try {
      if (isEditing && templateId) {
        await updateTemplate(templateId, {
          name: name.trim(),
          description: description.trim() || undefined,
          items: templateItems,
        });
      } else {
        await createTemplate({
          name: name.trim(),
          description: description.trim() || undefined,
          items: templateItems,
        });
      }

      navigate('/templates');
    } catch (error) {
      console.error('Failed to save template:', error);
      alert('Failed to save template');
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-gray-500">Loading...</div>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        {isEditing ? 'Edit Template' : 'New Template'}
      </h1>

      <form onSubmit={handleSubmit}>
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Template Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Push Day"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description (optional)
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Upper body push focus"
              />
            </div>
          </div>
        </div>

        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Exercises</h2>
          <button
            type="button"
            onClick={addItem}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            + Add Exercise
          </button>
        </div>

        <div className="space-y-4 mb-6">
          {items.map((item, index) => (
            <div
              key={item.id}
              className="bg-white rounded-lg border border-gray-200 p-4"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-gray-500">
                  Exercise {index + 1}
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => moveItem(index, 'up')}
                    disabled={index === 0}
                    className="text-gray-500 hover:text-gray-700 disabled:opacity-30"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => moveItem(index, 'down')}
                    disabled={index === items.length - 1}
                    className="text-gray-500 hover:text-gray-700 disabled:opacity-30"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    onClick={() => removeItem(index)}
                    className="text-red-500 hover:text-red-700"
                  >
                    ×
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Exercise
                  </label>
                  <select
                    value={item.exerciseId}
                    onChange={(e) => updateItem(index, 'exerciseId', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {exercises.map((ex) => (
                      <option key={ex.id} value={ex.id}>
                        {ex.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Sets
                    </label>
                    <input
                      type="number"
                      value={item.targetSets}
                      onChange={(e) => updateItem(index, 'targetSets', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min="1"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Reps
                    </label>
                    <input
                      type="text"
                      value={item.targetReps}
                      onChange={(e) => updateItem(index, 'targetReps', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., 8-12"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      RIR
                    </label>
                    <input
                      type="number"
                      value={item.targetRir}
                      onChange={(e) => updateItem(index, 'targetRir', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min="0"
                      placeholder="opt."
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}

          {items.length === 0 && (
            <div className="text-center py-8 text-gray-500 bg-white rounded-lg border border-gray-200">
              <p>No exercises added yet.</p>
              <button
                type="button"
                onClick={addItem}
                className="text-blue-600 hover:underline mt-2"
              >
                Add your first exercise
              </button>
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700"
          >
            {isEditing ? 'Save Changes' : 'Create Template'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/templates')}
            className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-300"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
