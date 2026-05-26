import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

export async function updateSession(request) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  // Skip Supabase session refresh if env vars aren't configured
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return supabaseResponse
  }


  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          if (!cookiesToSet) return
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Protected routes - redirect to login if not authenticated
  const protectedPaths = ['/dashboard', '/profile', '/notifications', '/update-password']
  const adminPaths = ['/admin']
  const authPaths = ['/login', '/register', '/forgot-password']
  const pathname = request.nextUrl.pathname

  // If user is not authenticated and tries to access protected routes
  if (!user && protectedPaths.some(path => pathname.startsWith(path))) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('redirect', pathname)
    return NextResponse.redirect(url)
  }

  // If user is not authenticated and tries to access admin routes
  if (!user && adminPaths.some(path => pathname.startsWith(path))) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // If user is authenticated and tries to access auth pages, redirect to dashboard
  if (user && authPaths.some(path => pathname.startsWith(path))) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  // For admin routes, check if user has admin role
  if (user && adminPaths.some(path => pathname.startsWith(path))) {
    const { data: profileRows } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)

    const profile = profileRows?.[0] || null;

    if (!profile || profile.role !== 'admin') {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}
