import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/current-user"
import { LoginForm } from "@/components/login-form"

export default async function LoginPage() {
  const currentUser = await getCurrentUser()

  if (currentUser?.id) {
    redirect("/dashboard/overview")
  }

  return <LoginForm />
}
