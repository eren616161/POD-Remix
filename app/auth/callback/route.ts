import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const transfer = searchParams.get('transfer')
  const next = searchParams.get('next') ?? '/designs'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      // If transfer=true, redirect to the transfer page to handle pending project
      if (transfer === 'true') {
        return NextResponse.redirect(`${origin}/auth/transfer`)
      }
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/?error=auth`)
}

