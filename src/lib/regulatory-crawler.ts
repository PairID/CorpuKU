/**
 * Autonomous JDIH BPK Regulatory Bot Crawler (CorpuKU Bangkom ASN)
 * 
 * Menelusuri, mengekstraksi, dan menyinkronkan naskah regulasi hukum otentik
 * dari basis data resmi Badan Pemeriksa Keuangan (peraturan.bpk.go.id)
 * untuk menjamin integritas data (Zero Fabrication).
 */

import puppeteer, { type Browser } from 'puppeteer';
import { sql as defaultSql } from './db';
import { type LegalDocument, type RegulationStatus } from './regulatory-registry';

export interface ScrapedBpkRegulation {
  bpkId: string;
  title: string;
  canonicalUrl: string;
  pdfUrl?: string;
  rawStatus: string;
  inferredStatus: RegulationStatus;
  docType: string;
  docNumber: string;
  docYear: number;
  issuer: string;
  effectiveDate?: string;
  abstract?: string;
  amendingTargetTitles: string[];
  revokingTargetTitles: string[];
  metadata: Record<string, string>;
}

/**
 * Pemetaan deterministik status keberlakuan hukum dari teks JDIH BPK
 */
export function determineRegulationStatus(
  rawStatusText: string,
  statusHints: string[] = []
): { status: RegulationStatus; isAmending: boolean; isRevoking: boolean } {
  const combined = (rawStatusText + ' ' + statusHints.join(' ')).toLowerCase();

  const isRepealed = combined.includes('dicabut oleh') || combined.includes('tidak berlaku');
  const isPartiallyAmended = combined.includes('diubah oleh') || combined.includes('perubahan atas');
  const isAmending = combined.includes('mengubah :') || combined.includes('mengubah:') || combined.includes('perubahan');
  const isRevoking = combined.includes('mencabut :') || combined.includes('mencabut:');

  if (isRepealed) {
    return { status: 'REPEALED', isAmending, isRevoking };
  }

  // Jika regulasi ini adalah regulasi pengubah yang sedang berlaku
  if (combined.includes('berlaku')) {
    return { status: 'ACTIVE', isAmending, isRevoking };
  }

  if (isPartiallyAmended) {
    return { status: 'AMENDED_PARTIALLY', isAmending, isRevoking };
  }

  // ponytail: Default aman untuk regulasi sah tanpa klausul pencabutan
  return { status: 'ACTIVE', isAmending, isRevoking };
}

/**
 * Parser deterministik untuk memproses teks mentah halaman JDIH BPK
 */
