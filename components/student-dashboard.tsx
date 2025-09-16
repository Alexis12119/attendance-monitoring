"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "@/hooks/use-toast"
import { BookOpen, Calendar, Clock, CheckCircle, LogOut, GraduationCap, RefreshCw } from "lucide-react"
import { useRouter } from "next/navigation"
import RealtimeSessionStatus from "./realtime-session-status"

interface User {
  id: string
  email: string
  full_name: string
  role: string
  student_id?: string
}

interface Subject {
  id: string
  name: string
  code: string
  description: string
}

interface ClassSession {
  id: string
  subject_id: string
  session_date: string
  session_time: string
  is_active: boolean
  expires_at: string
  subjects: {
    name: string
    code: string
  }
}

interface AttendanceRecord {
  id: string
  session_id: string
  marked_at: string
  status: string
  class_sessions: {
    session_date: string
    session_time: string
    subjects: {
      name: string
      code: string
    }
  }
}

export default function StudentDashboard({ user }: { user: User }) {
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [sessions, setSessions] = useState<ClassSession[]>([])
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([])
  const [otcCode, setOtcCode] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isMarkingAttendance, setIsMarkingAttendance] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setIsLoading(true)
    try {
      // Fetch enrolled subjects
      const { data: enrollmentsData } = await supabase
        .from("enrollments")
        .select(`
          subjects (*)
        `)
        .eq("student_id", user.id)

      if (enrollmentsData) {
        setSubjects(enrollmentsData.map((e) => e.subjects).filter(Boolean))
      }

      // Fetch active sessions for enrolled subjects
      const subjectIds = enrollmentsData?.map((e) => e.subjects?.id).filter(Boolean) || []
      if (subjectIds.length > 0) {
        const { data: sessionsData } = await supabase
          .from("class_sessions")
          .select(`
            *,
            subjects (name, code)
          `)
          .in("subject_id", subjectIds)
          .eq("is_active", true)
          .gte("expires_at", new Date().toISOString())
          .order("session_date", { ascending: true })
          .order("session_time", { ascending: true })

        if (sessionsData) setSessions(sessionsData)
      }

      // Fetch attendance history
      const { data: attendanceData } = await supabase
        .from("attendance")
        .select(`
          *,
          class_sessions (
            session_date,
            session_time,
            subjects (name, code)
          )
        `)
        .eq("student_id", user.id)
        .order("marked_at", { ascending: false })

      if (attendanceData) setAttendance(attendanceData)
    } catch (error) {
      console.error("Error fetching data:", error)
      toast({
        title: "Error",
        description: "Failed to load dashboard data",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const markAttendance = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!otcCode.trim()) return

    setIsMarkingAttendance(true)

    try {
      // Find the session with matching OTC code
      const session = sessions.find((s) => s.otc_code === otcCode.toUpperCase() && s.is_active)

      if (!session) {
        throw new Error("Invalid or expired OTC code")
      }

      // Check if already marked attendance for this session
      const existingAttendance = attendance.find((a) => a.session_id === session.id)
      if (existingAttendance) {
        throw new Error("You have already marked attendance for this session")
      }

      // Mark attendance
      const { error } = await supabase.from("attendance").insert({
        student_id: user.id,
        session_id: session.id,
        status: "present",
      })

      if (error) throw error

      toast({
        title: "Success",
        description: `Attendance marked for ${session.subjects.name}`,
      })

      setOtcCode("")
      fetchData() // Refresh data
    } catch (error) {
      console.error("Error marking attendance:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to mark attendance",
        variant: "destructive",
      })
    } finally {
      setIsMarkingAttendance(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/")
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <GraduationCap className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">Student Dashboard</h1>
                <p className="text-sm text-gray-600">
                  Welcome back, {user.full_name} ({user.student_id})
                </p>
              </div>
            </div>
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <Tabs defaultValue="attendance" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="attendance">Mark Attendance</TabsTrigger>
            <TabsTrigger value="subjects">My Subjects</TabsTrigger>
            <TabsTrigger value="history">Attendance History</TabsTrigger>
            <TabsTrigger value="live">Live Sessions</TabsTrigger>
          </TabsList>

          {/* Mark Attendance Tab */}
          <TabsContent value="attendance" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Mark Attendance</CardTitle>
                <CardDescription>Enter the OTC code provided by your teacher to mark attendance</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={markAttendance} className="space-y-4">
                  <div>
                    <Label htmlFor="otc">OTC Code</Label>
                    <Input
                      id="otc"
                      value={otcCode}
                      onChange={(e) => setOtcCode(e.target.value.toUpperCase())}
                      placeholder="Enter 6-character code"
                      maxLength={6}
                      className="text-center text-lg font-mono"
                      required
                    />
                  </div>
                  <Button type="submit" disabled={isMarkingAttendance} className="w-full">
                    {isMarkingAttendance ? "Marking..." : "Mark Attendance"}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Active Sessions */}
            <Card>
              <CardHeader>
                <CardTitle>Active Sessions</CardTitle>
                <CardDescription>Current class sessions available for attendance</CardDescription>
              </CardHeader>
              <CardContent>
                {sessions.length > 0 ? (
                  <div className="space-y-3">
                    {sessions.map((session) => (
                      <div key={session.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <h4 className="font-medium">
                            {session.subjects.name} ({session.subjects.code})
                          </h4>
                          <p className="text-sm text-gray-600">
                            {new Date(session.session_date).toLocaleDateString()} at {session.session_time}
                          </p>
                          <p className="text-xs text-gray-500">
                            Expires: {new Date(session.expires_at).toLocaleTimeString()}
                          </p>
                        </div>
                        <Badge variant="default">Active</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No active sessions available</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Subjects Tab */}
          <TabsContent value="subjects" className="space-y-6">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {subjects.map((subject) => (
                <Card key={subject.id}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>{subject.name}</span>
                      <Badge variant="outline">{subject.code}</Badge>
                    </CardTitle>
                    <CardDescription>{subject.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <BookOpen className="h-4 w-4" />
                      <span>Enrolled</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {subjects.length === 0 && (
              <Card>
                <CardContent className="text-center py-8">
                  <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50 text-gray-400" />
                  <p className="text-gray-500">You are not enrolled in any subjects yet</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Attendance History</CardTitle>
                <CardDescription>Your attendance records across all subjects</CardDescription>
              </CardHeader>
              <CardContent>
                {attendance.length > 0 ? (
                  <div className="space-y-3">
                    {attendance.map((record) => (
                      <div key={record.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <h4 className="font-medium">
                            {record.class_sessions.subjects.name} ({record.class_sessions.subjects.code})
                          </h4>
                          <p className="text-sm text-gray-600">
                            {new Date(record.class_sessions.session_date).toLocaleDateString()} at{" "}
                            {record.class_sessions.session_time}
                          </p>
                          <p className="text-xs text-gray-500">Marked: {new Date(record.marked_at).toLocaleString()}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <Badge variant="default">{record.status}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No attendance records found</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Live Sessions Tab */}
          <TabsContent value="live" className="space-y-6">
            <RealtimeSessionStatus subjectIds={subjects.map((s) => s.id)} userRole="student" />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
