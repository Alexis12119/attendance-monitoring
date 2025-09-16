import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import TeacherDashboard from "@/components/teacher-dashboard"
import StudentDashboard from "@/components/student-dashboard"

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    redirect("/auth/login")
  }

  // Get user profile to determine role
  const { data: profile } = await supabase.from("users").select("*").eq("id", user.id).single()

  if (!profile) {
    redirect("/auth/login")
  }

  if (profile.role === "teacher") {
    return <TeacherDashboard user={profile} />
  } else {
    return <StudentDashboard user={profile} />
  }
}
