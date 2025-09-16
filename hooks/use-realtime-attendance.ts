"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import type { RealtimeChannel } from "@supabase/supabase-js"

interface AttendanceRecord {
  id: string
  student_id: string
  session_id: string
  marked_at: string
  status: string
  users: {
    full_name: string
    student_id: string
  }
}

export function useRealtimeAttendance(sessionId: string | null) {
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    if (!sessionId) {
      setAttendance([])
      setIsLoading(false)
      return
    }

    let channel: RealtimeChannel

    const fetchInitialAttendance = async () => {
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
      } finally {
        setIsLoading(false)
      }
    }

    const setupRealtimeSubscription = () => {
      channel = supabase
        .channel(`attendance-${sessionId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "attendance",
            filter: `session_id=eq.${sessionId}`,
          },
          async (payload) => {
            // Fetch the complete record with user details
            const { data } = await supabase
              .from("attendance")
              .select(`
                *,
                users (full_name, student_id)
              `)
              .eq("id", payload.new.id)
              .single()

            if (data) {
              setAttendance((prev) => [data, ...prev])
            }
          },
        )
        .subscribe()
    }

    fetchInitialAttendance()
    setupRealtimeSubscription()

    return () => {
      if (channel) {
        supabase.removeChannel(channel)
      }
    }
  }, [sessionId, supabase])

  return { attendance, isLoading }
}
