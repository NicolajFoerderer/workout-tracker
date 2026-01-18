import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getTemplates } from '../utils/api';

interface Template {
  id: string;
  name: string;
  description?: string;
  items: unknown[];
}

export function Home() {
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
      setError('Failed to load templates. Is the backend running?');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8 text-gray-500">Loading...</div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-500 mb-4">{error}</p>
        <button
          onClick={loadTemplates}
          className="text-blue-600 hover:underline"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Workout Tracker</h1>

      <section className="mb-8">
        <h2 className="text-lg font-semibold text-gray-700 mb-3">
          Start a Workout
        </h2>
        <div className="space-y-3">
          {templates.map((template) => (
            <Link
              key={template.id}
              to={`/log/${template.id}`}
              className="block bg-white rounded-lg border border-gray-200 p-4 hover:border-blue-500 hover:shadow-sm transition-all"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-gray-900">{template.name}</h3>
                  {template.description && (
                    <p className="text-sm text-gray-500 mt-1">
                      {template.description}
                    </p>
                  )}
                  <p className="text-sm text-gray-400 mt-1">
                    {template.items.length} exercises
                  </p>
                </div>
                <span className="text-blue-600 text-2xl">→</span>
              </div>
            </Link>
          ))}
        </div>

        {templates.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <p>No workout templates yet.</p>
            <Link
              to="/templates/new"
              className="text-blue-600 hover:underline mt-2 inline-block"
            >
              Create your first template
            </Link>
          </div>
        )}
      </section>

      <section>
        <h2 className="text-lg font-semibold text-gray-700 mb-3">
          Quick Actions
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <Link
            to="/progress"
            className="bg-white rounded-lg border border-gray-200 p-4 text-center hover:border-blue-500 transition-all"
          >
            <span className="text-2xl block mb-2">📈</span>
            <span className="text-sm font-medium text-gray-700">
              View Progress
            </span>
          </Link>
          <Link
            to="/history"
            className="bg-white rounded-lg border border-gray-200 p-4 text-center hover:border-blue-500 transition-all"
          >
            <span className="text-2xl block mb-2">📋</span>
            <span className="text-sm font-medium text-gray-700">
              Workout History
            </span>
          </Link>
        </div>
      </section>
    </div>
  );
}
