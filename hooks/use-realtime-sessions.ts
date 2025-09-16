"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import type { RealtimeChannel } from "@supabase/supabase-js"

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

export function useRealtimeSessions(subjectIds: string[]) {
  const [sessions, setSessions] = useState<ClassSession[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    if (subjectIds.length === 0) {
      setSessions([])
      setIsLoading(false)
      return
    }

    let channel: RealtimeChannel

    const fetchInitialSessions = async () => {
      try {
        const { data } = await supabase
          .from("class_sessions")
          .select(`
            *,
            subjects (name, code)
          `)
          .in("subject_id", subjectIds)
          .order("session_date", { ascending: false })
          .order("session_time", { ascending: false })

        if (data) setSessions(data)
      } catch (error) {
        console.error("Error fetching sessions:", error)
      } finally {
        setIsLoading(false)
      }
    }

    const setupRealtimeSubscription = () => {
      channel = supabase
        .channel("class-sessions")
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "class_sessions",
          },
          async (payload) => {
            if (subjectIds.includes(payload.new.subject_id)) {
              // Fetch the complete record with subject details
              const { data } = await supabase
                .from("class_sessions")
                .select(`
                  *,
                  subjects (name, code)
                `)
                .eq("id", payload.new.id)
                .single()

              if (data) {
                setSessions((prev) => [data, ...prev])
              }
            }
          },
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "class_sessions",
          },
          async (payload) => {
            if (subjectIds.includes(payload.new.subject_id)) {
              // Fetch the complete record with subject details
              const { data } = await supabase
                .from("class_sessions")
                .select(`
                  *,
                  subjects (name, code)
                `)
                .eq("id", payload.new.id)
                .single()

              if (data) {
                setSessions((prev) => prev.map((session) => (session.id === data.id ? data : session)))
              }
            }
          },
        )
        .subscribe()
    }

    fetchInitialSessions()
    setupRealtimeSubscription()

    return () => {
      if (channel) {
        supabase.removeChannel(channel)
      }
    }
  }, [subjectIds, supabase])

  return { sessions, isLoading }
}
