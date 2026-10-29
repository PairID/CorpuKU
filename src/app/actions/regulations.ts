"use server";

import { revalidatePath } from "next/cache";
import { sql } from "@/lib/db";
import { requireInstructorSession } from "./auth";
import { crawlBpkRegulation, syncScrapedRegulationToRegistry } from "@/lib/regulatory-crawler";
import { RegulationStatus } from "@/lib/regulatory-registry";

export interface RegistryDocumentItem {
    id: string;
    docType: string;
    docNumber: string;
    docYear: number;
    title: string;
    issuer: string;
    status: RegulationStatus;
    amendedBy?: string | null;
    supersededBy?: string | null;
    effectiveDate?: string | null;
    officialUrl?: string | null;
    pdfUrl?: string | null;
    abstract?: string | null;
    articleCount: number;
    articles?: Array<{
        id: string;
        articleNumber: string;
        articleTitle: string;
        substance: string;
    }>;
}

export interface RegistryStats {
    totalDocuments: number;
    activeCount: number;
    amendedCount: number;
    repealedCount: number;
    totalArticles: number;
}

export interface CreateManualDocumentInput {
    id?: string;
    docType: string;
    docNumber: string;
    docYear: number;
    title: string;
    issuer: string;
    status: RegulationStatus;
    effectiveDate?: string;
    officialUrl?: string;
    pdfUrl?: string;
    abstract?: string;
    content?: string;
    articles?: Array<{
        articleNumber: string;
        articleTitle: string;
        substance: string;
    }>;
}

/**
 * Server Action: Mengambil seluruh dokumen di Document Registry beserta statistik
 */
export async function getRegistryDocumentsWithStatsAction(): Promise<{
    success: boolean;
    documents: RegistryDocumentItem[];
    stats: RegistryStats;
    error?: string;
}> {
    try {
        await requireInstructorSession();

        // 1. Ambil seluruh dokumen
        const docRows = await sql`
            SELECT id, doc_type as "docType", doc_number as "docNumber", doc_year as "docYear",
                   title, issuer, status, amended_by as "amendedBy", superseded_by as "supersededBy",
                   effective_date as "effectiveDate", official_url as "officialUrl",
                   pdf_url as "pdfUrl", abstract
            FROM document_registry
            ORDER BY doc_year DESC, doc_number DESC
        `;

        // 2. Ambil seluruh pasal
        const articleRows = await sql`
            SELECT id, document_id as "documentId", article_number as "articleNumber",
                   article_title as "articleTitle", substance
            FROM legal_articles
            ORDER BY id ASC
        `;

        // Petakan pasal ke dokumen
        const articleMap = new Map<string, Array<{ id: string; articleNumber: string; articleTitle: string; substance: string }>>();
        for (const art of articleRows) {
            const docId = String(art.documentId);
            if (!articleMap.has(docId)) {
                articleMap.set(docId, []);
            }
            articleMap.get(docId)!.push({
                id: String(art.id),
                articleNumber: String(art.articleNumber),
                articleTitle: String(art.articleTitle),
                substance: String(art.substance)
            });
        }

        const documents: RegistryDocumentItem[] = docRows.map((r: Record<string, unknown>) => {
            const docId = String(r.id);
            const docArticles = articleMap.get(docId) || [];
            return {
                id: docId,
                docType: String(r.docType || ""),
                docNumber: String(r.docNumber || ""),
                docYear: Number(r.docYear || 0),
                title: String(r.title || ""),
                issuer: String(r.issuer || ""),
                status: (r.status as RegulationStatus) || "ACTIVE",
                amendedBy: r.amendedBy ? String(r.amendedBy) : null,
                supersededBy: r.supersededBy ? String(r.supersededBy) : null,
                effectiveDate: r.effectiveDate
                    ? (r.effectiveDate instanceof Date
                        ? r.effectiveDate.toISOString().split("T")[0]
                        : String(r.effectiveDate))
                    : null,
                officialUrl: r.officialUrl ? String(r.officialUrl) : null,
                pdfUrl: r.pdfUrl ? String(r.pdfUrl) : null,
                abstract: r.abstract ? String(r.abstract) : null,
                articleCount: docArticles.length,
                articles: docArticles
            };
        });

        const stats: RegistryStats = {
            totalDocuments: documents.length,
            activeCount: documents.filter(d => d.status === "ACTIVE").length,
            amendedCount: documents.filter(d => d.status === "AMENDED_PARTIALLY").length,
            repealedCount: documents.filter(d => d.status === "REPEALED").length,
            totalArticles: articleRows.length
        };

        return {
            success: true,
            documents,
            stats
        };
    } catch (err: unknown) {
        console.error("[getRegistryDocumentsWithStatsAction Error]:", err);
        return {
            success: false,
            documents: [],
            stats: { totalDocuments: 0, activeCount: 0, amendedCount: 0, repealedCount: 0, totalArticles: 0 },
            error: err instanceof Error ? err.message : "Gagal memuat bank data regulasi."
        };
    }
}

