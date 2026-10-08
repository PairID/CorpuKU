import { NextResponse } from "next/server";
import { getAuthSession } from "@/app/actions/auth";

export async function GET() {
  const session = await getAuthSession();
  if (!session) {
    return NextResponse.json({ user: null }, { status: 200, headers: { "Cache-Control": "no-store, max-age=0", Pragma: "no-cache" } });
  }
  return NextResponse.json(
    { user: session.user, expiresAt: session.session.expiresAt },
    { headers: { "Cache-Control": "no-store, max-age=0", Pragma: "no-cache" } },
  );
}
