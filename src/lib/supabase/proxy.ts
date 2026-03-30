import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

type SessionUpdateResult = {
  response: NextResponse;
  isAuthenticated: boolean;
};

export async function updateSession(request: NextRequest): Promise<SessionUpdateResult> {
  try {
    let response = NextResponse.next({
      request,
    });

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
            response = NextResponse.next({
              request,
            });
            cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
          },
        },
      },
    );

    const { data } = await supabase.auth.getClaims();
    const claims = data?.claims;

    return {
      response,
      isAuthenticated: typeof claims?.sub === 'string' && claims.sub.length > 0,
    };
  } catch (error) {
    console.error('Supabase updateSession error:', error);

    return {
      response: NextResponse.next({
        request,
      }),
      isAuthenticated: false,
    };
  }
}
