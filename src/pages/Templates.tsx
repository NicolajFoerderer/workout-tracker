import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getTemplates, deleteTemplate } from '../utils/api';

interface TemplateItem {
  id: string;
  exercise_id: string;
  exercise_name: string;
  target_sets: number;
  target_reps: string;
  target_rir?: number;
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
  const navigate = useNavigate();

  useEffect(() => {
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
        <button
          onClick={() => navigate('/templates/new')}
          className="bg-white text-black px-4 py-2 rounded-xl text-sm font-medium hover:bg-zinc-200 transition-colors"
        >
          + New
        </button>
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
                <div>
                  <h3 className="font-medium text-white">{template.name}</h3>
                  {template.description && (
                    <p className="text-sm text-zinc-500">{template.description}</p>
                  )}
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
                    {item.target_rir !== undefined && item.target_rir !== null && (
                      <span className="text-zinc-600"> @ RIR {item.target_rir}</span>
                    )}
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
