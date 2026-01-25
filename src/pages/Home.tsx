import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getTemplates } from '../utils/api';
import { useWorkout } from '../contexts/WorkoutContext';

interface Template {
  id: string;
  name: string;
  description?: string;
  items: unknown[];
}

export function Home() {
  const { draft } = useWorkout();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const data = await getTemplates() as Template[];
      setTemplates(data);
      setError(null);
    } catch (err) {
      setError('Failed to load templates');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8 text-zinc-500">Loading...</div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-400 mb-4">{error}</p>
        <button
          onClick={loadTemplates}
          className="text-blue-400 hover:text-blue-300"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-8">Start Workout</h1>

      <div className="space-y-3">
        {templates.map((template) => {
          const isInProgress = draft?.templateId === template.id;
          return (
            <Link
              key={template.id}
              to={`/log/${template.id}`}
              className={`block bg-[#141416] rounded-2xl border p-5 transition-all ${
                isInProgress
                  ? 'border-blue-500/50 hover:border-blue-400'
                  : 'border-zinc-800/50 hover:border-zinc-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-white text-lg">{template.name}</h3>
                    {isInProgress && (
                      <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full">
                        In Progress
                      </span>
                    )}
                  </div>
                  {template.description && (
                    <p className="text-sm text-zinc-500 mt-1">
                      {template.description}
                    </p>
                  )}
                  <p className="text-sm text-zinc-600 mt-2">
                    {template.items.length} exercises
                  </p>
                </div>
                <span className="text-zinc-600 text-xl">→</span>
              </div>
            </Link>
          );
        })}
      </div>

      {templates.length === 0 && (
        <div className="text-center py-12 text-zinc-500">
          <p className="mb-4">No workout templates yet.</p>
          <Link
            to="/templates/new"
            className="text-blue-400 hover:text-blue-300"
          >
            Create your first template
          </Link>
        </div>
      )}
    </div>
  );
}
