import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getAuthSession } from "@/app/actions/auth";
import { SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS, sessionCookieOptions } from "@/lib/session";

export async function GET() {
  const session = await getAuthSession();
  if (!session) {
    return NextResponse.json({ user: null }, { status: 200, headers: { "Cache-Control": "no-store, max-age=0", Pragma: "no-cache" } });
  }
  const res = NextResponse.json(
    { user: session.user, expiresAt: session.session.expiresAt },
    { headers: { "Cache-Control": "no-store, max-age=0", Pragma: "no-cache" } },
  );
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (token) {
    res.cookies.set(SESSION_COOKIE_NAME, token, sessionCookieOptions(SESSION_MAX_AGE_SECONDS));
  }
  return res;
}
