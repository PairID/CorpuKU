import { NextResponse } from 'next/server';
import { revokeServerSession, SESSION_COOKIE_NAME } from '@/lib/session';
import { isSameOrigin } from '@/lib/request-security';

const NO_STORE_HEADERS = { 'Cache-Control': 'no-store, max-age=0', Pragma: 'no-cache' };

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: 'Origin tidak diizinkan.' }, { status: 403, headers: NO_STORE_HEADERS });
  }

  const cookieHeader = request.headers.get('cookie') || '';
  const token = cookieHeader
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${SESSION_COOKIE_NAME}=`))
    ?.slice(SESSION_COOKIE_NAME.length + 1);
  if (token) await revokeServerSession(decodeURIComponent(token));

  const response = NextResponse.json({ success: true }, { headers: NO_STORE_HEADERS });
  response.cookies.set(SESSION_COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    expires: new Date(0),
    path: '/',
  });
  return response;
}
