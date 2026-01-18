import { supabase } from './supabase';

interface ExerciseData {
  name: string;
  category: string;
  equipment: string;
  default_tracking: string;
  aliases: string[];
}

const defaultExercises: ExerciseData[] = [
  { name: 'Barbell Bench Press', category: 'compound', equipment: 'barbell', default_tracking: 'load_reps', aliases: ['Bench Press', 'Flat Bench'] },
  { name: 'Standing Overhead Press', category: 'compound', equipment: 'barbell', default_tracking: 'load_reps', aliases: ['OHP', 'Military Press'] },
  { name: 'Cable Lateral Raise', category: 'isolation', equipment: 'cable', default_tracking: 'load_reps', aliases: [] },
  { name: 'Triceps Pushdown', category: 'isolation', equipment: 'cable', default_tracking: 'load_reps', aliases: [] },
  { name: 'Hanging Knee Raise', category: 'core', equipment: 'bodyweight', default_tracking: 'reps_only', aliases: [] },
  { name: 'Cable Woodchopper', category: 'core', equipment: 'cable', default_tracking: 'load_reps', aliases: [] },
  { name: 'Pull-ups', category: 'compound', equipment: 'bodyweight', default_tracking: 'reps_only', aliases: ['Lat Pulldown'] },
  { name: 'Chest Supported Row', category: 'compound', equipment: 'dumbbell', default_tracking: 'load_reps', aliases: [] },
  { name: 'Incline Dumbbell Curl', category: 'isolation', equipment: 'dumbbell', default_tracking: 'load_reps', aliases: [] },
  { name: 'Hammer Curl', category: 'isolation', equipment: 'dumbbell', default_tracking: 'load_reps', aliases: [] },
  { name: 'Cable Crunch', category: 'core', equipment: 'cable', default_tracking: 'load_reps', aliases: [] },
  { name: 'Dumbbell Side Bend', category: 'core', equipment: 'dumbbell', default_tracking: 'load_reps', aliases: [] },
];

const pushTemplate = {
  name: 'Push',
  description: 'Upper body push focus',
  items: [
    { exerciseName: 'Barbell Bench Press', sets: 3, reps: '6', rir: 2, tracking: 'load_reps' },
    { exerciseName: 'Standing Overhead Press', sets: 2, reps: '8', rir: 2, tracking: 'load_reps' },
    { exerciseName: 'Cable Lateral Raise', sets: 4, reps: '15', rir: 0, tracking: 'load_reps' },
    { exerciseName: 'Triceps Pushdown', sets: 3, reps: '10', rir: 0, tracking: 'load_reps' },
    { exerciseName: 'Hanging Knee Raise', sets: 3, reps: '12', rir: 1, tracking: 'reps_only' },
    { exerciseName: 'Cable Woodchopper', sets: 2, reps: '12 / side', rir: 1, tracking: 'load_reps' },
  ],
};

const pullTemplate = {
  name: 'Pull',
  description: 'Upper body pull focus',
  items: [
    { exerciseName: 'Pull-ups', sets: 3, reps: '6', rir: 2, tracking: 'reps_only' },
    { exerciseName: 'Chest Supported Row', sets: 3, reps: '8', rir: 2, tracking: 'load_reps' },
    { exerciseName: 'Incline Dumbbell Curl', sets: 3, reps: '10', rir: 0, tracking: 'load_reps' },
    { exerciseName: 'Hammer Curl', sets: 2, reps: '12', rir: 0, tracking: 'load_reps' },
    { exerciseName: 'Cable Crunch', sets: 3, reps: '12', rir: 1, tracking: 'load_reps' },
    { exerciseName: 'Dumbbell Side Bend', sets: 2, reps: '15 / side', rir: 1, tracking: 'load_reps' },
  ],
};

export async function seedUserData(userId: string): Promise<void> {
  try {
    // Check if user already has exercises
    const { data: existingExercises, error: checkError } = await supabase
      .from('exercises')
      .select('id')
      .eq('user_id', userId)
      .limit(1);

    if (checkError) {
      console.error('Error checking existing exercises:', checkError);
      return;
    }

    if (existingExercises && existingExercises.length > 0) {
      // User already has data, skip seeding
      console.log('User already has data, skipping seed');
      return;
    }

  // Insert exercises
  const exercisesToInsert = defaultExercises.map(ex => ({
    ...ex,
    user_id: userId,
  }));

  const { data: insertedExercises, error: exercisesError } = await supabase
    .from('exercises')
    .insert(exercisesToInsert)
    .select();

  if (exercisesError) {
    console.error('Failed to seed exercises:', exercisesError);
    return;
  }

  // Create a map of exercise name to id
  const exerciseMap = new Map<string, string>();
  insertedExercises?.forEach(ex => {
    exerciseMap.set(ex.name, ex.id);
  });

  // Insert Push template
  const { data: pushTemplateData, error: pushError } = await supabase
    .from('workout_templates')
    .insert({
      name: pushTemplate.name,
      description: pushTemplate.description,
      user_id: userId,
    })
    .select()
    .single();

  if (pushError) {
    console.error('Failed to create Push template:', pushError);
    return;
  }

  const pushItems = pushTemplate.items.map((item, index) => ({
    template_id: pushTemplateData.id,
    exercise_id: exerciseMap.get(item.exerciseName),
    order_index: index + 1,
    target_sets: item.sets,
    target_reps: item.reps,
    target_rir: item.rir,
    tracking: item.tracking,
  }));

  const { error: pushItemsError } = await supabase.from('template_items').insert(pushItems);
  if (pushItemsError) {
    console.error('Failed to insert Push template items:', pushItemsError);
  }

  // Insert Pull template
  const { data: pullTemplateData, error: pullError } = await supabase
    .from('workout_templates')
    .insert({
      name: pullTemplate.name,
      description: pullTemplate.description,
      user_id: userId,
    })
    .select()
    .single();

  if (pullError) {
    console.error('Failed to create Pull template:', pullError);
    return;
  }

  const pullItems = pullTemplate.items.map((item, index) => ({
    template_id: pullTemplateData.id,
    exercise_id: exerciseMap.get(item.exerciseName),
    order_index: index + 1,
    target_sets: item.sets,
    target_reps: item.reps,
    target_rir: item.rir,
    tracking: item.tracking,
  }));

  const { error: pullItemsError } = await supabase.from('template_items').insert(pullItems);
  if (pullItemsError) {
    console.error('Failed to insert Pull template items:', pullItemsError);
  }

  console.log('User data seeded successfully');
  } catch (err) {
    console.error('Error during seeding:', err);
  }
}
