import { redirect } from 'next/navigation'

// The old prototype feed had an unauthenticated write path. Use the secured main feed instead.
export default function LegacyFeedRedirect() {
  redirect('/domu')
}
