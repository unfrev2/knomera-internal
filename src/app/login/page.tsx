import { LoginForm } from "@/app/login/login-form";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-cream px-4">
      <div className="w-full max-w-sm">
        <header className="mb-8 text-center">
          <img
            src="/logo.png"
            alt="Knomera"
            className="mx-auto h-[4.5rem] w-auto"
          />
          <h1 className="mt-4 text-2xl font-semibold text-navy">
            Assumption Log
          </h1>
          <p className="mt-3 text-sm text-navy/65">Sign in to continue.</p>
        </header>
        <LoginForm />
      </div>
    </div>
  );
}
