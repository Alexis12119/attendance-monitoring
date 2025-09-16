"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useRealtimeAttendance } from "@/hooks/use-realtime-attendance"
import { Users, RefreshCw } from "lucide-react"
import { useEffect, useState } from "react"

interface RealtimeAttendanceViewerProps {
  sessionId: string | null
  onRefresh?: () => void
}

export default function RealtimeAttendanceViewer({ sessionId, onRefresh }: RealtimeAttendanceViewerProps) {
  const { attendance, isLoading } = useRealtimeAttendance(sessionId)
  const [newAttendanceCount, setNewAttendanceCount] = useState(0)

  useEffect(() => {
    if (attendance.length > 0) {
      // Show notification for new attendance (after initial load)
      const timer = setTimeout(() => {
        if (newAttendanceCount > 0) {
          // You could add a toast notification here
          setNewAttendanceCount(0)
        }
      }, 3000)

      return () => clearTimeout(timer)
    }
  }, [attendance.length, newAttendanceCount])

  if (!sessionId) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <Users className="h-12 w-12 mx-auto mb-4 opacity-50 text-gray-400" />
          <p className="text-gray-500">Select a session to view real-time attendance</p>
        </CardContent>
      </Card>
    )
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4 animate-spin" />
            Loading Attendance...
          </CardTitle>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2">
            Real-time Attendance
            {newAttendanceCount > 0 && (
              <Badge variant="default" className="animate-pulse">
                +{newAttendanceCount} new
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-xs text-gray-500">Live</span>
            </div>
            {onRefresh && (
              <Button onClick={onRefresh} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {attendance.length > 0 ? (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {attendance.map((record, index) => (
              <div
                key={record.id}
                className={`flex items-center justify-between p-3 border rounded-lg transition-all duration-300 ${
                  index === 0 ? "bg-green-50 border-green-200" : ""
                }`}
              >
                <div>
                  <p className="font-medium">{record.users.full_name}</p>
                  <p className="text-sm text-gray-600">ID: {record.users.student_id}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={record.status === "present" ? "default" : "secondary"}>{record.status}</Badge>
                  <span className="text-sm text-gray-500">{new Date(record.marked_at).toLocaleTimeString()}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No attendance records yet</p>
            <p className="text-sm">Students will appear here as they mark attendance</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