/**
 * Server Action: Tarik otomatis naskah regulasi dari URL JDIH BPK via Puppeteer Crawler
 */
export async function crawlAndSyncBpkAction(url: string): Promise<{
    success: boolean;
    documentId?: string;
    title?: string;
    error?: string;
}> {
    try {
        await requireInstructorSession();

        if (!url || typeof url !== "string" || !url.includes("peraturan.bpk.go.id")) {
            return {
                success: false,
                error: "URL tidak valid. Masukkan URL resmi dari portal peraturan.bpk.go.id (contoh: https://peraturan.bpk.go.id/Details/318647/perpres-no-46-tahun-2025)."
            };
        }

        // Jalankan bot crawler
        const scraped = await crawlBpkRegulation(url.trim());
        const doc = await syncScrapedRegulationToRegistry(scraped);

        revalidatePath("/instructor/regulations");
        revalidatePath("/admin/regulations");
        revalidatePath("/instructor/courses/creator");
        revalidatePath("/admin/courses/creator");

        return {
            success: true,
            documentId: doc.id,
            title: doc.title
        };
    } catch (err: unknown) {
        console.error("[crawlAndSyncBpkAction Error]:", err);
        return {
            success: false,
            error: err instanceof Error ? err.message : "Gagal menarik dokumen dari portal JDIH BPK."
        };
    }
}

/**
 * Server Action: Tambah / Unggah Dokumen Manual ke Document Registry
 */
export async function createManualDocumentAction(payload: CreateManualDocumentInput): Promise<{
    success: boolean;
    documentId?: string;
    error?: string;
}> {
    try {
        await requireInstructorSession();

        if (!payload.title || payload.title.trim().length < 5) {
            return { success: false, error: "Judul dokumen wajib diisi minimal 5 karakter." };
        }

        const docSlug = payload.id
            ? payload.id.toLowerCase().replace(/[^a-z0-9-_]/g, "-")
            : `${payload.docType.toLowerCase().replace(/[^a-z0-9]/g, "-")}-${payload.docNumber}-${payload.docYear}`;

        const tsvText = `${payload.title} ${payload.abstract || ""} ${payload.issuer || ""}`;

        // 1. Simpan dokumen ke document_registry
        await sql`
            INSERT INTO document_registry (
                id, doc_type, doc_number, doc_year, title, issuer, status,
                effective_date, official_url, pdf_url, abstract, content,
                tsv_content, updated_at
            ) VALUES (
                ${docSlug}, ${payload.docType}, ${payload.docNumber}, ${payload.docYear},
                ${payload.title.trim()}, ${payload.issuer.trim()}, ${payload.status},
                ${payload.effectiveDate || null}, ${payload.officialUrl || null}, ${payload.pdfUrl || null},
                ${payload.abstract || null}, ${payload.content || null},
                to_tsvector('indonesian', ${tsvText}),
                CURRENT_TIMESTAMP
            )
            ON CONFLICT (id) DO UPDATE SET
                doc_type = EXCLUDED.doc_type,
                doc_number = EXCLUDED.doc_number,
                doc_year = EXCLUDED.doc_year,
                title = EXCLUDED.title,
                issuer = EXCLUDED.issuer,
                status = EXCLUDED.status,
                effective_date = EXCLUDED.effective_date,
                official_url = EXCLUDED.official_url,
                pdf_url = EXCLUDED.pdf_url,
                abstract = EXCLUDED.abstract,
                content = EXCLUDED.content,
                tsv_content = EXCLUDED.tsv_content,
                updated_at = CURRENT_TIMESTAMP;
        `;

        // 2. Simpan pasal jika disertakan
        if (payload.articles && payload.articles.length > 0) {
            for (let i = 0; i < payload.articles.length; i++) {
                const art = payload.articles[i];
                const artId = `${docSlug}-pasal-${i + 1}`;
                const tsvArt = `${art.articleNumber} ${art.articleTitle} ${art.substance}`;

                await sql`
                    INSERT INTO legal_articles (
                        id, document_id, article_number, article_title, substance, is_active, tsv_article
                    ) VALUES (
                        ${artId}, ${docSlug}, ${art.articleNumber}, ${art.articleTitle}, ${art.substance},
                        ${payload.status === "ACTIVE"},
                        to_tsvector('indonesian', ${tsvArt})
                    )
                    ON CONFLICT (id) DO UPDATE SET
                        article_number = EXCLUDED.article_number,
                        article_title = EXCLUDED.article_title,
                        substance = EXCLUDED.substance,
                        is_active = EXCLUDED.is_active,
                        tsv_article = EXCLUDED.tsv_article;
                `;
            }
        }

        revalidatePath("/instructor/regulations");
        revalidatePath("/admin/regulations");
        revalidatePath("/instructor/courses/creator");
        revalidatePath("/admin/courses/creator");

        return {
            success: true,
            documentId: docSlug
        };
    } catch (err: unknown) {
        console.error("[createManualDocumentAction Error]:", err);
        return {
            success: false,
            error: err instanceof Error ? err.message : "Gagal menyimpan dokumen ke bank data."
        };
    }
}

