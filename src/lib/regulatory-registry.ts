/**
 * Document Registry & Version Control System (CorpuKU RAG Engine)
 * 
 * Mengelola repositori dokumen hukum, pelacakan silsilah keberlakuan regulasi
 * (ACTIVE, AMENDED_PARTIALLY, REPEALED), PostgreSQL Full-Text Search (tsvector),
 * dan Hybrid Search dengan eliminasi aturan dicabut (anti context-clash).
 */

import { sql as defaultSql } from './db';

export type RegulationStatus = 'ACTIVE' | 'AMENDED_PARTIALLY' | 'REPEALED';

export interface LegalDocument {
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
  content?: string | null;
  metadata?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
}

export interface LegalArticle {
  id: string;
  documentId: string;
  articleNumber: string;
  articleTitle?: string | null;
  substance: string;
  isActive: boolean;
}

export interface HybridSearchResult {
  documentId: string;
  docTitle: string;
  docNumber: string;
  docYear: number;
  status: RegulationStatus;
  articleId?: string;
  articleNumber?: string;
  substance?: string;
  textRank: number;
  semanticScore: number;
  combinedScore: number;
  isAmended: boolean;
  amendingDocId?: string | null;
}

// In-memory reference dataset untuk fallback/testing offline & zero-latency grounding
export const SEED_PBJ_DOCUMENTS: LegalDocument[] = [
  {
    id: 'perpres-16-2018',
    docType: 'PERPRES',
    docNumber: '16',
    docYear: 2018,
    title: 'Peraturan Presiden Nomor 16 Tahun 2018 tentang Pengadaan Barang/Jasa Pemerintah',
    issuer: 'Presiden Republik Indonesia',
    status: 'AMENDED_PARTIALLY',
    amendedBy: 'perpres-46-2025',
    effectiveDate: '2018-07-01',
    officialUrl: 'https://peraturan.bpk.go.id/Details/81313/perpres-no-16-tahun-2018',
    abstract: 'Peraturan ini mengatur tata cara dan prinsip pengadaan barang/jasa pemerintah secara nasional untuk efisiensi, akuntabilitas, dan transparansi anggaran negara.',
    content: 'Pasal 11 tentang Tugas PPK. Pasal 25 tentang Spesifikasi Teknis dan Larangan Penguncian Merek. Pasal 26 tentang HPS dan Batas Waktu 28 Hari Kerja serta Larangan Contingency.'
  },
  {
    id: 'perpres-12-2021',
    docType: 'PERPRES',
    docNumber: '12',
    docYear: 2021,
    title: 'Peraturan Presiden Nomor 12 Tahun 2021 tentang Perubahan atas Peraturan Presiden Nomor 16 Tahun 2018 tentang Pengadaan Barang/Jasa Pemerintah',
    issuer: 'Presiden Republik Indonesia',
    status: 'AMENDED_PARTIALLY',
    amendedBy: 'perpres-46-2025',
    effectiveDate: '2021-02-02',
    officialUrl: 'https://peraturan.bpk.go.id/Details/161421/perpres-no-12-tahun-2021',
    abstract: 'Mengubah ketentuan Perpres 16/2018 untuk penguatan peran usaha mikro, kecil, dan koperasi serta penyesuaian belanja produk dalam negeri.',
    content: 'Penyesuaian ketentuan Pasal 25, 26, dan pasal terkait keberpihakan pada produk dalam negeri (PDN) dan pelaku usaha mikro kecil.'
  },
  {
    id: 'perpres-46-2025',
    docType: 'PERPRES',
    docNumber: '46',
    docYear: 2025,
    title: 'Peraturan Presiden Nomor 46 Tahun 2025 tentang Perubahan Kedua atas Peraturan Presiden Nomor 16 Tahun 2018 tentang Pengadaan Barang/Jasa Pemerintah',
    issuer: 'Presiden Republik Indonesia',
    status: 'ACTIVE',
    effectiveDate: '2025-04-30',
    officialUrl: 'https://peraturan.bpk.go.id/Details/318647/perpres-no-46-tahun-2025',
    abstract: 'Perpres ini mengatur mengenai perubahan kedua ketentuan Perpres 16/2018 jo. Perpres 12/2021 mencakup penguatan digitalisasi katalog elektronik, pengawasan kepatuhan PDN, dan kepastian hukum PBJ nasional.',
    content: 'Ketentuan Perubahan Kedua Perpres PBJ. Berlaku sejak 30 April 2025.'
  },
  {
    id: 'peraturan-lkpp-12-2021',
    docType: 'PERATURAN_LKPP',
    docNumber: '12',
    docYear: 2021,
    title: 'Peraturan Lembaga Kebijakan Pengadaan Barang/Jasa Pemerintah Nomor 12 Tahun 2021 tentang Pedoman Pelaksanaan Pengadaan Barang/Jasa Pemerintah Melalui Penyedia',
    issuer: 'Lembaga Kebijakan Pengadaan Barang/Jasa Pemerintah',
    status: 'AMENDED_PARTIALLY',
    amendedBy: 'peraturan-lkpp-4-2024',
    effectiveDate: '2021-06-02',
    officialUrl: 'https://peraturan.bpk.go.id/Details/169563/peraturan-lkpp-no-12-tahun-2021',
    abstract: 'Pedoman operasional teknis pemilihan penyedia pengadaan barang, pekerjaan konstruksi, jasa konsultansi, dan jasa lainnya.',
    content: 'Tata cara survei pasar, penetapan HPS, evaluasi penawaran, dan lampiran standar dokumen pemilihan.'
  },
  {
    id: 'peraturan-lkpp-4-2024',
    docType: 'PERATURAN_LKPP',
    docNumber: '4',
    docYear: 2024,
    title: 'Peraturan Lembaga Kebijakan Pengadaan Barang/Jasa Pemerintah Nomor 4 Tahun 2024 tentang Perubahan Atas Peraturan Lembaga Kebijakan Pengadaan Barang/Jasa Pemerintah Nomor 12 Tahun 2021 tentang Pedoman Pelaksanaan Pengadaan Barang/Jasa Pemerintah Melalui Penyedia',
    issuer: 'Lembaga Kebijakan Pengadaan Barang/Jasa Pemerintah',
    status: 'ACTIVE',
    effectiveDate: '2024-10-18',
    officialUrl: 'https://peraturan.bpk.go.id/Details/314291/peraturan-lkpp-no-4-tahun-2024',
    abstract: 'Peraturan ini mengubah Lampiran III dan Lampiran VI Peraturan LKPP Nomor 12 Tahun 2021 terkait pengadaan pekerjaan konstruksi terintegrasi rancang dan bangun (design and build).',
    content: 'Penyempurnaan tata cara pemilihan dan dokumen pemilihan pekerjaan konstruksi rancang dan bangun melalui penyedia.'
  },
  {
    id: 'perpres-54-2010',
    docType: 'PERPRES',
    docNumber: '54',
    docYear: 2010,
    title: 'Peraturan Presiden Nomor 54 Tahun 2010 tentang Pengadaan Barang/Jasa Pemerintah',
    issuer: 'Presiden Republik Indonesia',
    status: 'REPEALED',
    supersededBy: 'perpres-16-2018',
    effectiveDate: '2010-08-06',
    officialUrl: 'https://peraturan.bpk.go.id/Details/41662/perpres-no-54-tahun-2010',
    abstract: 'Regulasi lama PBJP. Telah dicabut dan dinyatakan tidak berlaku oleh Pasal 90 Perpres Nomor 16 Tahun 2018.',
    content: 'Dicabut sepenuhnya. Tidak boleh digunakan sebagai rujukan hukum positif aktif.'
  }
];

