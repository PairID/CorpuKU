import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getAuthSession } from "@/app/actions/auth";
import cloudinary from "@/lib/cloudinary";
import { isSameOrigin } from "@/lib/request-security";

interface MediaAsset {
    id: string;
    hash: string;
    url: string;
    filename: string;
    mimetype: string;
    size: number | null;
    userId: string;
    createdAt: string | Date;
}

const NO_STORE_HEADERS = { "Cache-Control": "private, no-store, max-age=0", Pragma: "no-cache" };

async function getInstructorSession() {
    const session = await getAuthSession();
    if (!session) return { session: null, response: NextResponse.json({ error: "Autentikasi diperlukan." }, { status: 401, headers: NO_STORE_HEADERS }) };
    if (!['admin', 'instructor'].includes(session.user.role)) {
        return { session: null, response: NextResponse.json({ error: "Akses ditolak." }, { status: 403, headers: NO_STORE_HEADERS }) };
    }
    return { session, response: null };
}

export async function GET() {
    try {
        const authorization = await getInstructorSession();
        if (!authorization.session) return authorization.response;

        const assets = await sql`
            SELECT id, hash, url, filename, mimetype, size, user_id as "userId", created_at as "createdAt"
            FROM media_assets
            ORDER BY created_at DESC
        `;

        const typedAssets = assets as unknown as MediaAsset[];
        const totalSize = typedAssets.reduce((sum, asset) => sum + (asset.size || 0), 0);
        const images = typedAssets.filter((asset) => asset.mimetype.startsWith("image/")).length;
        const documents = typedAssets.filter((asset) => asset.mimetype.includes("pdf") || asset.mimetype.includes("word") || asset.mimetype.includes("document")).length;

        const responseAssets = typedAssets.map((asset) => ({
            id: asset.id,
            url: asset.url,
            filename: asset.filename,
            mimetype: asset.mimetype,
            size: asset.size,
            createdAt: asset.createdAt,
            ...(authorization.session.user.role === 'admin' ? { hash: asset.hash, userId: asset.userId } : {}),
        }));

        return NextResponse.json({
            success: true,
            assets: responseAssets,
            stats: {
                total: assets.length,
                totalSize,
                images,
                documents,
            }
        }, { headers: NO_STORE_HEADERS });
    } catch (error: unknown) {
        console.error("Error fetching media assets:", error instanceof Error ? error.message : "unknown error");
        return NextResponse.json({ error: "Gagal memuat media." }, { status: 500, headers: NO_STORE_HEADERS });
    }
}

export async function DELETE(req: NextRequest) {
    try {
        if (!isSameOrigin(req)) return NextResponse.json({ error: "Permintaan tidak diizinkan." }, { status: 403, headers: NO_STORE_HEADERS });
        const authorization = await getInstructorSession();
        if (!authorization.session) return authorization.response;
        const session = authorization.session;

        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");

        if (!id || !/^asset_[A-Za-z0-9_-]{1,80}$/.test(id)) {
            return NextResponse.json({ error: "ID aset tidak valid." }, { status: 400, headers: NO_STORE_HEADERS });
        }

        const assets = await sql`
            SELECT user_id AS "userId", public_id AS "publicId", resource_type AS "resourceType"
            FROM media_assets WHERE id = ${id}
        `;
        const asset = assets[0];
        if (!asset) return NextResponse.json({ error: "Aset tidak ditemukan." }, { status: 404, headers: NO_STORE_HEADERS });
        if (session.user.role !== "admin" && String(asset.userId) !== session.user.id) {
            return NextResponse.json({ error: "Akses ditolak." }, { status: 403, headers: NO_STORE_HEADERS });
        }
        if (asset.publicId) {
            const resourceType = ['image', 'video', 'raw'].includes(String(asset.resourceType))
                ? String(asset.resourceType)
                : 'image';
            await cloudinary.uploader.destroy(String(asset.publicId), { resource_type: resourceType });
        }
        await sql`DELETE FROM media_assets WHERE id = ${id}`;

        return NextResponse.json({ success: true }, { headers: NO_STORE_HEADERS });
    } catch (error: unknown) {
        console.error("Error deleting media asset:", error instanceof Error ? error.message : "unknown error");
        return NextResponse.json({ error: "Gagal menghapus media." }, { status: 500, headers: NO_STORE_HEADERS });
    }
}