/**
 * Server Action: Hapus dokumen dari Document Registry
 */
export async function deleteRegistryDocumentAction(id: string): Promise<{ success: boolean; error?: string }> {
    try {
        await requireInstructorSession();

        // Hapus pasal terlebih dahulu
        await sql`DELETE FROM legal_articles WHERE document_id = ${id}`;
        // Hapus dokumen
        await sql`DELETE FROM document_registry WHERE id = ${id}`;

        revalidatePath("/instructor/regulations");
        revalidatePath("/admin/regulations");
        revalidatePath("/instructor/courses/creator");

        return { success: true };
    } catch (err: unknown) {
        console.error("[deleteRegistryDocumentAction Error]:", err);
        return {
            success: false,
            error: err instanceof Error ? err.message : "Gagal menghapus dokumen."
        };
    }
}

export interface ExternalSourceItem {
    id: string;
    sourceType: "JDIH" | "JOURNAL" | "BOOK";
    title: string;
    authorOrIssuer: string;
    year: number | string;
    url: string;
    pdfUrl?: string | null;
    description?: string;
    extraMeta?: string;
    isIngested?: boolean;
}

/**
 * Server Action: Pencarian multi-sumber eksternal (JDIH se-Indonesia, Jurnal Ilmiah CrossRef, dan Buku Open Library/Anna's Archive)
 */
