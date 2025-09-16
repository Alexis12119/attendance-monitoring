-- Complete rebuild of RLS policies to eliminate infinite recursion
-- Drop all existing policies first
DROP POLICY IF EXISTS "Teachers can manage their subjects" ON subjects;
DROP POLICY IF EXISTS "Students can view enrolled subjects" ON subjects;
DROP POLICY IF EXISTS "Teachers can manage their class sessions" ON class_sessions;
DROP POLICY IF EXISTS "Students can view sessions for enrolled subjects" ON class_sessions;
DROP POLICY IF EXISTS "Teachers can view enrollments for their subjects" ON enrollments;
DROP POLICY IF EXISTS "Students can view their own enrollments" ON enrollments;
DROP POLICY IF EXISTS "Teachers can view attendance for their sessions" ON attendance;
DROP POLICY IF EXISTS "Students can view their own attendance" ON attendance;
DROP POLICY IF EXISTS "Students can mark their own attendance" ON attendance;

-- Subjects policies - simplified and non-recursive
CREATE POLICY "subjects_teacher_select" ON subjects
    FOR SELECT USING (teacher_id = auth.uid());

CREATE POLICY "subjects_teacher_insert" ON subjects
    FOR INSERT WITH CHECK (teacher_id = auth.uid());

CREATE POLICY "subjects_teacher_update" ON subjects
    FOR UPDATE USING (teacher_id = auth.uid());

CREATE POLICY "subjects_teacher_delete" ON subjects
    FOR DELETE USING (teacher_id = auth.uid());

CREATE POLICY "subjects_student_select" ON subjects
    FOR SELECT USING (
        id IN (
            SELECT subject_id FROM enrollments 
            WHERE student_id = auth.uid()
        )
    );

-- Class sessions policies
CREATE POLICY "sessions_teacher_select" ON class_sessions
    FOR SELECT USING (
        subject_id IN (
            SELECT id FROM subjects WHERE teacher_id = auth.uid()
        )
    );

CREATE POLICY "sessions_teacher_insert" ON class_sessions
    FOR INSERT WITH CHECK (
        subject_id IN (
            SELECT id FROM subjects WHERE teacher_id = auth.uid()
        )
    );

CREATE POLICY "sessions_teacher_update" ON class_sessions
    FOR UPDATE USING (
        subject_id IN (
            SELECT id FROM subjects WHERE teacher_id = auth.uid()
        )
    );

CREATE POLICY "sessions_teacher_delete" ON class_sessions
    FOR DELETE USING (
        subject_id IN (
            SELECT id FROM subjects WHERE teacher_id = auth.uid()
        )
    );

CREATE POLICY "sessions_student_select" ON class_sessions
    FOR SELECT USING (
        subject_id IN (
            SELECT subject_id FROM enrollments 
            WHERE student_id = auth.uid()
        )
    );

-- Enrollments policies
CREATE POLICY "enrollments_teacher_select" ON enrollments
    FOR SELECT USING (
        subject_id IN (
            SELECT id FROM subjects WHERE teacher_id = auth.uid()
        )
    );

CREATE POLICY "enrollments_student_select" ON enrollments
    FOR SELECT USING (student_id = auth.uid());

CREATE POLICY "enrollments_student_insert" ON enrollments
    FOR INSERT WITH CHECK (student_id = auth.uid());

-- Attendance policies
CREATE POLICY "attendance_teacher_select" ON attendance
    FOR SELECT USING (
        session_id IN (
            SELECT cs.id FROM class_sessions cs
            JOIN subjects s ON cs.subject_id = s.id
            WHERE s.teacher_id = auth.uid()
        )
    );

CREATE POLICY "attendance_student_select" ON attendance
    FOR SELECT USING (student_id = auth.uid());

CREATE POLICY "attendance_student_insert" ON attendance
    FOR INSERT WITH CHECK (student_id = auth.uid());

CREATE POLICY "attendance_student_update" ON attendance
    FOR UPDATE USING (student_id = auth.uid());
