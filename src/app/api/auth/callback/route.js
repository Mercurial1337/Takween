import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getRateLimiter, getClientIp } from '@/lib/rateLimit'

const authLimiter = getRateLimiter('auth-callback', { windowMs: 60_000, maxRequests: 10 })

export async function GET(request) {
  // Rate limit check
  const ip = getClientIp(request)
  const { success } = authLimiter.check(ip)
  if (!success) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429 }
    )
  }

  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth-code-error`)
}
