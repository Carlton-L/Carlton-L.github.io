// Port shim for `@/lib/auth/supabase/route`. Sign in is out of the demo: every request carries the
// one demo account, the way a signed-in session would.
import type { NextRequest, NextResponse } from './next-server';

export const DEMO_USER = { id: '00000000-0000-4000-8000-00000000c0de', email: 'carlton@carlton.dev' };

export const supabaseRouteClient = (_request: NextRequest) => ({
  supabase: { auth: { getUser: async () => ({ data: { user: DEMO_USER }, error: null }) } },
  applyCookies: <T extends NextResponse>(response: T): T => response,
});