export const SEED_PBJ_ARTICLES: LegalArticle[] = [
  {
    id: 'perpres-16-2018-pasal-11',
    documentId: 'perpres-16-2018',
    articleNumber: 'Pasal 11',
    articleTitle: 'Tugas dan Kewenangan PPK',
    substance: 'PPK dalam Pengadaan Barang/Jasa memiliki tugas dan wewenang: menyusun perencanaan pengadaan; menetapkan spesifikasi teknis/Kerangka Acuan Kerja (KAK); menetapkan rancangan kontrak; menetapkan HPS; menetapkan besaran uang muka; mengendalikan kontrak; menilai kinerja Penyedia.',
    isActive: true
  },
  {
    id: 'perpres-16-2018-pasal-20',
    documentId: 'perpres-16-2018',
    articleNumber: 'Pasal 20',
    articleTitle: 'Larangan Memecah Paket Pengadaan',
    substance: 'PPK dilarang mengadakan ikatan perjanjian atau menandatangani Kontrak dengan Penyedia dalam hal anggaran belum tersedia. PA/KPA dilarang memecah Pengadaan Barang/Jasa menjadi beberapa paket dengan maksud menolak atau menghindari Tender/Seleksi.',
    isActive: true
  },
  {
    id: 'perpres-16-2018-pasal-25',
    documentId: 'perpres-16-2018',
    articleNumber: 'Pasal 25',
    articleTitle: 'Spesifikasi Teknis/KAK & Larangan Penguncian Merek',
    substance: 'Spesifikasi teknis/KAK disusun oleh PPK berdasarkan kebutuhan pengguna barang/jasa. Dalam penyusunan spesifikasi teknis/KAK dimungkinkan penyebutan merek terhadap: a. komponen barang/jasa; b. suku cadang; c. bagian dari satu sistem yang sudah ada; d. barang/jasa dalam katalog elektronik; atau e. barang/jasa pada toko daring. Penyebutan merek di luar batasan tersebut dilarang keras demi menjamin persaingan usaha yang sehat dan adil.',
    isActive: true
  },
  {
    id: 'perpres-16-2018-pasal-26',
    documentId: 'perpres-16-2018',
    articleNumber: 'Pasal 26',
    articleTitle: 'Penyusunan dan Penetapan HPS',
    substance: 'HPS disusun dan ditetapkan oleh PPK berdasarkan data yang dapat dipertanggungjawabkan. HPS telah memperhitungkan keuntungan dan biaya tidak langsung (overhead). Ayat (4): Penetapan HPS paling lama 28 (dua puluh delapan) hari kerja sebelum batas akhir pemasukan dokumen penawaran. Ayat (5): HPS tidak boleh memperhitungkan biaya tidak terduga, biaya lain-lain, dan keuntungan ganda (contingency cost).',
    isActive: true
  },
  {
    id: 'perpres-46-2025-pasal-1',
    documentId: 'perpres-46-2025',
    articleNumber: 'Pasal 1',
    articleTitle: 'Ketentuan Perubahan Kedua Perpres PBJ',
    substance: 'Mengubah ketentuan pengadaan barang/jasa pemerintah dalam Perpres 16/2018 dan Perpres 12/2021, memperkuat integrasi katalog elektronik nasional, percepatan penyerapan produk usaha mikro kecil dalam negeri, dan digitalisasi kontrak.',
    isActive: true
  },
  {
    id: 'peraturan-lkpp-4-2024-pasal-1',
    documentId: 'peraturan-lkpp-4-2024',
    articleNumber: 'Pasal 1',
    articleTitle: 'Pembaruan Pedoman Pekerjaan Konstruksi Rancang Bangun',
    substance: 'Mengubah Lampiran III dan Lampiran VI Peraturan LKPP Nomor 12 Tahun 2021 mengenai pedoman pelaksanaan pengadaan pekerjaan konstruksi terintegrasi rancang dan bangun (design and build) melalui penyedia.',
    isActive: true
  }
];

