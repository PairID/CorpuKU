import { NextRequest, NextResponse } from "next/server";
import cloudinary from "@/lib/cloudinary";
import { getAuthSession } from "@/app/actions/auth";
import { sql } from "@/lib/db";
import crypto from "crypto";
import path from "path";
import { consumeRateLimit, isSameOrigin } from "@/lib/request-security";
import type { UploadApiResponse } from "cloudinary";

const ALLOWED_FILES: Record<string, { extensions: string[]; maxSize: number; signature: (buffer: Buffer) => boolean }> = {
  "image/jpeg": { extensions: [".jpg", ".jpeg"], maxSize: 10 * 1024 * 1024, signature: (buffer) => buffer.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff])) },
  "image/png": { extensions: [".png"], maxSize: 10 * 1024 * 1024, signature: (buffer) => buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  "image/gif": { extensions: [".gif"], maxSize: 10 * 1024 * 1024, signature: (buffer) => ["GIF87a", "GIF89a"].includes(buffer.subarray(0, 6).toString("ascii")) },
  "image/webp": { extensions: [".webp"], maxSize: 10 * 1024 * 1024, signature: (buffer) => buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP" },
  "application/pdf": { extensions: [".pdf"], maxSize: 20 * 1024 * 1024, signature: (buffer) => buffer.subarray(0, 5).toString("ascii") === "%PDF-" },
  "video/mp4": { extensions: [".mp4"], maxSize: 50 * 1024 * 1024, signature: (buffer) => buffer.subarray(4, 8).toString("ascii") === "ftyp" },
  "video/webm": { extensions: [".webm"], maxSize: 50 * 1024 * 1024, signature: (buffer) => buffer.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3])) },
};
const NO_STORE_HEADERS = { "Cache-Control": "private, no-store, max-age=0", Pragma: "no-cache" };

export async function POST(req: NextRequest) {
  let uploadedAsset: Pick<UploadApiResponse, "public_id" | "resource_type"> | null = null;
  try {
    if (!isSameOrigin(req)) return NextResponse.json({ error: "Permintaan tidak diizinkan." }, { status: 403, headers: NO_STORE_HEADERS });

    const session = await getAuthSession();
    if (!session) return NextResponse.json({ error: "Autentikasi diperlukan." }, { status: 401, headers: NO_STORE_HEADERS });
    if (!["admin", "instructor"].includes(session.user.role)) {
      return NextResponse.json({ error: "Akses ditolak." }, { status: 403, headers: NO_STORE_HEADERS });
    }

    const contentType = req.headers.get("content-type") || "";
    const declaredLength = Number(req.headers.get("content-length") || "0");
    if (!contentType.toLowerCase().startsWith("multipart/form-data")) {
      return NextResponse.json({ error: "Format unggahan tidak valid." }, { status: 415, headers: NO_STORE_HEADERS });
    }
    if (Number.isFinite(declaredLength) && declaredLength > 52 * 1024 * 1024) {
      return NextResponse.json({ error: "Ukuran permintaan terlalu besar." }, { status: 413, headers: NO_STORE_HEADERS });
    }

    const rateLimit = await consumeRateLimit({
      scope: "media-upload",
      identifier: session.user.id,
      limit: 20,
      windowSeconds: 10 * 60,
    });
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: "Terlalu banyak unggahan. Coba lagi nanti." }, {
        status: 429,
        headers: { ...NO_STORE_HEADERS, "Retry-After": String(rateLimit.retryAfterSeconds) },
      });
    }

    let formData: FormData;
    try {
      formData = await req.formData();
    } catch {
      return NextResponse.json({ error: "Form unggahan tidak valid." }, { status: 400, headers: NO_STORE_HEADERS });
    }
    const fileValue = formData.get("file");
    if (!(fileValue instanceof File)) {
      return NextResponse.json({ error: "Tidak ada file yang diunggah." }, { status: 400, headers: NO_STORE_HEADERS });
    }
    const file = fileValue;

    const policy = ALLOWED_FILES[file.type];
    const extension = path.extname(file.name).toLowerCase();
    if (!policy || !policy.extensions.includes(extension)) {
      return NextResponse.json({ error: "Jenis file tidak didukung." }, { status: 400, headers: NO_STORE_HEADERS });
    }
    if (file.size <= 0 || file.size > policy.maxSize) {
      return NextResponse.json({ error: `Ukuran file tidak valid. Maksimal ${Math.round(policy.maxSize / 1024 / 1024)}MB.` }, { status: 400, headers: NO_STORE_HEADERS });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    if (!policy.signature(buffer)) {
      return NextResponse.json({ error: "Isi file tidak sesuai dengan format yang dipilih." }, { status: 400, headers: NO_STORE_HEADERS });
    }

    const hash = crypto.createHash("sha256").update(buffer).digest("hex");
    const existingAsset = await sql`SELECT url FROM media_assets WHERE hash = ${hash} LIMIT 1`;
    if (existingAsset.length > 0) {
      return NextResponse.json({ url: existingAsset[0].url, success: true, reused: true }, { headers: NO_STORE_HEADERS });
    }

    const result = await new Promise<UploadApiResponse>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder: "corpuku-academy", resource_type: "auto" },
        (error, uploadResult) => {
          if (error) reject(error);
          else if (uploadResult) resolve(uploadResult);
          else reject(new Error("Cloudinary tidak mengembalikan hasil unggahan."));
        },
      );
      uploadStream.end(buffer);
    });
    uploadedAsset = { public_id: result.public_id, resource_type: result.resource_type };

    const assetId = `asset_${crypto.randomUUID()}`;
    const safeFilename = path.basename(file.name)
      .replace(/[\u0000-\u001f\u007f]/g, "_")
      .slice(0, 255);
    await sql`
      INSERT INTO media_assets (id, hash, url, filename, mimetype, size, user_id, public_id, resource_type)
      VALUES (${assetId}, ${hash}, ${result.secure_url}, ${safeFilename}, ${file.type}, ${file.size}, ${session.user.id}, ${result.public_id}, ${result.resource_type})
    `;
    uploadedAsset = null;

    return NextResponse.json({ url: result.secure_url, success: true, reused: false }, { headers: NO_STORE_HEADERS });
  } catch (error: unknown) {
    if (uploadedAsset?.public_id) {
      const resourceType = ["image", "video", "raw"].includes(String(uploadedAsset.resource_type))
        ? String(uploadedAsset.resource_type)
        : "image";
      try {
        await cloudinary.uploader.destroy(uploadedAsset.public_id, { resource_type: resourceType });
      } catch (cleanupError) {
        console.error("Upload cleanup failed:", cleanupError instanceof Error ? cleanupError.message : "unknown error");
      }
    }
    console.error("Error in upload API:", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ error: "Gagal mengunggah file." }, { status: 500, headers: NO_STORE_HEADERS });
  }
}
