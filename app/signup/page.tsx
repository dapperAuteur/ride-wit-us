import SignUpForm from "@/components/auth/sign-up-form"
import MainNav from "@/components/nav/main-nav"

export default function SignUpPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <MainNav />
      <div className="flex-1 flex items-center justify-center p-4">
        <SignUpForm />
      </div>
    </div>
  )
}

