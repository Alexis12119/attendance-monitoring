-- Fix infinite recursion in subjects table RLS policies
-- Drop the problematic policies
DROP POLICY IF EXISTS "Teachers can manage their subjects" ON public.subjects;
DROP POLICY IF EXISTS "Students can view subjects they're enrolled in" ON public.subjects;

-- Create separate, specific policies for subjects table
CREATE POLICY "Teachers can view their subjects" ON public.subjects
  FOR SELECT USING (auth.uid() = teacher_id);

CREATE POLICY "Teachers can insert their subjects" ON public.subjects
  FOR INSERT WITH CHECK (auth.uid() = teacher_id);

CREATE POLICY "Teachers can update their subjects" ON public.subjects
  FOR UPDATE USING (auth.uid() = teacher_id);

CREATE POLICY "Teachers can delete their subjects" ON public.subjects
  FOR DELETE USING (auth.uid() = teacher_id);

CREATE POLICY "Students can view enrolled subjects" ON public.subjects
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.enrollments e 
      WHERE e.subject_id = subjects.id AND e.student_id = auth.uid()
    )
  );

-- Also fix similar issues in other tables
DROP POLICY IF EXISTS "Teachers can manage sessions for their subjects" ON public.class_sessions;

CREATE POLICY "Teachers can view sessions for their subjects" ON public.class_sessions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.subjects s 
      WHERE s.id = class_sessions.subject_id AND s.teacher_id = auth.uid()
    )
  );

CREATE POLICY "Teachers can insert sessions for their subjects" ON public.class_sessions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.subjects s 
      WHERE s.id = class_sessions.subject_id AND s.teacher_id = auth.uid()
    )
  );

CREATE POLICY "Teachers can update sessions for their subjects" ON public.class_sessions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.subjects s 
      WHERE s.id = class_sessions.subject_id AND s.teacher_id = auth.uid()
    )
  );

CREATE POLICY "Teachers can delete sessions for their subjects" ON public.class_sessions
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.subjects s 
      WHERE s.id = class_sessions.subject_id AND s.teacher_id = auth.uid()
    )
  );

-- Fix enrollments policies
DROP POLICY IF EXISTS "Teachers can manage enrollments for their subjects" ON public.enrollments;

CREATE POLICY "Teachers can insert enrollments for their subjects" ON public.enrollments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.subjects s 
      WHERE s.id = enrollments.subject_id AND s.teacher_id = auth.uid()
    )
  );

CREATE POLICY "Teachers can update enrollments for their subjects" ON public.enrollments
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.subjects s 
      WHERE s.id = enrollments.subject_id AND s.teacher_id = auth.uid()
    )
  );

CREATE POLICY "Teachers can delete enrollments for their subjects" ON public.enrollments
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.subjects s 
      WHERE s.id = enrollments.subject_id AND s.teacher_id = auth.uid()
    )
  );
