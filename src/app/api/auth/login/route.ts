import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/password";
import { createServerSession, SESSION_COOKIE_NAME, sessionCookieOptions } from "@/lib/session";
import { clearRateLimit, consumeRateLimit, getClientIp, isSameOrigin, privacyHash } from "@/lib/request-security";
import { loginSchema, parseJsonBody, readJsonRequest } from "@/lib/validation";

const NO_STORE_HEADERS = { "Cache-Control": "no-store, max-age=0", Pragma: "no-cache" };
const DUMMY_PASSWORD_HASH = "scrypt$16384$8$1$XPMYRqj4q2bjvHthTAxJOA$LyrvKaYdIavg0Uvh-STxX7v6_tI7O1_sk7bY5st1Hw7WLFSDf76imYrkOnaPv_GvLbNtJE2bCB-SZCBGE9Yg-g";

export async function POST(request: NextRequest) {
    try {
        if (!isSameOrigin(request)) {
            return NextResponse.json({ error: "Permintaan tidak diizinkan." }, { status: 403, headers: NO_STORE_HEADERS });
        }

        const input = parseJsonBody(loginSchema, await readJsonRequest(request));
        if (!input) {
            return NextResponse.json({ error: "Data login tidak valid." }, { status: 400, headers: NO_STORE_HEADERS });
        }
        const { username, password } = input;
        const normalizedUsername = username.toLowerCase();
        const rateIdentifier = `${getClientIp(request)}:${normalizedUsername}`;
        const rateLimit = await consumeRateLimit({
            scope: "login",
            identifier: rateIdentifier,
            limit: 5,
            windowSeconds: 15 * 60,
            blockSeconds: 15 * 60,
        });
        if (!rateLimit.allowed) {
            return NextResponse.json(
                { error: "Terlalu banyak percobaan. Silakan coba lagi nanti." },
                { status: 429, headers: { ...NO_STORE_HEADERS, "Retry-After": String(rateLimit.retryAfterSeconds) } },
            );
        }

        const userRes = await sql`
            SELECT id, name, email, nip, username, password, role
            FROM users
            WHERE LOWER(username) = ${normalizedUsername}
               OR LOWER(nip) = ${normalizedUsername}
               OR LOWER(email) = ${normalizedUsername}
            LIMIT 1
        `;
        const user = userRes[0];
        const verification = await verifyPassword(
            password,
            user ? String(user.password || "") : DUMMY_PASSWORD_HASH,
        );
        const role = user ? String(user.role) : "";
        if (!user || !verification.valid || !["student", "instructor", "admin"].includes(role)) {
            return NextResponse.json(
                { error: "NIP/username atau password tidak valid." },
                { status: 401, headers: NO_STORE_HEADERS }
            );
        }

        if (verification.needsRehash) {
            await sql`UPDATE users SET password = ${await hashPassword(password)} WHERE id = ${user.id}`;
        }
        await clearRateLimit("login", rateIdentifier);

        const sessionRecord = await createServerSession(String(user.id), {
            ipHash: privacyHash(getClientIp(request)),
            userAgent: request.headers.get("user-agent"),
        });
        const sessionData = {
            id: String(user.id),
            name: String(user.name),
            email: String(user.email),
            nip: user.nip ? String(user.nip) : undefined,
            username: user.username ? String(user.username) : undefined,
            role,
        };

        const response = NextResponse.json({
            user: sessionData,
            expiresAt: sessionRecord.expiresAt.toISOString(),
        }, { headers: NO_STORE_HEADERS });

        response.cookies.set(SESSION_COOKIE_NAME, sessionRecord.token, sessionCookieOptions());

        return response;
    } catch (err) {
        console.error("Login error:", err instanceof Error ? err.message : "unknown error");
        return NextResponse.json(
            { error: "Terjadi kesalahan server." },
            { status: 500, headers: NO_STORE_HEADERS }
        );
    }
}
