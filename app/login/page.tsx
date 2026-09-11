import { Suspense } from 'react'
import LoginForm from './login-form'

export default function LoginPage() {
  return (
    <div className="fixed inset-0 z-50 w-screen h-screen overflow-y-auto bg-gradient-to-br from-amber-50 via-indigo-50 to-purple-100 dark:from-gray-950 dark:via-indigo-950/40 dark:to-purple-950/30 text-gray-900 dark:text-gray-100 flex items-center justify-center p-4 sm:p-6">
      <Suspense fallback={<div className="text-center font-bold">Načítání...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  )
}