export function parseBpkContent(
  rawTitle: string,
  pageUrl: string,
  bodyText: string,
  pdfLink?: string
): ScrapedBpkRegulation {
  // 1. Ekstraksi Nomor dan Tahun
  const title = rawTitle.replace(/\s+/g, ' ').trim();
  const numMatch = title.match(/Nomor\s+([0-9A-Za-z/.-]+)/i) || title.match(/No\.?\s*([0-9A-Za-z/.-]+)/i);
  const yearMatch = title.match(/Tahun\s+([0-9]{4})/i) || title.match(/\b(20[0-9]{2})\b/);

  const docNumber = numMatch ? numMatch[1].trim() : '0';
  const docYear = yearMatch ? parseInt(yearMatch[1], 10) : new Date().getFullYear();

  // 2. Ekstraksi Bentuk / Doc Type
  let docType = 'PERATURAN_PERUNDANG_UNDANGAN';
  if (/peraturan presiden|perpres/i.test(title)) {
    docType = 'PERPRES';
  } else if (/peraturan lembaga kebijakan pengadaan|peraturan lkpp|perka lkpp/i.test(title)) {
    docType = 'PERATURAN_LKPP';
  } else if (/peraturan menteri/i.test(title)) {
    docType = 'PERMEN';
  }

  // 3. Ekstraksi Penerbit (Issuer)
  let issuer = 'Pemerintah Republik Indonesia';
  if (docType === 'PERPRES') {
    issuer = 'Presiden Republik Indonesia';
  } else if (docType === 'PERATURAN_LKPP') {
    issuer = 'Lembaga Kebijakan Pengadaan Barang/Jasa Pemerintah';
  }

  // 4. Ekstraksi Abstrak / Materi Pokok
  let abstract = '';
  const abstractMatch = bodyText.match(/MATERI POKOK PERATURAN\s*Abstrak([\s\S]*?)(METADATA PERATURAN|FILE-FILE|STATUS PERATURAN|$)/i);
  if (abstractMatch) {
    abstract = abstractMatch[1].replace(/\s+/g, ' ').trim();
  }

  // 5. Ekstraksi Status & Hubungan Silsilah (Mengubah / Mencabut)
  const amendingTargetTitles: string[] = [];
  const revokingTargetTitles: string[] = [];

  const mengUbahMatch = bodyText.match(/Mengubah\s*:\s*([\s\S]*?)(Mencabut|TENTANG DATABASE|KONTAK|SITEMAP|$)/i);
  if (mengUbahMatch) {
    const lines = mengUbahMatch[1].split(/\n/).map(l => l.replace(/\s+/g, ' ').trim()).filter(Boolean);
    for (const l of lines) {
      if (l.length > 10 && !amendingTargetTitles.includes(l)) {
        amendingTargetTitles.push(l);
      }
    }
  }

  const menCabutMatch = bodyText.match(/Mencabut\s*:\s*([\s\S]*?)(Mengubah|TENTANG DATABASE|KONTAK|SITEMAP|$)/i);
  if (menCabutMatch) {
    const lines = menCabutMatch[1].split(/\n/).map(l => l.replace(/\s+/g, ' ').trim()).filter(Boolean);
    for (const l of lines) {
      if (l.length > 10 && !revokingTargetTitles.includes(l)) {
        revokingTargetTitles.push(l);
      }
    }
  }

  // Tanggal berlaku
  let effectiveDate: string | undefined;
  const dateMatch = bodyText.match(/Tanggal Berlaku\s*([0-9]{1,2}\s+[A-Za-z]+\s+[0-9]{4})/i);
  if (dateMatch) {
    effectiveDate = dateMatch[1];
  }

  // Ambil ID dari URL
  const idMatch = pageUrl.match(/Details\/([0-9]+)/i);
  const bpkId = idMatch ? idMatch[1] : '0';

  const statusHints = [
    abstract,
    mengUbahMatch ? mengUbahMatch[0] : '',
    menCabutMatch ? menCabutMatch[0] : ''
  ];

  const rawStatus = bodyText.includes('Status Berlaku') ? 'Berlaku' : (bodyText.includes('Status Dicabut') ? 'Dicabut' : 'Berlaku');
  const { status: inferredStatus } = determineRegulationStatus(rawStatus, statusHints);

  return {
    bpkId,
    title,
    canonicalUrl: pageUrl,
    pdfUrl: pdfLink,
    rawStatus,
    inferredStatus,
    docType,
    docNumber,
    docYear,
    issuer,
    effectiveDate,
    abstract: abstract || undefined,
    amendingTargetTitles,
    revokingTargetTitles,
    metadata: {
      source: 'peraturan.bpk.go.id',
      scrapedAt: new Date().toISOString()
    }
  };
}

/**
 * Crawler Otonom BPK: Menelusuri naskah regulasi menggunakan Puppeteer Headless
 */
