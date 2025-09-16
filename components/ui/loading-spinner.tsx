import type React from "react"
import { cn } from "@/lib/utils"

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg"
  className?: string
}

export function LoadingSpinner({ size = "md", className }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-6 w-6",
    lg: "h-8 w-8",
  }

  return (
    <div
      className={cn(
        "animate-spin rounded-full border-2 border-gray-300 border-t-blue-600",
        sizeClasses[size],
        className,
      )}
    />
  )
}

interface LoadingButtonProps {
  isLoading: boolean
  children: React.ReactNode
  loadingText?: string
  className?: string
  [key: string]: any
}

export function LoadingButton({ isLoading, children, loadingText, className, ...props }: LoadingButtonProps) {
  return (
    <button className={cn("flex items-center justify-center gap-2", className)} disabled={isLoading} {...props}>
      {isLoading && <LoadingSpinner size="sm" />}
      {isLoading ? loadingText || "Loading..." : children}
    </button>
  )
}
