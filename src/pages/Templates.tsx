import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getTemplates, deleteTemplate, createTemplate, getExercises } from '../utils/api';
import { getActiveTemplateIds, setActiveTemplateIds, isTemplateActive } from '../utils/activeTemplates';

interface TemplateItem {
  id: string;
  exercise_id: string;
  exercise_name: string;
  target_sets: number;
  target_reps: string;
}

interface Template {
  id: string;
  name: string;
  description?: string;
  items: TemplateItem[];
}

export function Templates() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [activeIds, setActiveIds] = useState<Set<string> | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    setActiveIds(getActiveTemplateIds());
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await getTemplates() as Template[];
      setTemplates(data);
    } catch (error) {
      console.error('Failed to load templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleTemplate = (templateId: string) => {
    setActiveIds((prev) => {
      const base: Set<string> = prev === null
        ? new Set(templates.map((t) => t.id))
        : new Set(prev);
      if (base.has(templateId)) {
        base.delete(templateId);
      } else {
        base.add(templateId);
      }
      setActiveTemplateIds(base);
      return new Set(base);
    });
  };

  const seedV2Templates = async () => {
    if (!confirm('Create "Push v2" and "Pull v2" templates?')) return;
    setSeeding(true);
    try {
      const { supabase } = await import('../utils/supabase');
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not logged in');

      // Get existing exercises
      const exercises = await getExercises() as Array<{ id: string; name: string }>;
      const byName = (name: string) => exercises.find(e => e.name.toLowerCase() === name.toLowerCase());

      // Create missing exercises
      const newExercises: Array<{ name: string; category: string; equipment: string; default_tracking: string }> = [
        { name: 'Cable Curl', category: 'isolation', equipment: 'cable', default_tracking: 'load_reps' },
        { name: 'Weighted Dips', category: 'compound', equipment: 'bodyweight', default_tracking: 'load_reps' },
        { name: 'Seated Dumbbell Press', category: 'compound', equipment: 'dumbbell', default_tracking: 'load_reps' },
        { name: 'Overhead Triceps Extension', category: 'isolation', equipment: 'dumbbell', default_tracking: 'load_reps' },
      ];
      for (const ex of newExercises) {
        if (!byName(ex.name)) {
          const { error } = await supabase.from('exercises').insert({ ...ex, user_id: user.id, aliases: [] });
          if (error) throw new Error(`Failed to create exercise ${ex.name}: ${error.message}`);
        }
      }

      // Re-fetch exercises after creating new ones
      const allExercises = await getExercises() as Array<{ id: string; name: string }>;
      const getId = (name: string) => {
        const ex = allExercises.find(e => e.name.toLowerCase() === name.toLowerCase());
        if (!ex) throw new Error(`Exercise not found: ${name}`);
        return ex.id;
      };

      // Create Pull v2
      await createTemplate({
        name: 'Pull v2',
        description: 'Arms & back — high bicep volume',
        items: [
          { exercise_id: getId('Pull-ups'), target_sets: 4, target_reps: '6', tracking: 'reps_only' },
          { exercise_id: getId('Chest Supported Row'), target_sets: 3, target_reps: '10', tracking: 'load_reps' },
          { exercise_id: getId('Incline Dumbbell Curl'), target_sets: 4, target_reps: '10', tracking: 'load_reps' },
          { exercise_id: getId('Cable Curl'), target_sets: 3, target_reps: '12', tracking: 'load_reps' },
          { exercise_id: getId('Hammer Curl'), target_sets: 3, target_reps: '12', tracking: 'load_reps' },
          { exercise_id: getId('Cable Crunch'), target_sets: 3, target_reps: '15', tracking: 'load_reps' },
        ],
      });

      // Create Push v2
      await createTemplate({
        name: 'Push v2',
        description: 'Shoulders, triceps & chest',
        items: [
          { exercise_id: getId('Weighted Dips'), target_sets: 3, target_reps: '8', tracking: 'load_reps' },
          { exercise_id: getId('Seated Dumbbell Press'), target_sets: 3, target_reps: '10', tracking: 'load_reps' },
          { exercise_id: getId('Cable Lateral Raise'), target_sets: 4, target_reps: '15', tracking: 'load_reps' },
          { exercise_id: getId('Overhead Triceps Extension'), target_sets: 3, target_reps: '12', tracking: 'load_reps' },
          { exercise_id: getId('Triceps Pushdown'), target_sets: 3, target_reps: '12', tracking: 'load_reps' },
          { exercise_id: getId('Hanging Knee Raise'), target_sets: 3, target_reps: '15', tracking: 'reps_only' },
        ],
      });

      await loadData();
      alert('Push v2 and Pull v2 created! ✅');
    } catch (err) {
      console.error(err);
      alert(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setSeeding(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Delete this workout template?')) {
      try {
        await deleteTemplate(id);
        await loadData();
      } catch (error) {
        console.error('Failed to delete template:', error);
        alert('Failed to delete template');
      }
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-zinc-500">Loading...</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Templates</h1>
        <div className="flex gap-2">
          <button
            onClick={seedV2Templates}
            disabled={seeding}
            className="bg-zinc-700 text-zinc-200 px-3 py-2 rounded-xl text-sm font-medium hover:bg-zinc-600 disabled:opacity-50 transition-colors"
          >
            {seeding ? '...' : '+ v2'}
          </button>
          <button
            onClick={() => navigate('/templates/new')}
            className="bg-white text-black px-4 py-2 rounded-xl text-sm font-medium hover:bg-zinc-200 transition-colors"
          >
            + New
          </button>
        </div>
      </div>

      {templates.length === 0 ? (
        <div className="text-center py-12 text-zinc-500">
          <p className="mb-4">No workout templates yet.</p>
          <Link to="/templates/new" className="text-blue-400 hover:text-blue-300">
            Create your first template
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {templates.map((template) => (
            <div
              key={template.id}
              className="bg-[#141416] rounded-2xl border border-zinc-800/50 p-4"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => toggleTemplate(template.id)}
                    className={`relative w-10 h-6 rounded-full transition-colors flex-shrink-0 ${
                      isTemplateActive(template.id, activeIds) ? 'bg-blue-500' : 'bg-zinc-700'
                    }`}
                    aria-label={isTemplateActive(template.id, activeIds) ? 'Deactivate' : 'Activate'}
                  >
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                      isTemplateActive(template.id, activeIds) ? 'translate-x-5' : 'translate-x-1'
                    }`} />
                  </button>
                  <div>
                    <h3 className={`font-medium ${isTemplateActive(template.id, activeIds) ? 'text-white' : 'text-zinc-500'}`}>{template.name}</h3>
                    {template.description && (
                      <p className="text-sm text-zinc-500">{template.description}</p>
                    )}
                  </div>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => navigate(`/templates/edit/${template.id}`)}
                    className="text-zinc-500 hover:text-white text-sm transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(template.id)}
                    className="text-zinc-600 hover:text-red-400 text-sm transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                {template.items?.map((item, index) => (
                  <div key={item.id} className="text-sm text-zinc-400">
                    <span className="text-zinc-600 mr-2">{index + 1}.</span>
                    {item.exercise_name} - {item.target_sets} × {item.target_reps}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
