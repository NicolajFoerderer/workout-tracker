import { supabase } from './supabase';

// Helper to format date as YYYY-MM-DD
const formatDate = (date: string | Date): string => {
  const d = new Date(date);
  return d.toISOString().split('T')[0];
};

// Exercises
export async function getExercises() {
  const { data, error } = await supabase
    .from('exercises')
    .select('*')
    .order('name');

  if (error) throw new Error(error.message);
  return data;
}

export async function getExerciseById(id: string) {
  const { data, error } = await supabase
    .from('exercises')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function createExercise(exerciseData: {
  name: string;
  category: string;
  equipment: string;
  default_tracking: string;
  aliases?: string[];
}) {
  const { data, error } = await supabase
    .from('exercises')
    .insert(exerciseData)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function updateExercise(id: string, exerciseData: {
  name: string;
  category: string;
  equipment: string;
  default_tracking: string;
  aliases?: string[];
}) {
  const { data, error } = await supabase
    .from('exercises')
    .update(exerciseData)
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function deleteExercise(id: string) {
  const { error } = await supabase
    .from('exercises')
    .delete()
    .eq('id', id);

  if (error) throw new Error(error.message);
  return { message: 'Exercise deleted' };
}

// Templates
export async function getTemplates() {
  const { data: templates, error } = await supabase
    .from('workout_templates')
    .select('*')
    .order('name');

  if (error) throw new Error(error.message);

  // Fetch items for each template
  const templatesWithItems = await Promise.all(
    templates.map(async (template) => {
      const { data: items, error: itemsError } = await supabase
        .from('template_items')
        .select(`
          *,
          exercises (name)
        `)
        .eq('template_id', template.id)
        .order('order_index');

      if (itemsError) throw new Error(itemsError.message);

      return {
        ...template,
        items: items.map(item => ({
          ...item,
          exercise_name: item.exercises?.name
        }))
      };
    })
  );

  return templatesWithItems;
}

export async function getTemplateById(id: string) {
  const { data: template, error } = await supabase
    .from('workout_templates')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw new Error(error.message);

  const { data: items, error: itemsError } = await supabase
    .from('template_items')
    .select(`
      *,
      exercises (name)
    `)
    .eq('template_id', id)
    .order('order_index');

  if (itemsError) throw new Error(itemsError.message);

  return {
    ...template,
    items: items.map(item => ({
      ...item,
      exercise_name: item.exercises?.name
    }))
  };
}

export async function createTemplate(templateData: {
  name: string;
  description?: string;
  items: Array<{
    exercise_id: string;
    target_sets: number;
    target_reps: string;
    target_rir?: number;
    tracking: string;
  }>;
}) {
  const { data: template, error } = await supabase
    .from('workout_templates')
    .insert({ name: templateData.name, description: templateData.description })
    .select()
    .single();

  if (error) throw new Error(error.message);

  if (templateData.items.length > 0) {
    const itemsToInsert = templateData.items.map((item, index) => ({
      template_id: template.id,
      exercise_id: item.exercise_id,
      order_index: index + 1,
      target_sets: item.target_sets,
      target_reps: item.target_reps,
      target_rir: item.target_rir,
      tracking: item.tracking
    }));

    const { error: itemsError } = await supabase
      .from('template_items')
      .insert(itemsToInsert);

    if (itemsError) throw new Error(itemsError.message);
  }

  return getTemplateById(template.id);
}

export async function updateTemplate(id: string, templateData: {
  name: string;
  description?: string;
  items: Array<{
    exercise_id: string;
    target_sets: number;
    target_reps: string;
    target_rir?: number;
    tracking: string;
  }>;
}) {
  const { error } = await supabase
    .from('workout_templates')
    .update({ name: templateData.name, description: templateData.description })
    .eq('id', id);

  if (error) throw new Error(error.message);

  // Delete existing items
  const { error: deleteError } = await supabase
    .from('template_items')
    .delete()
    .eq('template_id', id);

  if (deleteError) throw new Error(deleteError.message);

  // Insert new items
  if (templateData.items.length > 0) {
    const itemsToInsert = templateData.items.map((item, index) => ({
      template_id: id,
      exercise_id: item.exercise_id,
      order_index: index + 1,
      target_sets: item.target_sets,
      target_reps: item.target_reps,
      target_rir: item.target_rir,
      tracking: item.tracking
    }));

    const { error: itemsError } = await supabase
      .from('template_items')
      .insert(itemsToInsert);

    if (itemsError) throw new Error(itemsError.message);
  }

  return getTemplateById(id);
}

export async function deleteTemplate(id: string) {
  const { error } = await supabase
    .from('workout_templates')
    .delete()
    .eq('id', id);

  if (error) throw new Error(error.message);
  return { message: 'Template deleted' };
}

// Workout Logs
export async function getWorkoutLogs() {
  const { data: logs, error } = await supabase
    .from('workout_logs')
    .select('*')
    .order('date', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);

  const logsWithItems = await Promise.all(
    logs.map(async (log) => {
      const { data: items, error: itemsError } = await supabase
        .from('exercise_logs')
        .select('*')
        .eq('workout_log_id', log.id);

      if (itemsError) throw new Error(itemsError.message);

      return {
        ...log,
        date: formatDate(log.date),
        items
      };
    })
  );

  return logsWithItems;
}

export async function getWorkoutLogById(id: string) {
  const { data: log, error } = await supabase
    .from('workout_logs')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw new Error(error.message);

  const { data: items, error: itemsError } = await supabase
    .from('exercise_logs')
    .select('*')
    .eq('workout_log_id', id);

  if (itemsError) throw new Error(itemsError.message);

  return {
    ...log,
    date: formatDate(log.date),
    items
  };
}

export async function getExerciseProgress(exerciseId: string) {
  const { data, error } = await supabase
    .from('exercise_logs')
    .select(`
      sets,
      tracking,
      workout_logs!inner (date)
    `)
    .eq('exercise_id', exerciseId);

  if (error) throw new Error(error.message);

  return data.map(item => {
    const workoutLog = item.workout_logs as unknown as { date: string };
    return {
      date: formatDate(workoutLog.date),
      sets: item.sets,
      tracking: item.tracking
    };
  }).sort((a, b) => a.date.localeCompare(b.date));
}

export async function createWorkoutLog(logData: {
  date: string;
  template_id: string;
  template_name_snapshot: string;
  items: Array<{
    exercise_id: string;
    exercise_name_snapshot: string;
    tracking: string;
    sets: Array<{ set_index: number; weight?: number; reps?: number }>;
    notes?: string;
  }>;
}) {
  const { data: log, error } = await supabase
    .from('workout_logs')
    .insert({
      date: logData.date,
      template_id: logData.template_id,
      template_name_snapshot: logData.template_name_snapshot
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  if (logData.items.length > 0) {
    const itemsToInsert = logData.items.map(item => ({
      workout_log_id: log.id,
      exercise_id: item.exercise_id,
      exercise_name_snapshot: item.exercise_name_snapshot,
      tracking: item.tracking,
      sets: item.sets,
      notes: item.notes
    }));

    const { error: itemsError } = await supabase
      .from('exercise_logs')
      .insert(itemsToInsert);

    if (itemsError) throw new Error(itemsError.message);
  }

  return getWorkoutLogById(log.id);
}

export async function updateWorkoutLog(id: string, data: { date: string }) {
  const { data: log, error } = await supabase
    .from('workout_logs')
    .update({ date: data.date })
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return { ...log, date: formatDate(log.date) };
}

export async function deleteWorkoutLog(id: string) {
  const { error } = await supabase
    .from('workout_logs')
    .delete()
    .eq('id', id);

  if (error) throw new Error(error.message);
  return { message: 'Workout log deleted' };
}
