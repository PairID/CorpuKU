import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import crypto from "crypto";
import { hashPassword, validatePasswordStrength } from "@/lib/password";
import { consumeRateLimit, getClientIp, isSameOrigin } from "@/lib/request-security";
import { parseJsonBody, readJsonRequest, registerSchema, validateNipOrNik } from "@/lib/validation";

const NO_STORE_HEADERS = { "Cache-Control": "no-store, max-age=0", Pragma: "no-cache" };

export async function POST(request: NextRequest) {
    try {
        if (!isSameOrigin(request)) {
            return NextResponse.json({ error: "Permintaan tidak diizinkan." }, { status: 403, headers: NO_STORE_HEADERS });
        }
        const rawBody = await readJsonRequest(request);
        const parsed = registerSchema.safeParse(rawBody);
        if (!parsed.success) {
            const firstIssue = parsed.error.issues[0];
            const field = String(firstIssue?.path[0] || "");
            const fieldLabels: Record<string, string> = {
                name: "Nama Lengkap",
                email: "Email Kedinasan",
                nip: "NIP / NIK",
                password: "Password",
                instansiAsal: "Instansi Asal",
            };
            const label = fieldLabels[field] || "Kolom isian";
            let errorMsg = firstIssue?.message;
            if (!errorMsg || errorMsg === "Required" || errorMsg.includes("Invalid")) {
                errorMsg = `${label} wajib diisi dengan benar.`;
            }
            return NextResponse.json({ error: errorMsg }, { status: 400, headers: NO_STORE_HEADERS });
        }
        const data = parsed.data;
        if (data.nip) {
            const clean = data.nip.replace(/\D/g, "");
            const nipVal = validateNipOrNik(clean);
            if (!nipVal.valid) {
                return NextResponse.json({ error: nipVal.error || "Format NIP (18 digit) atau NIK (16 digit) tidak valid." }, { status: 400, headers: NO_STORE_HEADERS });
            }
        }
        const passwordError = validatePasswordStrength(data.password);
        if (passwordError) return NextResponse.json({ error: passwordError }, { status: 400, headers: NO_STORE_HEADERS });
        const rateLimit = await consumeRateLimit({
            scope: "register",
            identifier: getClientIp(request),
            // ponytail: allow shared NAT/Wi-Fi classrooms (65+ participants on one public IP) to register concurrently
            limit: 100,
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
            const msg = error.message.toLowerCase();
            if (msg.includes("email")) {
                return NextResponse.json(
                    { error: "Email ini sudah terdaftar. Silakan gunakan email lain atau langsung masuk (login)." },
                    { status: 400, headers: NO_STORE_HEADERS }
                );
            }
            if (msg.includes("nip") || msg.includes("username")) {
                return NextResponse.json(
                    { error: "NIP/NIK ini sudah terdaftar. Silakan langsung masuk (login) menggunakan NIP/NIK tersebut." },
                    { status: 400, headers: NO_STORE_HEADERS }
                );
            }
            return NextResponse.json(
                { error: "Akun dengan NIP atau Email tersebut sudah terdaftar. Silakan langsung masuk." },
                { status: 400, headers: NO_STORE_HEADERS }
            );
        }
        return NextResponse.json(
            { error: "Pendaftaran gagal. Silakan periksa kembali data Anda atau coba beberapa saat lagi." },
            { status: 500, headers: NO_STORE_HEADERS }
        );
    }
}
