-- First, ensure the enrollments table is dropped as it's no longer needed
DROP TABLE IF EXISTS public.enrollments CASCADE;

-- Ensure RLS is enabled on users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can read own data" ON public.users;
DROP POLICY IF EXISTS "Users can update own data" ON public.users;
DROP POLICY IF EXISTS "Enable insert for authentication" ON public.users;

-- Create proper RLS policies for users table
CREATE POLICY "Enable insert for authentication" ON public.users
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can read own data" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own data" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- Ensure the auto-generation function works properly
CREATE OR REPLACE FUNCTION generate_student_id()
RETURNS TEXT AS $$
DECLARE
  current_year TEXT;
  next_number INTEGER;
  student_id TEXT;
BEGIN
  -- Get current year
  current_year := EXTRACT(YEAR FROM NOW())::TEXT;
  
  -- Find the highest number for current year
  SELECT COALESCE(
    MAX(
      CASE 
        WHEN student_id ~ ('^' || current_year || '[0-9]{3}$') 
        THEN SUBSTRING(student_id FROM (LENGTH(current_year) + 1))::INTEGER
        ELSE 0
      END
    ), 0
  ) + 1 INTO next_number
  FROM public.users 
  WHERE role = 'student' AND student_id IS NOT NULL;
  
  -- Format as YYYY### (e.g., 2025001)
  student_id := current_year || LPAD(next_number::TEXT, 3, '0');
  
  RETURN student_id;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger function
CREATE OR REPLACE FUNCTION auto_assign_student_id()
RETURNS TRIGGER AS $$
BEGIN
  -- Only assign student ID for students who don't have one
  IF NEW.role = 'student' AND (NEW.student_id IS NULL OR NEW.student_id = '') THEN
    NEW.student_id := generate_student_id();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
DROP TRIGGER IF EXISTS trigger_auto_assign_student_id ON public.users;
CREATE TRIGGER trigger_auto_assign_student_id
  BEFORE INSERT ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION auto_assign_student_id();
