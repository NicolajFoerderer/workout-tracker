# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build Commands

```bash
npm run dev      # Start Vite dev server (port 5173)
npm run build    # TypeScript check + Vite production build
npm run lint     # ESLint
```

## Architecture

**Stack**: React 19 + TypeScript + Vite frontend, Supabase (auth + cloud DB)

### Data Flow
- Frontend uses Supabase client directly for auth and data (`src/utils/api.ts`)
- Auth via Supabase magic link in `AuthContext.tsx`

### Key Directories
```
src/
├── pages/           # Route components (Login, Home, LogWorkout, History, Progress, Exercises, Templates, TemplateForm)
├── contexts/        # AuthContext for Supabase auth state
├── utils/api.ts     # All Supabase data operations
└── components/      # Shared Layout component
```

### Database Schema
- `exercises` - Exercise library with category/equipment/tracking type
- `workout_templates` - Template definitions
- `template_items` - Ordered exercises within templates
- `workout_logs` - Completed workouts with date
- `exercise_logs` - Set data (weight, reps) per exercise

**Snapshot pattern**: Logs store `template_name_snapshot` and `exercise_name_snapshot` to preserve historical data if originals are deleted.

### Routes
```
/login              - Magic link auth
/                   - Home (template list)
/log/:templateId    - Log workout
/history            - Past workouts
/progress           - E1RM progress charts
/exercises          - Exercise CRUD
/templates          - Template list
/templates/new      - Create template
/templates/edit/:id - Edit template
```

## Patterns

### API Layer
Functions in `api.ts` throw on error - callers handle with try-catch:
```typescript
const { data, error } = await supabase.from('table').select()
if (error) throw new Error(error.message)
return data
```

### E1RM Calculation
Progress tracking uses Epley formula: `weight * (1 + reps / 30)`

### UI Theme
Dark mode with consistent colors:
- Background: `#0a0a0b`, Card: `#141416`, Elevated: `#1c1c1f`
- Text: white/zinc-400/zinc-500, Primary: blue-400/500

### Environment Variables
Requires `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env`
