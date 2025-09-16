import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { GraduationCap, Users, Clock, CheckCircle } from "lucide-react"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="flex justify-center mb-6">
            <GraduationCap className="h-16 w-16 text-blue-600" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">BSIT-4C Attendance System</h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Modern, secure, and efficient attendance tracking for students and teachers
          </p>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <Card>
            <CardHeader>
              <Users className="h-8 w-8 text-blue-600 mb-2" />
              <CardTitle>Role-Based Access</CardTitle>
              <CardDescription>
                Separate dashboards for students and teachers with appropriate permissions
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <Clock className="h-8 w-8 text-green-600 mb-2" />
              <CardTitle>Real-Time Tracking</CardTitle>
              <CardDescription>Live attendance updates with OTC codes for secure check-ins</CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <CheckCircle className="h-8 w-8 text-purple-600 mb-2" />
              <CardTitle>Easy Management</CardTitle>
              <CardDescription>Simple interface for managing classes, sessions, and attendance records</CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* CTA Section */}
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle className="text-center">Get Started</CardTitle>
            <CardDescription className="text-center">Sign in to access your dashboard</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Link href="/auth/login" className="w-full">
              <Button className="w-full" size="lg">
                Sign In
              </Button>
            </Link>
            <Link href="/auth/sign-up" className="w-full">
              <Button variant="outline" className="w-full bg-transparent" size="lg">
                Create Account
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