/**
 * Menghubungkan atau menginisialisasi registry di database Neon
 */
export async function seedDocumentRegistryToDb(client = defaultSql): Promise<void> {
  // ponytail: Two-pass upsert untuk menangani forward/circular foreign key lineage
  // Pass 1: Upsert semua dokumen dasar tanpa relasi foreign key
  for (const doc of SEED_PBJ_DOCUMENTS) {
    await client`
      INSERT INTO document_registry (
        id, doc_type, doc_number, doc_year, title, issuer, status,
        effective_date, official_url, abstract, content,
        tsv_content, updated_at
      ) VALUES (
        ${doc.id}, ${doc.docType}, ${doc.docNumber}, ${doc.docYear}, ${doc.title}, ${doc.issuer}, ${doc.status},
        ${doc.effectiveDate || null}, ${doc.officialUrl || null}, ${doc.abstract || null}, ${doc.content || null},
        to_tsvector('indonesian', ${coalesceStr(doc.title, doc.abstract, doc.content)}),
        CURRENT_TIMESTAMP
      )
      ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        status = EXCLUDED.status,
        effective_date = EXCLUDED.effective_date,
        official_url = EXCLUDED.official_url,
        abstract = EXCLUDED.abstract,
        content = EXCLUDED.content,
        tsv_content = EXCLUDED.tsv_content,
        updated_at = CURRENT_TIMESTAMP;
    `;
  }

  // Pass 2: Kaitkan silsilah hukum (amended_by, superseded_by) setelah semua id tersedia
  for (const doc of SEED_PBJ_DOCUMENTS) {
    if (doc.amendedBy || doc.supersededBy) {
      await client`
        UPDATE document_registry
        SET 
          amended_by = ${doc.amendedBy || null},
          superseded_by = ${doc.supersededBy || null},
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ${doc.id};
      `;
    }
  }

  for (const art of SEED_PBJ_ARTICLES) {
    await client`
      INSERT INTO legal_articles (
        id, document_id, article_number, article_title, substance, is_active,
        tsv_article, updated_at
      ) VALUES (
        ${art.id}, ${art.documentId}, ${art.articleNumber}, ${art.articleTitle || null},
        ${art.substance}, ${art.isActive},
        to_tsvector('indonesian', ${art.articleNumber + ' ' + (art.articleTitle || '') + ' ' + art.substance}),
        CURRENT_TIMESTAMP
      )
      ON CONFLICT (id) DO UPDATE SET
        article_title = EXCLUDED.article_title,
        substance = EXCLUDED.substance,
        is_active = EXCLUDED.is_active,
        tsv_article = EXCLUDED.tsv_article,
        updated_at = CURRENT_TIMESTAMP;
    `;
  }
}

