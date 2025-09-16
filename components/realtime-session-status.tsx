"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useRealtimeSessions } from "@/hooks/use-realtime-sessions"
import { Clock, Copy } from "lucide-react"
import { toast } from "@/hooks/use-toast"

interface RealtimeSessionStatusProps {
  subjectIds: string[]
  userRole: "student" | "teacher"
}

export default function RealtimeSessionStatus({ subjectIds, userRole }: RealtimeSessionStatusProps) {
  const { sessions, isLoading } = useRealtimeSessions(subjectIds)

  const copyOTCCode = (code: string) => {
    navigator.clipboard.writeText(code)
    toast({
      title: "Copied",
      description: "OTC code copied to clipboard",
    })
  }

  const activeSessions = sessions.filter((s) => s.is_active && new Date(s.expires_at) > new Date())

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loading Sessions...</CardTitle>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2">
            Live Session Status
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-xs text-gray-500">Live</span>
            </div>
          </CardTitle>
          <Badge variant="outline">{activeSessions.length} Active</Badge>
        </div>
      </CardHeader>
      <CardContent>
        {activeSessions.length > 0 ? (
          <div className="space-y-3">
            {activeSessions.map((session) => (
              <div key={session.id} className="flex items-center justify-between p-4 border rounded-lg bg-green-50">
                <div>
                  <h4 className="font-medium">
                    {session.subjects.name} ({session.subjects.code})
                  </h4>
                  <p className="text-sm text-gray-600">
                    {new Date(session.session_date).toLocaleDateString()} at {session.session_time}
                  </p>
                  <p className="text-xs text-gray-500">Expires: {new Date(session.expires_at).toLocaleTimeString()}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="default">Active</Badge>
                  {userRole === "teacher" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyOTCCode(session.otc_code)}
                      className="flex items-center gap-1"
                    >
                      <Copy className="h-3 w-3" />
                      {session.otc_code}
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No active sessions</p>
            <p className="text-sm">
              {userRole === "teacher"
                ? "Create a new session to get started"
                : "Wait for your teacher to start a session"}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
