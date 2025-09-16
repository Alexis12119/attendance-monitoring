-- Remove enrollment-based system and simplify to class code entry
-- This script removes the enrollments table and updates RLS policies

-- Drop enrollment-related policies first
DROP POLICY IF EXISTS "Teachers can view enrollments for their subjects" ON public.enrollments;
DROP POLICY IF EXISTS "Students can view their own enrollments" ON public.enrollments;
DROP POLICY IF EXISTS "Teachers can manage enrollments for their subjects" ON public.enrollments;

-- Drop enrollment-dependent policies
DROP POLICY IF EXISTS "Students can view subjects they're enrolled in" ON public.subjects;
DROP POLICY IF EXISTS "Students can view sessions for enrolled subjects" ON public.class_sessions;

-- Drop the enrollments table
DROP TABLE IF EXISTS public.enrollments;

-- Update subjects policies - students can view all subjects (no enrollment needed)
CREATE POLICY "Students can view all subjects" ON public.subjects
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users u 
      WHERE u.id = auth.uid() AND u.role = 'student'
    )
  );

-- Update class_sessions policies - students can view all active sessions
CREATE POLICY "Students can view all active sessions" ON public.class_sessions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users u 
      WHERE u.id = auth.uid() AND u.role = 'student'
    )
  );

-- Add a unique constraint to prevent duplicate OTC codes at the same time
CREATE UNIQUE INDEX IF NOT EXISTS idx_class_sessions_otc_active 
ON public.class_sessions(otc_code) 
WHERE is_active = true;

-- Remove enrollment-related indexes
DROP INDEX IF EXISTS idx_enrollments_student;
DROP INDEX IF EXISTS idx_enrollments_subject;
