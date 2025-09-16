import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle, Mail } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function SignUpSuccessPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <CheckCircle className="h-16 w-16 text-green-600" />
              </div>
              <CardTitle className="text-2xl">Account Created Successfully!</CardTitle>
              <CardDescription>Please check your email to verify your account</CardDescription>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
                <Mail className="h-4 w-4" />
                <span>Verification email sent</span>
              </div>
              <p className="text-sm text-gray-600">
                You&apos;ve successfully signed up for the BSIT-4C Attendance System. Please check your email and click
                the verification link before signing in.
              </p>
              <Link href="/auth/login">
                <Button className="w-full">Back to Sign In</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
