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
  const [sessions, setSessions] = useState<ClassSession[]>([])
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([])
  const [otcCode, setOtcCode] = useState("")
  const [classCode, setClassCode] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isMarkingAttendance, setIsMarkingAttendance] = useState(false)
  const [isJoiningClass, setIsJoiningClass] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setIsLoading(true)
    try {
      const { data: sessionsData } = await supabase
        .from("class_sessions")
        .select(`
          *,
          subjects (name, code)
        `)
        .eq("is_active", true)
        .gte("expires_at", new Date().toISOString())
        .order("session_date", { ascending: true })
        .order("session_time", { ascending: true })

      if (sessionsData) setSessions(sessionsData)

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

  const joinClassByCode = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!classCode.trim()) return

    setIsJoiningClass(true)

    try {
      const { data: subjectData } = await supabase
        .from("subjects")
        .select("id, name, code")
        .eq("code", classCode.toUpperCase())
        .single()

      if (!subjectData) {
        throw new Error("Subject not found with this code")
      }

      const { data: activeSessionsData } = await supabase
        .from("class_sessions")
        .select("*")
        .eq("subject_id", subjectData.id)
        .eq("is_active", true)
        .gte("expires_at", new Date().toISOString())

      if (!activeSessionsData || activeSessionsData.length === 0) {
        throw new Error("No active sessions found for this subject")
      }

      toast({
        title: "Success",
        description: `Joined ${subjectData.name} (${subjectData.code}). You can now mark attendance for active sessions.`,
      })

      setClassCode("")
      fetchData()
    } catch (error) {
      console.error("Error joining class:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to join class",
        variant: "destructive",
      })
    } finally {
      setIsJoiningClass(false)
    }
  }

  const markAttendance = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!otcCode.trim()) return

    setIsMarkingAttendance(true)

    try {
      const { data: sessionData } = await supabase
        .from("class_sessions")
        .select(`
          *,
          subjects (name, code)
        `)
        .eq("otc_code", otcCode.toUpperCase())
        .eq("is_active", true)
        .gte("expires_at", new Date().toISOString())
        .single()

      if (!sessionData) {
        throw new Error("Invalid or expired OTC code")
      }

      const { data: existingAttendance } = await supabase
        .from("attendance")
        .select("id")
        .eq("student_id", user.id)
        .eq("session_id", sessionData.id)
        .single()

      if (existingAttendance) {
        throw new Error("You have already marked attendance for this session")
      }

      const { error } = await supabase.from("attendance").insert({
        student_id: user.id,
        session_id: sessionData.id,
        status: "present",
      })

      if (error) throw error

      toast({
        title: "Success",
        description: `Attendance marked for ${sessionData.subjects.name}`,
      })

      setOtcCode("")
      fetchData()
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

  const attendedSubjects = Array.from(
    new Map(
      attendance.map((record) => [
        record.class_sessions.subjects.code,
        {
          name: record.class_sessions.subjects.name,
          code: record.class_sessions.subjects.code,
        },
      ]),
    ).values(),
  )

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
            <TabsTrigger value="join">Join Class</TabsTrigger>
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

          {/* Join Class Tab */}
          <TabsContent value="join" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Join Class</CardTitle>
                <CardDescription>Enter the subject code to join a class and access its sessions</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={joinClassByCode} className="space-y-4">
                  <div>
                    <Label htmlFor="classCode">Subject Code</Label>
                    <Input
                      id="classCode"
                      value={classCode}
                      onChange={(e) => setClassCode(e.target.value.toUpperCase())}
                      placeholder="Enter subject code (e.g., CS101)"
                      className="text-center text-lg font-mono"
                      required
                    />
                  </div>
                  <Button type="submit" disabled={isJoiningClass} className="w-full">
                    {isJoiningClass ? "Joining..." : "Join Class"}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Attended Subjects */}
            <Card>
              <CardHeader>
                <CardTitle>Attended Subjects</CardTitle>
                <CardDescription>Subjects you have attended based on your attendance history</CardDescription>
              </CardHeader>
              <CardContent>
                {attendedSubjects.length > 0 ? (
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {attendedSubjects.map((subject) => (
                      <div key={subject.code} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-2">
                          <BookOpen className="h-4 w-4 text-blue-600" />
                          <div>
                            <h4 className="font-medium">{subject.name}</h4>
                            <p className="text-sm text-gray-600">{subject.code}</p>
                          </div>
                        </div>
                        <Badge variant="outline">Attended</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No subjects attended yet. Join a class and mark attendance to see subjects here.</p>
                  </div>
                )}
              </CardContent>
            </Card>
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
            <RealtimeSessionStatus subjectIds={[]} userRole="student" />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
