import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function GET() {
    try {
        const dbCheck = await sql`SELECT 1 as alive`;
        const dbAlive = dbCheck[0]?.alive === 1;

        if (!dbAlive) {
            return NextResponse.json(
                { status: "error", message: "Database response invalid", timestamp: new Date().toISOString() },
                { status: 503 }
            );
        }

        return NextResponse.json({
            status: "ok",
            database: "connected",
            timestamp: new Date().toISOString(),
        });
    } catch (err) {
        return NextResponse.json(
            {
                status: "error",
                message: err instanceof Error ? err.message : "Health check failed",
                timestamp: new Date().toISOString(),
            },
            { status: 503 }
        );
    }
}
