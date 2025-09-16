-- Create users table for profiles (extends auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('student', 'teacher')),
  student_id TEXT UNIQUE, -- Only for students (e.g., "2021-0001")
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create subjects table
CREATE TABLE IF NOT EXISTS public.subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE, -- e.g., "CS101"
  description TEXT,
  teacher_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create class_sessions table
CREATE TABLE IF NOT EXISTS public.class_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  session_date DATE NOT NULL,
  session_time TIME NOT NULL,
  otc_code TEXT NOT NULL, -- One-time code for attendance
  is_active BOOLEAN DEFAULT TRUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create enrollments table (students enrolled in subjects)
CREATE TABLE IF NOT EXISTS public.enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(student_id, subject_id)
);

-- Create attendance table
CREATE TABLE IF NOT EXISTS public.attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES public.class_sessions(id) ON DELETE CASCADE,
  marked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'present' CHECK (status IN ('present', 'late')),
  UNIQUE(student_id, session_id)
);

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
CREATE POLICY "Users can view their own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- RLS Policies for subjects table
CREATE POLICY "Teachers can manage their subjects" ON public.subjects
  FOR ALL USING (auth.uid() = teacher_id);

CREATE POLICY "Students can view subjects they're enrolled in" ON public.subjects
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.enrollments e 
      WHERE e.subject_id = subjects.id AND e.student_id = auth.uid()
    )
  );

-- RLS Policies for class_sessions table
CREATE POLICY "Teachers can manage sessions for their subjects" ON public.class_sessions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.subjects s 
      WHERE s.id = class_sessions.subject_id AND s.teacher_id = auth.uid()
    )
  );

CREATE POLICY "Students can view sessions for enrolled subjects" ON public.class_sessions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.enrollments e 
      JOIN public.subjects s ON s.id = e.subject_id
      WHERE s.id = class_sessions.subject_id AND e.student_id = auth.uid()
    )
  );

-- RLS Policies for enrollments table
CREATE POLICY "Teachers can view enrollments for their subjects" ON public.enrollments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.subjects s 
      WHERE s.id = enrollments.subject_id AND s.teacher_id = auth.uid()
    )
  );

CREATE POLICY "Students can view their own enrollments" ON public.enrollments
  FOR SELECT USING (auth.uid() = student_id);

CREATE POLICY "Teachers can manage enrollments for their subjects" ON public.enrollments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.subjects s 
      WHERE s.id = enrollments.subject_id AND s.teacher_id = auth.uid()
    )
  );

-- RLS Policies for attendance table
CREATE POLICY "Teachers can view attendance for their subjects" ON public.attendance
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.class_sessions cs
      JOIN public.subjects s ON s.id = cs.subject_id
      WHERE cs.id = attendance.session_id AND s.teacher_id = auth.uid()
    )
  );

CREATE POLICY "Students can view their own attendance" ON public.attendance
  FOR SELECT USING (auth.uid() = student_id);

CREATE POLICY "Students can mark their own attendance" ON public.attendance
  FOR INSERT WITH CHECK (auth.uid() = student_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_subjects_teacher ON public.subjects(teacher_id);
CREATE INDEX IF NOT EXISTS idx_class_sessions_subject ON public.class_sessions(subject_id);
CREATE INDEX IF NOT EXISTS idx_class_sessions_date ON public.class_sessions(session_date);
CREATE INDEX IF NOT EXISTS idx_enrollments_student ON public.enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_subject ON public.enrollments(subject_id);
CREATE INDEX IF NOT EXISTS idx_attendance_student ON public.attendance(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_session ON public.attendance(session_id);
