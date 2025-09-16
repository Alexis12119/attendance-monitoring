"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "@/hooks/use-toast"
import { BookOpen, Calendar, Clock, Users, Plus, RefreshCw, LogOut, GraduationCap, Copy } from "lucide-react"
import { useRouter } from "next/navigation"
import RealtimeAttendanceViewer from "./realtime-attendance-viewer"
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
  created_at: string
}

interface ClassSession {
  id: string
  subject_id: string
  session_date: string
  session_time: string
  otc_code: string
  is_active: boolean
  expires_at: string
  subjects: {
    name: string
    code: string
  }
}

export default function TeacherDashboard({ user }: { user: User }) {
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [sessions, setSessions] = useState<ClassSession[]>([])
  const [attendance, setAttendance] = useState<any[]>([])
  const [selectedSession, setSelectedSession] = useState<string>("")
  const [isLoading, setIsLoading] = useState(true)
  const [isCreatingSubject, setIsCreatingSubject] = useState(false)
  const [isCreatingSession, setIsCreatingSession] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  // Form states
  const [subjectForm, setSubjectForm] = useState({
    name: "",
    code: "",
    description: "",
  })
  const [sessionForm, setSessionForm] = useState({
    subject_id: "",
    session_date: "",
    session_time: "",
    duration: "60", // minutes
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setIsLoading(true)
    try {
      // Fetch subjects
      const { data: subjectsData } = await supabase
        .from("subjects")
        .select("*")
        .eq("teacher_id", user.id)
        .order("created_at", { ascending: false })

      if (subjectsData) setSubjects(subjectsData)

      // Fetch sessions
      const { data: sessionsData } = await supabase
        .from("class_sessions")
        .select(`
          *,
          subjects (name, code)
        `)
        .in("subject_id", subjectsData?.map((s) => s.id) || [])
        .order("session_date", { ascending: false })
        .order("session_time", { ascending: false })

      if (sessionsData) setSessions(sessionsData)
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

  const fetchAttendance = async (sessionId: string) => {
    try {
      const { data } = await supabase
        .from("attendance")
        .select(`
          *,
          users (full_name, student_id)
        `)
        .eq("session_id", sessionId)
        .order("marked_at", { ascending: false })

      if (data) setAttendance(data)
    } catch (error) {
      console.error("Error fetching attendance:", error)
    }
  }

  const createSubject = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsCreatingSubject(true)

    console.log("[v0] Starting subject creation with data:", subjectForm)
    console.log("[v0] User ID:", user.id)

    try {
      const { data, error } = await supabase
        .from("subjects")
        .insert({
          name: subjectForm.name,
          code: subjectForm.code,
          description: subjectForm.description,
          teacher_id: user.id,
        })
        .select()

      console.log("[v0] Supabase response - data:", data, "error:", error)

      if (error) throw error

      toast({
        title: "Success",
        description: "Subject created successfully",
      })

      setSubjectForm({ name: "", code: "", description: "" })
      fetchData()
    } catch (error) {
      console.error("[v0] Error creating subject:", error)
      toast({
        title: "Error",
        description: `Failed to create subject: ${error.message}`,
        variant: "destructive",
      })
    } finally {
      setIsCreatingSubject(false)
    }
  }

  const createSession = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsCreatingSession(true)

    try {
      const sessionDateTime = new Date(`${sessionForm.session_date}T${sessionForm.session_time}`)
      const now = new Date()

      if (sessionDateTime <= now) {
        toast({
          title: "Invalid Date/Time",
          description: "Session date and time must be in the future",
          variant: "destructive",
        })
        setIsCreatingSession(false)
        return
      }

      // Generate OTC code
      const otcCode = Math.random().toString(36).substring(2, 8).toUpperCase()

      // Calculate expiration time (session time + duration)
      const expiresAt = new Date(sessionDateTime.getTime() + Number.parseInt(sessionForm.duration) * 60000)

      const { error } = await supabase.from("class_sessions").insert({
        subject_id: sessionForm.subject_id,
        session_date: sessionForm.session_date,
        session_time: sessionForm.session_time,
        otc_code: otcCode,
        expires_at: expiresAt.toISOString(),
      })

      if (error) throw error

      toast({
        title: "Success",
        description: `Class session created with OTC code: ${otcCode}`,
      })

      setSessionForm({ subject_id: "", session_date: "", session_time: "", duration: "60" })
      fetchData()
    } catch (error) {
      console.error("Error creating session:", error)
      toast({
        title: "Error",
        description: "Failed to create class session",
        variant: "destructive",
      })
    } finally {
      setIsCreatingSession(false)
    }
  }

  const toggleSessionStatus = async (sessionId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase.from("class_sessions").update({ is_active: !currentStatus }).eq("id", sessionId)

      if (error) throw error

      toast({
        title: "Success",
        description: `Session ${!currentStatus ? "activated" : "deactivated"}`,
      })

      fetchData()
    } catch (error) {
      console.error("Error updating session:", error)
      toast({
        title: "Error",
        description: "Failed to update session status",
        variant: "destructive",
      })
    }
  }

  const copyOTCCode = (code: string) => {
    navigator.clipboard.writeText(code)
    toast({
      title: "Copied",
      description: "OTC code copied to clipboard",
    })
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
                <h1 className="text-xl font-bold text-gray-900">Teacher Dashboard</h1>
                <p className="text-sm text-gray-600">Welcome back, {user.full_name}</p>
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
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="subjects">Subjects</TabsTrigger>
            <TabsTrigger value="sessions">Sessions</TabsTrigger>
            <TabsTrigger value="attendance">Attendance</TabsTrigger>
            <TabsTrigger value="live">Live View</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid md:grid-cols-3 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Subjects</CardTitle>
                  <BookOpen className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{subjects.length}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Sessions</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{sessions.filter((s) => s.is_active).length}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Sessions</CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{sessions.length}</div>
                </CardContent>
              </Card>
            </div>

            {/* Real-time session status component */}
            <RealtimeSessionStatus subjectIds={subjects.map((s) => s.id)} userRole="teacher" />

            {/* Recent Sessions */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Sessions</CardTitle>
                <CardDescription>Your latest class sessions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {sessions.slice(0, 5).map((session) => (
                    <div key={session.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h4 className="font-medium">
                          {session.subjects.name} ({session.subjects.code})
                        </h4>
                        <p className="text-sm text-gray-600">
                          {new Date(session.session_date).toLocaleDateString()} at {session.session_time}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={session.is_active ? "default" : "secondary"}>
                          {session.is_active ? "Active" : "Inactive"}
                        </Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyOTCCode(session.otc_code)}
                          className="flex items-center gap-1"
                        >
                          <Copy className="h-3 w-3" />
                          {session.otc_code}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Subjects Tab */}
          <TabsContent value="subjects" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Subjects</h2>
              <Dialog>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Subject
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Subject</DialogTitle>
                    <DialogDescription>Add a new subject to your teaching portfolio</DialogDescription>
                  </DialogHeader>
                  <form onSubmit={createSubject} className="space-y-4">
                    <div>
                      <Label htmlFor="name">Subject Name</Label>
                      <Input
                        id="name"
                        value={subjectForm.name}
                        onChange={(e) => setSubjectForm({ ...subjectForm, name: e.target.value })}
                        placeholder="Advanced Database Systems"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="code">Subject Code</Label>
                      <Input
                        id="code"
                        value={subjectForm.code}
                        onChange={(e) => setSubjectForm({ ...subjectForm, code: e.target.value })}
                        placeholder="CS401"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        value={subjectForm.description}
                        onChange={(e) => setSubjectForm({ ...subjectForm, description: e.target.value })}
                        placeholder="Course description..."
                      />
                    </div>
                    <Button type="submit" disabled={isCreatingSubject} className="w-full">
                      {isCreatingSubject ? "Creating..." : "Create Subject"}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

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
                    <p className="text-sm text-gray-600">
                      Created: {new Date(subject.created_at).toLocaleDateString()}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Sessions Tab */}
          <TabsContent value="sessions" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Class Sessions</h2>
              <Dialog>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Session
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create Class Session</DialogTitle>
                    <DialogDescription>Schedule a new class session with OTC code</DialogDescription>
                  </DialogHeader>
                  <form onSubmit={createSession} className="space-y-4">
                    <div>
                      <Label htmlFor="subject">Subject</Label>
                      <Select
                        value={sessionForm.subject_id}
                        onValueChange={(value) => setSessionForm({ ...sessionForm, subject_id: value })}
                        required
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select subject" />
                        </SelectTrigger>
                        <SelectContent>
                          {subjects.map((subject) => (
                            <SelectItem key={subject.id} value={subject.id}>
                              {subject.name} ({subject.code})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="date">Session Date</Label>
                      <Input
                        id="date"
                        type="date"
                        min={new Date().toISOString().split("T")[0]}
                        value={sessionForm.session_date}
                        onChange={(e) => setSessionForm({ ...sessionForm, session_date: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="time">Session Time</Label>
                      <Input
                        id="time"
                        type="time"
                        min={
                          sessionForm.session_date === new Date().toISOString().split("T")[0]
                            ? new Date().toTimeString().slice(0, 5)
                            : undefined
                        }
                        value={sessionForm.session_time}
                        onChange={(e) => setSessionForm({ ...sessionForm, session_time: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="duration">Duration (minutes)</Label>
                      <Select
                        value={sessionForm.duration}
                        onValueChange={(value) => setSessionForm({ ...sessionForm, duration: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="30">30 minutes</SelectItem>
                          <SelectItem value="60">1 hour</SelectItem>
                          <SelectItem value="90">1.5 hours</SelectItem>
                          <SelectItem value="120">2 hours</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button type="submit" disabled={isCreatingSession} className="w-full">
                      {isCreatingSession ? "Creating..." : "Create Session"}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            <div className="space-y-4">
              {sessions.map((session) => (
                <Card key={session.id}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold">
                          {session.subjects.name} ({session.subjects.code})
                        </h3>
                        <p className="text-sm text-gray-600">
                          {new Date(session.session_date).toLocaleDateString()} at {session.session_time}
                        </p>
                        <p className="text-xs text-gray-500">
                          Expires: {new Date(session.expires_at).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={session.is_active ? "default" : "secondary"}>
                          {session.is_active ? "Active" : "Inactive"}
                        </Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyOTCCode(session.otc_code)}
                          className="flex items-center gap-1"
                        >
                          <Copy className="h-3 w-3" />
                          {session.otc_code}
                        </Button>
                        <Button
                          variant={session.is_active ? "destructive" : "default"}
                          size="sm"
                          onClick={() => toggleSessionStatus(session.id, session.is_active)}
                        >
                          {session.is_active ? "Deactivate" : "Activate"}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Attendance Tab */}
          <TabsContent value="attendance" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Attendance Records</h2>
              <Select value={selectedSession} onValueChange={setSelectedSession}>
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="Select session to view attendance" />
                </SelectTrigger>
                <SelectContent>
                  {sessions.map((session) => (
                    <SelectItem key={session.id} value={session.id}>
                      {session.subjects.name} - {new Date(session.session_date).toLocaleDateString()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedSession && (
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle>Attendance Records</CardTitle>
                    <Button onClick={() => fetchAttendance(selectedSession)} variant="outline" size="sm">
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Refresh
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {attendance.length > 0 ? (
                    <div className="space-y-2">
                      {attendance.map((record) => (
                        <div key={record.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <p className="font-medium">{record.users.full_name}</p>
                            <p className="text-sm text-gray-600">ID: {record.users.student_id}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={record.status === "present" ? "default" : "secondary"}>
                              {record.status}
                            </Badge>
                            <span className="text-sm text-gray-500">
                              {new Date(record.marked_at).toLocaleTimeString()}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No attendance records found for this session</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Live View Tab */}
          <TabsContent value="live" className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-6">
              <RealtimeSessionStatus subjectIds={subjects.map((s) => s.id)} userRole="teacher" />

              <Card>
                <CardHeader>
                  <CardTitle>Select Session for Live Attendance</CardTitle>
                </CardHeader>
                <CardContent>
                  <Select value={selectedSession} onValueChange={setSelectedSession}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a session to monitor" />
                    </SelectTrigger>
                    <SelectContent>
                      {sessions.map((session) => (
                        <SelectItem key={session.id} value={session.id}>
                          {session.subjects.name} - {new Date(session.session_date).toLocaleDateString()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>
            </div>

            <RealtimeAttendanceViewer sessionId={selectedSession || null} onRefresh={fetchData} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