function coalesceStr(...parts: (string | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ');
}

/**
 * Filter konflik deterministik: Singkirkan aturan yang berstatus REPEALED
 */
export function filterRepealedDocuments(docs: LegalDocument[]): LegalDocument[] {
  return docs.filter(d => d.status !== 'REPEALED');
}

/**
 * Pencarian Semantik Lokal (Heuristik Berbasis Bobot Domain PBJ)
 * Memberikan nilai kecocokan semantik konteks terhadap masalah kerja ASN
 */
export function calculateSemanticScore(query: string, text: string): number {
  const qTerms = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);
  const target = text.toLowerCase();
  if (qTerms.length === 0) return 0;

  // Domain weight boosts
  const domainBoosts: Record<string, string[]> = {
    spek: ['spesifikasi', 'merek', 'brand', 'lock-in', 'kunci', 'komponen', 'kak'],
    hps: ['hps', 'perkiraan', 'harga', 'survei', 'pasar', '28 hari', 'overhead', 'contingency', 'tak terduga'],
    tugas: ['ppk', 'tugas', 'wewenang', 'rencana', 'kontrak']
  };

  let score = 0;
  for (const term of qTerms) {
    if (target.includes(term)) {
      score += 1.0;
    }
  }

  for (const [, synonyms] of Object.entries(domainBoosts)) {
    const queryHasSynonym = synonyms.some(s => query.toLowerCase().includes(s));
    const targetHasSynonym = synonyms.some(s => target.includes(s));
    if (queryHasSynonym && targetHasSynonym) {
      score += 1.5;
    }
  }

  return Number((score / (qTerms.length + 1)).toFixed(3));
}

/**
 * Hybrid Search Engine:
 * Menggabungkan exact match (tsvector) dan konteks semantik,
 * dengan filter deterministik untuk menolak aturan dicabut.
 */