export async function searchExternalSourcesAction(
    query: string,
    category: "ALL" | "JDIH" | "JOURNAL" | "BOOK" = "ALL"
): Promise<{
    success: boolean;
    results: ExternalSourceItem[];
    annasArchiveSearchUrl?: string;
    error?: string;
}> {
    try {
        await requireInstructorSession();

        if (!query || query.trim().length < 2) {
            return { success: true, results: [] };
        }

        const trimmedQuery = query.trim();
        const results: ExternalSourceItem[] = [];

        // 1. Ambil daftar ID yang sudah tersimpan di database untuk flag isIngested
        const existingDocs = await sql`SELECT id, official_url as "officialUrl" FROM document_registry`;
        const existingUrls = new Set(existingDocs.map((d: Record<string, unknown>) => String(d.officialUrl || "")));
        const existingIds = new Set(existingDocs.map((d: Record<string, unknown>) => String(d.id || "")));

        const fetchPromises: Promise<void>[] = [];

        // --- Sumber 1: JDIH Peraturan (JDIH BPK RI & JDIHN) ---
        if (category === "ALL" || category === "JDIH") {
            fetchPromises.push((async () => {
                try {
                    const bpkRes = await fetch(`https://peraturan.bpk.go.id/Search?keywords=${encodeURIComponent(trimmedQuery)}`, {
                        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
                        signal: AbortSignal.timeout(10000)
                    });
                    if (bpkRes.ok) {
                        const html = await bpkRes.text();
                        const re = /<a[^>]+href="(\/Details\/[0-9]+\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
                        let m;
                        const seenUrls = new Set<string>();
                        while ((m = re.exec(html)) !== null && seenUrls.size < 6) {
                            const detailPath = m[1];
                            const fullUrl = `https://peraturan.bpk.go.id${detailPath}`;
                            const rawText = m[2].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
                            if (!seenUrls.has(fullUrl) && rawText.length > 8) {
                                seenUrls.add(fullUrl);
                                const yearMatch = rawText.match(/\b(19\d\d|20\d\d)\b/);
                                const year = yearMatch ? parseInt(yearMatch[1], 10) : new Date().getFullYear();
                                const idSlug = `jdih-${detailPath.split("/")[2] || Math.random().toString(36).substring(7)}`;

                                results.push({
                                    id: idSlug,
                                    sourceType: "JDIH",
                                    title: rawText,
                                    authorOrIssuer: "JDIH BPK RI / JDIHN",
                                    year,
                                    url: fullUrl,
                                    description: `Naskah hukum resmi terdaftar di pangkalan data JDIH (${rawText}).`,
                                    extraMeta: "Portal Resmi JDIH",
                                    isIngested: existingUrls.has(fullUrl) || existingIds.has(idSlug)
                                });
                            }
                        }
                    }
                } catch (e) {
                    console.error("[searchExternalSourcesAction - JDIH Error]:", e);
                }
            })());
        }

        // --- Sumber 2: Jurnal Ilmiah (CrossRef Peer-Reviewed & Scholar DOIs) ---
        if (category === "ALL" || category === "JOURNAL") {
            fetchPromises.push((async () => {
                try {
                    const crRes = await fetch(`https://api.crossref.org/works?query=${encodeURIComponent(trimmedQuery)}&rows=6`, {
                        headers: { "User-Agent": "CorpUKU-Bangkom-ASN-LMS/1.0" },
                        signal: AbortSignal.timeout(10000)
                    });
                    if (crRes.ok) {
                        const crData = await crRes.json();
                        const items = crData.message?.items || [];
                        for (const it of items) {
                            const title = it.title?.[0] || "Artikel Jurnal";
                            const authors = (it.author || [])
                                .map((a: { given?: string; family?: string }) => `${a.given || ""} ${a.family || ""}`.trim())
                                .filter(Boolean)
                                .join(", ") || "Peneliti / Akademisi";
                            const container = it["container-title"]?.[0] || "Jurnal Ilmiah";
                            const year = it.issued?.["date-parts"]?.[0]?.[0] || new Date().getFullYear();
                            const doiUrl = it.resource?.primary?.URL || (it.DOI ? `https://doi.org/${it.DOI}` : "");
                            const idSlug = `journal-${(it.DOI || title).replace(/[^a-zA-Z0-9]/g, "-").toLowerCase().substring(0, 40)}`;

                            results.push({
                                id: idSlug,
                                sourceType: "JOURNAL",
                                title,
                                authorOrIssuer: authors,
                                year,
                                url: doiUrl,
                                description: `Diterbitkan dalam: ${container} (${year}). Identifikasi DOI: ${it.DOI || "-"}`,
                                extraMeta: container,
                                isIngested: existingUrls.has(doiUrl) || existingIds.has(idSlug)
                            });
                        }
                    }
                } catch (e) {
                    console.error("[searchExternalSourcesAction - Journal Error]:", e);
                }
            })());
        }

        // --- Sumber 3: Buku (OpenLibrary & Anna's Archive Reference) ---
        if (category === "ALL" || category === "BOOK") {
            fetchPromises.push((async () => {
                try {
                    const olRes = await fetch(`https://openlibrary.org/search.json?q=${encodeURIComponent(trimmedQuery)}&limit=6`, {
                        signal: AbortSignal.timeout(10000)
                    });
                    if (olRes.ok) {
                        const olData = await olRes.json();
                        const docs = olData.docs || [];
                        for (const d of docs) {
                            const title = d.title;
                            const authors = (d.author_name || []).join(", ") || "Penulis Buku";
                            const year = d.first_publish_year || new Date().getFullYear();
                            const publisher = (d.publisher || [])[0] || "Penerbit Buku";
                            const bookUrl = d.key ? `https://openlibrary.org${d.key}` : "";
                            const idSlug = `book-${(d.key || title).replace(/[^a-zA-Z0-9]/g, "-").toLowerCase().substring(0, 40)}`;

                            results.push({
                                id: idSlug,
                                sourceType: "BOOK",
                                title,
                                authorOrIssuer: `${authors} (${publisher})`,
                                year,
                                url: bookUrl,
                                description: `Buku referensi kajian: ${title}. Penerbit: ${publisher}, Edisi tahun: ${year}.`,
                                extraMeta: `Anna's Archive & OpenLibrary`,
                                isIngested: existingUrls.has(bookUrl) || existingIds.has(idSlug)
                            });
                        }
                    }
                } catch (e) {
                    console.error("[searchExternalSourcesAction - Book Error]:", e);
                }
            })());
        }

        await Promise.all(fetchPromises);

        return {
            success: true,
            results,
            annasArchiveSearchUrl: `https://annas-archive.org/search?q=${encodeURIComponent(trimmedQuery)}`
        };
    } catch (err: unknown) {
        console.error("[searchExternalSourcesAction Error]:", err);
        return {
            success: false,
            results: [],
            error: err instanceof Error ? err.message : "Gagal melakukan penelusuran multi-sumber."
        };
    }
}

