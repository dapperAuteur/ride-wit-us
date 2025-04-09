import SignInForm from "@/components/auth/sign-in-form"
import MainNav from "@/components/nav/main-nav"

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <MainNav />
      <div className="flex-1 flex items-center justify-center p-4">
        <SignInForm />
      </div>
    </div>
  )
}