export async function searchRegulationsHybrid(
  query: string,
  options: {
    limit?: number;
    includeRepealed?: boolean;
    client?: typeof defaultSql;
  } = {}
): Promise<HybridSearchResult[]> {
  const { limit = 5, includeRepealed = false, client } = options;

  // Coba query via database jika client tersedia dan terkoneksi
  if (client) {
    try {
      const sanitizedQuery = query
        .replace(/[^\w\s]/gi, ' ')
        .trim()
        .split(/\s+/)
        .filter(w => w.length > 1)
        .join(' | ');

      const queryParam = sanitizedQuery || 'pengadaan';

      const rows = await client`
        SELECT 
          d.id as doc_id,
          d.title as doc_title,
          d.doc_number,
          d.doc_year,
          d.status,
          d.amended_by,
          a.id as article_id,
          a.article_number,
          a.substance,
          ts_rank_cd(a.tsv_article, to_tsquery('indonesian', ${queryParam})) as text_rank
        FROM legal_articles a
        JOIN document_registry d ON a.document_id = d.id
        WHERE (${includeRepealed} = true OR d.status != 'REPEALED')
        ORDER BY text_rank DESC
        LIMIT ${limit * 2};
      `;

      if (rows && rows.length > 0) {
        return rows.map((r: Record<string, unknown>) => {
          const docId = String(r.doc_id);
          const substance = String(r.substance || '');
          const textRank = Number(r.text_rank || 0);
          const semanticScore = calculateSemanticScore(query, substance);
          const combinedScore = Number((textRank * 0.6 + semanticScore * 0.4).toFixed(3));

          return {
            documentId: docId,
            docTitle: String(r.doc_title),
            docNumber: String(r.doc_number),
            docYear: Number(r.doc_year),
            status: r.status as RegulationStatus,
            articleId: String(r.article_id),
            articleNumber: String(r.article_number),
            substance,
            textRank,
            semanticScore,
            combinedScore,
            isAmended: Boolean(r.amended_by),
            amendingDocId: r.amended_by ? String(r.amended_by) : null
          };
        }).sort((a: HybridSearchResult, b: HybridSearchResult) => b.combinedScore - a.combinedScore).slice(0, limit);
      }
    } catch {
      // Fallback ke in-memory search jika DB belum dikonfigurasi saat test
    }
  }

  // In-Memory Hybrid Search (Fallback terjamin untuk unit test mandiri)
  const candidateDocs = SEED_PBJ_DOCUMENTS.filter(d => includeRepealed || d.status !== 'REPEALED');
  const results: HybridSearchResult[] = [];

  for (const doc of candidateDocs) {
    const articles = SEED_PBJ_ARTICLES.filter(a => a.documentId === doc.id);
    for (const art of articles) {
      const artText = `${art.articleNumber} ${art.articleTitle || ''} ${art.substance}`;
      
      // Exact term match (menyerupai tsvector)
      const qTerms = query.toLowerCase().split(/\s+/).filter(Boolean);
      let matchCount = 0;
      for (const t of qTerms) {
        if (artText.toLowerCase().includes(t)) matchCount++;
      }
      const textRank = Number((matchCount / Math.max(qTerms.length, 1)).toFixed(3));
      const semanticScore = calculateSemanticScore(query, artText);
      const combinedScore = Number((textRank * 0.6 + semanticScore * 0.4).toFixed(3));

      if (combinedScore > 0 || matchCount > 0) {
        results.push({
          documentId: doc.id,
          docTitle: doc.title,
          docNumber: doc.docNumber,
          docYear: doc.docYear,
          status: doc.status,
          articleId: art.id,
          articleNumber: art.articleNumber,
          substance: art.substance,
          textRank,
          semanticScore,
          combinedScore,
          isAmended: Boolean(doc.amendedBy),
          amendingDocId: doc.amendedBy || null
        });
      }
    }
  }

  return results.sort((a, b) => b.combinedScore - a.combinedScore).slice(0, limit);
}
