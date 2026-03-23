import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getTemplates, getLastWorkoutDatePerTemplate } from '../utils/api';
import { useWorkout } from '../contexts/WorkoutContext';
import {
  getActiveTemplateIds,
  setActiveTemplateIds,
  isTemplateActive,
} from '../utils/activeTemplates';

interface Template {
  id: string;
  name: string;
  description?: string;
  items: unknown[];
}

function daysAgo(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(dateStr);
  d.setHours(0, 0, 0, 0);
  return Math.round((today.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
}

function formatDaysAgo(days: number): string {
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  return `${days} days ago`;
}

export function Home() {
  const { draft } = useWorkout();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [lastDates, setLastDates] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeIds, setActiveIds] = useState<Set<string> | null>(null);
  const [manageOpen, setManageOpen] = useState(false);

  useEffect(() => {
    setActiveIds(getActiveTemplateIds());
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const [data, dates] = await Promise.all([
        getTemplates() as Promise<Template[]>,
        getLastWorkoutDatePerTemplate(),
      ]);
      setTemplates(data);
      setLastDates(dates);
      setError(null);
    } catch (err) {
      setError('Failed to load templates');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const toggleTemplate = (templateId: string) => {
    setActiveIds((prev) => {
      // If prev is null, all templates are currently active — initialise from full list
      const base: Set<string> =
        prev === null
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

  // Only active templates shown on the main list
  const visibleTemplates = templates.filter((t) =>
    isTemplateActive(t.id, activeIds)
  );

  // Determine "Next Up": template done least recently (or never), among active only
  const nextUpId = (() => {
    if (visibleTemplates.length === 0) return null;
    let oldest: { id: string; days: number } | null = null;
    for (const t of visibleTemplates) {
      const date = lastDates[t.id];
      const days = date ? daysAgo(date) : 9999;
      if (!oldest || days > oldest.days) {
        oldest = { id: t.id, days };
      }
    }
    return oldest?.id ?? null;
  })();

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
      {/* Header row */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Start Workout</h1>
        <button
          onClick={() => setManageOpen((o) => !o)}
          className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          {manageOpen ? 'Done' : 'Manage'}
        </button>
      </div>

      {/* Management panel */}
      {manageOpen && (
        <div className="mb-6 bg-[#141416] rounded-2xl border border-zinc-800/50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800/50">
            <span className="text-sm font-medium text-zinc-300">
              Manage active workouts
            </span>
            <button
              onClick={() => setManageOpen(false)}
              className="text-zinc-500 hover:text-zinc-300 text-lg leading-none"
            >
              ×
            </button>
          </div>
          <div className="divide-y divide-zinc-800/30">
            {templates.map((template) => {
              const active = isTemplateActive(template.id, activeIds);
              return (
                <div
                  key={template.id}
                  className="flex items-center justify-between px-4 py-3"
                >
                  <span className="text-sm text-white">{template.name}</span>
                  {/* Pill toggle */}
                  <button
                    onClick={() => toggleTemplate(template.id)}
                    className={`relative w-10 h-6 rounded-full transition-colors flex-shrink-0 ${
                      active ? 'bg-blue-500' : 'bg-zinc-700'
                    }`}
                    aria-label={active ? 'Deactivate' : 'Activate'}
                  >
                    <div
                      className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                        active ? 'translate-x-5' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Template list (active only) */}
      <div className="space-y-3">
        {visibleTemplates.map((template) => {
          const isInProgress = draft?.templateId === template.id;
          const isNextUp = template.id === nextUpId && !isInProgress;
          const lastDate = lastDates[template.id];
          const days = lastDate ? daysAgo(lastDate) : null;

          return (
            <Link
              key={template.id}
              to={`/log/${template.id}`}
              className={`block bg-[#141416] rounded-2xl border p-5 transition-all ${
                isInProgress
                  ? 'border-blue-500/50 hover:border-blue-400'
                  : isNextUp
                  ? 'border-green-500/50 hover:border-green-400'
                  : 'border-zinc-800/50 hover:border-zinc-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-white text-lg">{template.name}</h3>
                    {isInProgress && (
                      <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full">
                        In Progress
                      </span>
                    )}
                    {isNextUp && (
                      <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">
                        Next Up 🔥
                      </span>
                    )}
                  </div>
                  {template.description && (
                    <p className="text-sm text-zinc-500 mt-1">
                      {template.description}
                    </p>
                  )}
                  <div className="flex items-center gap-3 mt-2">
                    <p className="text-sm text-zinc-600">
                      {template.items.length} exercises
                    </p>
                    {days !== null && (
                      <p className="text-sm text-zinc-500">
                        Last: {formatDaysAgo(days)}
                      </p>
                    )}
                    {days === null && (
                      <p className="text-sm text-zinc-600 italic">Never done</p>
                    )}
                  </div>
                </div>
                <span className="text-zinc-600 text-xl">→</span>
              </div>
            </Link>
          );
        })}
      </div>

      {visibleTemplates.length === 0 && templates.length > 0 && (
        <div className="text-center py-12 text-zinc-500">
          <p className="mb-2">All templates are hidden.</p>
          <button
            onClick={() => setManageOpen(true)}
            className="text-blue-400 hover:text-blue-300 text-sm"
          >
            Manage active workouts
          </button>
        </div>
      )}

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
