import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import crypto from "crypto";
import { hashPassword, validatePasswordStrength } from "@/lib/password";
import { consumeRateLimit, getClientIp, isSameOrigin } from "@/lib/request-security";
import { parseJsonBody, readJsonRequest, registerSchema } from "@/lib/validation";

const NO_STORE_HEADERS = { "Cache-Control": "no-store, max-age=0", Pragma: "no-cache" };

export async function POST(request: NextRequest) {
    try {
        if (!isSameOrigin(request)) {
            return NextResponse.json({ error: "Permintaan tidak diizinkan." }, { status: 403, headers: NO_STORE_HEADERS });
        }
        const data = parseJsonBody(registerSchema, await readJsonRequest(request));
        if (!data) return NextResponse.json({ error: "Data pendaftaran tidak valid." }, { status: 400, headers: NO_STORE_HEADERS });
        const passwordError = validatePasswordStrength(data.password);
        if (passwordError) return NextResponse.json({ error: passwordError }, { status: 400, headers: NO_STORE_HEADERS });
        const rateLimit = await consumeRateLimit({
            scope: "register",
            identifier: getClientIp(request),
            limit: 3,
            windowSeconds: 60 * 60,
        });
        if (!rateLimit.allowed) {
            return NextResponse.json({ error: "Terlalu banyak percobaan pendaftaran." }, {
                status: 429,
                headers: { ...NO_STORE_HEADERS, "Retry-After": String(rateLimit.retryAfterSeconds) },
            });
        }

        const id = `usr_${crypto.randomUUID()}`;
        const now = new Date().toISOString();
        const username = data.nip || `${data.email.split("@")[0]}_${crypto.randomBytes(3).toString("hex")}`;
        const passwordHash = await hashPassword(data.password);

        // Insert into Postgres
        await sql`
            INSERT INTO users (id, name, email, nip, username, password, role, instansi_asal, created_at, joined_at)
            VALUES (${id}, ${data.name}, ${data.email}, ${data.nip}, ${username}, ${passwordHash}, 'student', ${data.instansiAsal}, ${now}, ${now})
        `;

        return NextResponse.json({
            success: true,
            user: {
                id: id,
                name: data.name,
                email: data.email,
                nip: data.nip || "",
                role: "student",
            }
        }, { headers: NO_STORE_HEADERS });
    } catch (error: unknown) {
        console.error("Registration error:", error instanceof Error ? error.message : "unknown error");
        if (error instanceof Error && /unique|duplicate/i.test(error.message)) {
            return NextResponse.json(
                { error: "Pendaftaran tidak dapat diproses dengan data tersebut." },
                { status: 400, headers: NO_STORE_HEADERS }
            );
        }
        return NextResponse.json(
            { error: "Pendaftaran gagal. Silakan coba lagi." },
            { status: 500, headers: NO_STORE_HEADERS }
        );
    }
}