export async function crawlBpkRegulation(
  urlOrId: string | number,
  options: { timeoutMs?: number; browser?: Browser } = {}
): Promise<ScrapedBpkRegulation> {
  const { timeoutMs = 30000, browser: externalBrowser } = options;

  const url = typeof urlOrId === 'number' || /^\d+$/.test(String(urlOrId))
    ? `https://peraturan.bpk.go.id/Details/${urlOrId}`
    : String(urlOrId);

  const ownBrowser = !externalBrowser ? await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  }) : null;

  const activeBrowser = externalBrowser || ownBrowser!;

  try {
    const page = await activeBrowser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: timeoutMs });

    const rawData = await page.evaluate(() => {
      const title = (document.querySelector('h1, h2.title, .entry-title') as HTMLElement | null)?.innerText?.trim() || document.title;
      const pdfLink = (document.querySelector('a[href*="Download"], a[href*="download"], a[href$=".pdf"]') as HTMLAnchorElement | null)?.href || '';
      const bodyText = document.body.innerText || '';
      return { title, pdfLink, bodyText };
    });

    await page.close();

    return parseBpkContent(rawData.title, url, rawData.bodyText, rawData.pdfLink);
  } finally {
    if (ownBrowser) {
      await ownBrowser.close();
    }
  }
}

/**
 * Sinkronisasi otomatis regulasi PBJ terkini ke Document Registry
 */
export async function syncScrapedRegulationToRegistry(
  scraped: ScrapedBpkRegulation,
  client = defaultSql
): Promise<LegalDocument> {
  const docSlug = `${scraped.docType.toLowerCase().replace(/_/g, '-')}-${scraped.docNumber}-${scraped.docYear}`;

  const doc: LegalDocument = {
    id: docSlug,
    docType: scraped.docType,
    docNumber: scraped.docNumber,
    docYear: scraped.docYear,
    title: scraped.title,
    issuer: scraped.issuer,
    status: scraped.inferredStatus,
    officialUrl: scraped.canonicalUrl,
    pdfUrl: scraped.pdfUrl,
    abstract: scraped.abstract,
    content: scraped.abstract,
    metadata: scraped.metadata
  };

  // Upsert dokumen ke database
  await client`
    INSERT INTO document_registry (
      id, doc_type, doc_number, doc_year, title, issuer, status,
      official_url, pdf_url, abstract, content, metadata,
      tsv_content, updated_at
    ) VALUES (
      ${doc.id}, ${doc.docType}, ${doc.docNumber}, ${doc.docYear}, ${doc.title}, ${doc.issuer}, ${doc.status},
      ${doc.officialUrl || null}, ${doc.pdfUrl || null}, ${doc.abstract || null}, ${doc.content || null},
      ${JSON.stringify(doc.metadata || {})},
      to_tsvector('indonesian', ${doc.title + ' ' + (doc.abstract || '')}),
      CURRENT_TIMESTAMP
    )
    ON CONFLICT (id) DO UPDATE SET
      title = EXCLUDED.title,
      status = EXCLUDED.status,
      official_url = EXCLUDED.official_url,
      pdf_url = EXCLUDED.pdf_url,
      abstract = EXCLUDED.abstract,
      content = EXCLUDED.content,
      metadata = EXCLUDED.metadata,
      tsv_content = EXCLUDED.tsv_content,
      updated_at = CURRENT_TIMESTAMP;
  `;

  // Update relasi silsilah jika dokumen ini mengubah dokumen sebelumnya
  if (scraped.amendingTargetTitles.length > 0) {
    for (const target of scraped.amendingTargetTitles) {
      if (/16\s*tahun\s*2018/i.test(target)) {
        await client`
          UPDATE document_registry 
          SET status = 'AMENDED_PARTIALLY', amended_by = ${doc.id}, updated_at = CURRENT_TIMESTAMP
          WHERE id = 'perpres-16-2018';
        `;
      } else if (/12\s*tahun\s*2021/i.test(target) && /perpres/i.test(target)) {
        await client`
          UPDATE document_registry 
          SET status = 'AMENDED_PARTIALLY', amended_by = ${doc.id}, updated_at = CURRENT_TIMESTAMP
          WHERE id = 'perpres-12-2021';
        `;
      } else if (/12\s*tahun\s*2021/i.test(target) && /lkpp/i.test(target)) {
        await client`
          UPDATE document_registry 
          SET status = 'AMENDED_PARTIALLY', amended_by = ${doc.id}, updated_at = CURRENT_TIMESTAMP
          WHERE id = 'peraturan-lkpp-12-2021';
        `;
      }
    }
  }

  return doc;
}
