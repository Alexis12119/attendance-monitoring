-- Insert sample teacher (you'll need to sign up with this email first)
-- This is just for reference - actual users will be created through auth signup

-- Insert sample subject for BSIT-4C
INSERT INTO public.subjects (name, code, description, teacher_id) 
VALUES (
  'Advanced Database Systems',
  'CS401',
  'Advanced concepts in database design and management for BSIT-4C',
  '00000000-0000-0000-0000-000000000000' -- Replace with actual teacher UUID after signup
) ON CONFLICT (code) DO NOTHING;

INSERT INTO public.subjects (name, code, description, teacher_id) 
VALUES (
  'Software Engineering',
  'CS402',
  'Software development methodologies and project management for BSIT-4C',
  '00000000-0000-0000-0000-000000000000' -- Replace with actual teacher UUID after signup
) ON CONFLICT (code) DO NOTHING;

INSERT INTO public.subjects (name, code, description, teacher_id) 
VALUES (
  'Web Development',
  'CS403',
  'Modern web development technologies and frameworks for BSIT-4C',
  '00000000-0000-0000-0000-000000000000' -- Replace with actual teacher UUID after signup
) ON CONFLICT (code) DO NOTHING;

-- Note: Students and enrollments will be created through the application interface
