-- Fix the handle_new_user function to work with auto-generated student IDs
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert user without student_id, let the auto-generation trigger handle it
  INSERT INTO public.users (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', 'Unknown User'),
    COALESCE(NEW.raw_user_meta_data ->> 'role', 'student')
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Ensure the student ID auto-generation function exists and works correctly
CREATE OR REPLACE FUNCTION generate_student_id()
RETURNS TEXT AS $$
DECLARE
  current_year TEXT;
  next_number INTEGER;
  new_student_id TEXT;
BEGIN
  -- Get current year
  current_year := EXTRACT(YEAR FROM CURRENT_DATE)::TEXT;
  
  -- Find the highest existing student ID for this year
  SELECT COALESCE(
    MAX(CAST(SUBSTRING(student_id FROM 5) AS INTEGER)), 
    0
  ) + 1 INTO next_number
  FROM users 
  WHERE student_id LIKE current_year || '%' 
    AND student_id ~ '^[0-9]{7}$';
  
  -- Generate new student ID with zero-padding
  new_student_id := current_year || LPAD(next_number::TEXT, 3, '0');
  
  RETURN new_student_id;
END;
$$ LANGUAGE plpgsql;

-- Create trigger function for auto-generating student IDs
CREATE OR REPLACE FUNCTION auto_generate_student_id()
RETURNS TRIGGER AS $$
BEGIN
  -- Only generate student ID for students who don't have one
  IF NEW.role = 'student' AND (NEW.student_id IS NULL OR NEW.student_id = '') THEN
    NEW.student_id := generate_student_id();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger for auto-generating student IDs
DROP TRIGGER IF EXISTS trigger_auto_generate_student_id ON users;
CREATE TRIGGER trigger_auto_generate_student_id
  BEFORE INSERT OR UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION auto_generate_student_id();

-- Add some debug logging to help troubleshoot
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Log the attempt for debugging
  RAISE LOG 'Creating user profile for: %', NEW.email;
  RAISE LOG 'User metadata: %', NEW.raw_user_meta_data;
  
  -- Insert user without student_id, let the auto-generation trigger handle it
  INSERT INTO public.users (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', 'Unknown User'),
    COALESCE(NEW.raw_user_meta_data ->> 'role', 'student')
  )
  ON CONFLICT (id) DO NOTHING;
  
  RAISE LOG 'User profile created successfully for: %', NEW.email;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error creating user profile for %: %', NEW.email, SQLERRM;
    RAISE;
END;
$$;
