import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const publicExact = new Set([
  '/', '/login', '/register', '/forgot-password', '/reset-password',
  '/update-password', '/obnova-hesla', '/privacy', '/terms', '/about',
  '/contact', '/calendar', '/academy', '/trainer/offers', '/breeds',
  '/articles', '/auth/callback',
])

function isPublicRoute(pathname: string) {
  if (publicExact.has(pathname)) return true
  if (pathname.startsWith('/breeds/') || pathname.startsWith('/articles/') || pathname.startsWith('/dogs/')) return true
  // Public member profiles are readable only when their database visibility policy permits it.
  if (pathname.startsWith('/profile/') && !['/profile/dogs', '/profile/posts', '/profile/saved'].includes(pathname)) return true
  return false
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  if (isPublicRoute(pathname)) return NextResponse.next()

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json({ error: 'Přihlášení není momentálně nakonfigurované.' }, { status: 503 })
  }

  let response = NextResponse.next({ request })
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        response = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
      },
    },
  })

  const { data: { user }, error } = await supabase.auth.getUser()
  if (!user || error) {
    const destination = request.nextUrl.clone()
    destination.pathname = '/login'
    destination.searchParams.set('next', pathname + request.nextUrl.search)
    return NextResponse.redirect(destination)
  }

  return response
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|logo.png|manifest.webmanifest|sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$).*)'],
}
