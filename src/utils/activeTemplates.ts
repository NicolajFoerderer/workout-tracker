const STORAGE_KEY = 'active_template_ids';

// Returns Set of active template IDs. If key doesn't exist yet (first run),
// ALL templates are considered active (default behaviour).
export function getActiveTemplateIds(): Set<string> | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === null) return null; // null = "all active" (not yet configured)
    return new Set(JSON.parse(stored) as string[]);
  } catch {
    return null;
  }
}

export function setActiveTemplateIds(ids: Set<string>): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
}

export function isTemplateActive(templateId: string, activeIds: Set<string> | null): boolean {
  if (activeIds === null) return true; // default: all active
  return activeIds.has(templateId);
}
