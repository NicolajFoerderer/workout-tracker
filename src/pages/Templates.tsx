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
    return <div className="text-center py-8 text-gray-500">Loading...</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Templates</h1>
        <button
          onClick={() => navigate('/templates/new')}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          + New
        </button>
      </div>

      {templates.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p className="mb-4">No workout templates yet.</p>
          <Link to="/templates/new" className="text-blue-600 hover:underline">
            Create your first template
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {templates.map((template) => (
            <div
              key={template.id}
              className="bg-white rounded-lg border border-gray-200 p-4"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-medium text-gray-900">{template.name}</h3>
                  {template.description && (
                    <p className="text-sm text-gray-500">{template.description}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => navigate(`/templates/edit/${template.id}`)}
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(template.id)}
                    className="text-red-500 hover:text-red-700 text-sm"
                  >
                    Delete
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                {template.items?.map((item, index) => (
                  <div key={item.id} className="text-sm text-gray-600">
                    <span className="text-gray-400 mr-2">{index + 1}.</span>
                    {item.exercise_name} - {item.target_sets} × {item.target_reps}
                    {item.target_rir !== undefined && item.target_rir !== null && (
                      <span className="text-gray-400"> @ RIR {item.target_rir}</span>
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
