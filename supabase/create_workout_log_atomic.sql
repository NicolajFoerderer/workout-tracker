-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor > New Query)
-- This creates an atomic function for saving workouts

CREATE OR REPLACE FUNCTION create_workout_log_atomic(
  p_date DATE,
  p_template_id UUID,
  p_template_name_snapshot TEXT,
  p_user_id UUID,
  p_items JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_workout_log_id UUID;
  v_item JSONB;
BEGIN
  -- Insert workout log
  INSERT INTO workout_logs (date, template_id, template_name_snapshot, user_id)
  VALUES (p_date, p_template_id, p_template_name_snapshot, p_user_id)
  RETURNING id INTO v_workout_log_id;

  -- Insert all exercise logs
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    INSERT INTO exercise_logs (
      workout_log_id,
      exercise_id,
      exercise_name_snapshot,
      tracking,
      sets,
      notes
    )
    VALUES (
      v_workout_log_id,
      (v_item->>'exercise_id')::UUID,
      v_item->>'exercise_name_snapshot',
      v_item->>'tracking',
      v_item->'sets',
      v_item->>'notes'
    );
  END LOOP;

  RETURN v_workout_log_id;
END;
$$;
