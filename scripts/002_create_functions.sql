-- Function to generate random OTC codes
CREATE OR REPLACE FUNCTION generate_otc_code()
RETURNS TEXT AS $$
BEGIN
  RETURN UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 6));
END;
$$ LANGUAGE plpgsql;

-- Function to automatically create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, role, student_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', 'Unknown User'),
    COALESCE(NEW.raw_user_meta_data ->> 'role', 'student'),
    CASE 
      WHEN COALESCE(NEW.raw_user_meta_data ->> 'role', 'student') = 'student' 
      THEN COALESCE(NEW.raw_user_meta_data ->> 'student_id', NULL)
      ELSE NULL
    END
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Create trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Function to check if OTC code is valid and not expired
CREATE OR REPLACE FUNCTION is_valid_otc_code(code TEXT, session_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
  session_record RECORD;
BEGIN
  SELECT * INTO session_record 
  FROM public.class_sessions 
  WHERE id = session_uuid 
    AND otc_code = code 
    AND is_active = TRUE 
    AND expires_at > NOW();
    
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;