/**
 * Server Action: Menyimpan dokumen hasil pencarian eksternal langsung ke Document Registry
 */
export async function ingestExternalSourceAction(item: ExternalSourceItem): Promise<{
    success: boolean;
    documentId?: string;
    error?: string;
}> {
    try {
        await requireInstructorSession();

        // Jika sumber adalah JDIH BPK yang memiliki URL /Details/, crawl lengkap dengan Puppeteer
        if (item.sourceType === "JDIH" && item.url.includes("peraturan.bpk.go.id/Details/")) {
            return await crawlAndSyncBpkAction(item.url);
        }

        // Simpan sebagai referensi hukum / literatur di Document Registry
        const docSlug = item.id.toLowerCase().replace(/[^a-z0-9-_]/g, "-");
        const docType = item.sourceType === "JOURNAL" ? "JURNAL_ILMIAH" : (item.sourceType === "BOOK" ? "BUKU_REFERENSI" : "REGULASI_JDIH");
        const docYear = typeof item.year === "number" ? item.year : parseInt(String(item.year)) || new Date().getFullYear();

        const tsvText = `${item.title} ${item.description || ""} ${item.authorOrIssuer}`;

        await sql`
            INSERT INTO document_registry (
                id, doc_type, doc_number, doc_year, title, issuer, status,
                official_url, pdf_url, abstract, tsv_content, updated_at
            ) VALUES (
                ${docSlug}, ${docType}, ${item.extraMeta || "01"}, ${docYear},
                ${item.title.trim()}, ${item.authorOrIssuer.trim()}, 'ACTIVE',
                ${item.url || null}, ${item.pdfUrl || null}, ${item.description || null},
                to_tsvector('indonesian', ${tsvText}),
                CURRENT_TIMESTAMP
            )
            ON CONFLICT (id) DO UPDATE SET
                title = EXCLUDED.title,
                issuer = EXCLUDED.issuer,
                official_url = EXCLUDED.official_url,
                pdf_url = EXCLUDED.pdf_url,
                abstract = EXCLUDED.abstract,
                tsv_content = EXCLUDED.tsv_content,
                updated_at = CURRENT_TIMESTAMP;
        `;

        revalidatePath("/instructor/regulations");
        revalidatePath("/admin/regulations");
        revalidatePath("/instructor/courses/creator");

        return {
            success: true,
            documentId: docSlug
        };
    } catch (err: unknown) {
        console.error("[ingestExternalSourceAction Error]:", err);
        return {
            success: false,
            error: err instanceof Error ? err.message : "Gagal mengimpor dokumen ke bank data."
        };
    }
}

