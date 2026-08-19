import { createClient } from '@/utils/supabase/middleware';
import { NextRequest } from 'next/server';

export async function proxy(request: NextRequest) {
  const { response } = createClient(request);
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
