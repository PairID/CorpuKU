/**
 * Citation Validation Pipeline (CorpuKU Bangkom ASN)
 * 
 * Memverifikasi keabsahan setiap sitasi pasal dan regulasi yang dikutip dalam
 * modul, checklist SOP, dan kuis penilaian situasional (SJT).
 * 
 * Prinsip: Zero Fabrication & Grounded Raw Data
 * - Memastikan setiap pasal terdaftar di Document Registry aktif.
 * - Menolak draft materi jika memuat pasal fiktif / tidak terdaftar.
 * - Mendeteksi dan menolak sitasi ke aturan yang telah dicabut (Perpres 54/2010).
 * - Mencegah halusinasi hukum spesifik (misal: mengklaim Pasal 19 mengatur larangan merek,
 *   padahal larangan merek diatur pada Pasal 25 Perpres 16/2018 jo. 12/2021).
 */

import {
  type OnDemandCoursePackage,
  type LearningModule,
  type SituationalQuizItem
} from './on-demand-learning';
import {
  type LegalArticle,
  SEED_PBJ_ARTICLES,
  SEED_PBJ_DOCUMENTS
} from './regulatory-registry';

export interface ExtractedCitation {
  location: string;
  rawText: string;
  extractedArticle: string;
  normalizedDocRef?: string;
  isGrounded: boolean;
  status: 'VALID' | 'UNREGISTERED' | 'REPEALED_REGULATION' | 'MISATTRIBUTED';
  detailMessage: string;
}

export interface CitationValidationReport {
  isValid: boolean;
  totalCitationsChecked: number;
  validCitationsCount: number;
  invalidCitationsCount: number;
  citations: ExtractedCitation[];
  errors: string[];
  warnings: string[];
}

/**
 * Ekstraktor regex untuk menemukan sitasi pasal dalam teks hukum Indonesia
 */
export function extractArticleCitationsFromText(text: string, location: string): ExtractedCitation[] {
  if (!text) return [];

  const results: ExtractedCitation[] = [];

  // Pola Pasal \d+ (ayat \d+)? (huruf [a-z])?
  const regex = /pasal\s*(\d+)(?:\s*ayat\s*\(?(\d+)\)?)?(?:\s*huruf\s*([a-z]))?/gi;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    const rawMatch = match[0];
    const articleNum = `Pasal ${match[1]}`;
    const fullArticleStr = match[2]
      ? `${articleNum} ayat (${match[2]})`
      : articleNum;

    // Cek konteks sekitar untuk melihat nama regulasi yang dirujuk
    const startIdx = Math.max(0, match.index - 80);
    const endIdx = Math.min(text.length, match.index + rawMatch.length + 80);
    const surrounding = text.substring(startIdx, endIdx);

    let normalizedDoc = 'UNKNOWN';
    if (/54\s*(?:tahun|\/)\s*2010/i.test(surrounding)) {
      normalizedDoc = 'perpres-54-2010';
    } else if (/46\s*(?:tahun|\/)\s*2025/i.test(surrounding)) {
      normalizedDoc = 'perpres-46-2025';
    } else if (/16\s*(?:tahun|\/)\s*2018/i.test(surrounding)) {
      normalizedDoc = 'perpres-16-2018';
    } else if (/12\s*(?:tahun|\/)\s*2021/i.test(surrounding)) {
      normalizedDoc = 'perpres-12-2021';
    } else if (/lkpp\s*(?:no\.?)?\s*4/i.test(surrounding) || /4\s*(?:tahun|\/)\s*2024/i.test(surrounding)) {
      normalizedDoc = 'peraturan-lkpp-4-2024';
    } else if (/lkpp\s*(?:no\.?)?\s*12/i.test(surrounding)) {
      normalizedDoc = 'peraturan-lkpp-12-2021';
    } else if (/pbj|pengadaan/i.test(surrounding)) {
      normalizedDoc = 'perpres-16-2018';
    }

    results.push({
      location,
      rawText: rawMatch,
      extractedArticle: fullArticleStr,
      normalizedDocRef: normalizedDoc,
      isGrounded: false,
      status: 'UNREGISTERED',
      detailMessage: ''
    });
  }

  return results;
}

/**
 * Validasi Sitasi Pasal secara komprehensif terhadap basis data Document Registry
 */
export function validateArticleCitations(
  course: Partial<OnDemandCoursePackage>,
  knownArticles: LegalArticle[] = SEED_PBJ_ARTICLES
): CitationValidationReport {
  const report: CitationValidationReport = {
    isValid: true,
    totalCitationsChecked: 0,
    validCitationsCount: 0,
    invalidCitationsCount: 0,
    citations: [],
    errors: [],
    warnings: []
  };

  const citations: ExtractedCitation[] = [];

  // 1. Periksa Regulatory Grounding Meta
  const regs = course.curriculumMeta?.regulatoryGrounding || [];
  regs.forEach((r, idx) => {
    const extracted = extractArticleCitationsFromText(
      `${r.regulation} ${r.relevantArticles} ${r.relevanceExplanation}`,
      `curriculumMeta.regulatoryGrounding[${idx}]`
    );
    citations.push(...extracted);

    // Cek apakah ada rujukan eksplisit ke Perpres 54/2010
    if (/54\s*tahun\s*2010/i.test(r.regulation)) {
      report.errors.push(`Regulasi "${r.regulation}" telah dicabut oleh Perpres 16/2018 dan dilarang digunakan sebagai dasar hukum aktif.`);
      report.isValid = false;
    }
  });

  // 2. Periksa Modul Pembelajaran
  const modules = course.modules || [];
  modules.forEach((m: LearningModule, mIdx: number) => {
    const textToScan = `${m.moduleTitle} ${(m.learningPoints || []).join(' ')} ${m.contentBody || ''} ${(m.commonPitfalls || []).join(' ')}`;
    const extracted = extractArticleCitationsFromText(textToScan, `modules[${mIdx}].${m.moduleTitle}`);
    citations.push(...extracted);
  });

  // 3. Periksa Actionable Toolkits
  const checklists = course.actionableToolkits?.selfVerificationChecklist || [];
  checklists.forEach((c, cIdx) => {
    const textToScan = `${c.checkpoint} ${c.regulatoryBasis} ${c.verificationMethod}`;
    const extracted = extractArticleCitationsFromText(textToScan, `actionableToolkits.checklist[${cIdx}]`);
    citations.push(...extracted);
  });

  // 4. Periksa Situational Judgment Quiz
  const quizzes = course.situationalJudgmentQuiz || [];
  quizzes.forEach((q: SituationalQuizItem, qIdx: number) => {
    const optionsText = (q.options || []).map(o => `${o.text} ${o.reasoning || ''}`).join(' ');
    const textToScan = `${q.scenario} ${q.regulatoryReference} ${q.keyTakeaway} ${optionsText}`;
    const extracted = extractArticleCitationsFromText(textToScan, `quiz[${qIdx}].question_${q.questionNumber || qIdx + 1}`);
    citations.push(...extracted);
  });

  // 5. Validasi terhadap Known Articles & Aturan Pencabutan
  // Buat set nomor pasal otentik yang aktif
  const validArticleNumbers = new Set(
    knownArticles.filter(a => a.isActive).map(a => a.articleNumber.toLowerCase().trim())
  );

  for (const c of citations) {
    report.totalCitationsChecked++;
    const baseArtNumber = c.extractedArticle.split(' ayat')[0].toLowerCase().trim();

    // Kasus 1: Mengutip regulasi yang dicabut
    if (c.normalizedDocRef === 'perpres-54-2010') {
      c.status = 'REPEALED_REGULATION';
      c.isGrounded = false;
      c.detailMessage = `Sitasi ${c.extractedArticle} merujuk pada Perpres 54/2010 yang telah dicabut (REPEALED).`;
      report.errors.push(`[${c.location}] ${c.detailMessage}`);
      report.invalidCitationsCount++;
      report.isValid = false;
      continue;
    }

    // Kasus 2: Misattributed Article (Halusinasi LLM Pasal 19 untuk larangan merek)
    if (baseArtNumber === 'pasal 19' && /merek|brand|spesifikasi/i.test(c.location)) {
      c.status = 'MISATTRIBUTED';
      c.isGrounded = false;
      c.detailMessage = 'Pasal 19 Perpres 16/2018 mengatur Kualifikasi Penyedia, BUKAN larangan merek. Larangan penguncian merek diatur dalam Pasal 25.';
      report.errors.push(`[${c.location}] ${c.detailMessage}`);
      report.invalidCitationsCount++;
      report.isValid = false;
      continue;
    }

    // Kasus 3: Cek apakah pasal terdaftar di Known Articles
    if (validArticleNumbers.has(baseArtNumber)) {
      c.status = 'VALID';
      c.isGrounded = true;
      c.detailMessage = `Terverifikasi otentik pada Document Registry (${c.extractedArticle}).`;
      report.validCitationsCount++;
    } else {
      // Jika nomor pasal tidak ditemukan di registry naskah aktif
      c.status = 'UNREGISTERED';
      c.isGrounded = false;
      c.detailMessage = `Nomor pasal "${c.extractedArticle}" tidak ditemukan dalam naskah Document Registry PBJ aktif.`;
      report.errors.push(`[${c.location}] ${c.detailMessage}`);
      report.invalidCitationsCount++;
      report.isValid = false;
    }
  }

  report.citations = citations;
  return report;
}

/**
 * Menyusun RAG Grounding Context untuk disuntikkan ke prompt LLM Gemini
 */
export function buildRagPromptContext(
  retrievedArticles: LegalArticle[],
  filterRepealed: boolean = true
): string {
  const activeArticles = filterRepealed
    ? retrievedArticles.filter(a => a.isActive)
    : retrievedArticles;

  if (activeArticles.length === 0) {
    return 'TIDAK ADA REGULASI AKTIF DITEMUKAN.';
  }

  const sections = activeArticles.map(art => {
    const parentDoc = SEED_PBJ_DOCUMENTS.find(d => d.id === art.documentId);
    const docTitle = parentDoc ? parentDoc.title : art.documentId;
    const amendedNotice = parentDoc?.amendedBy ? ` [CATATAN: Telah diubah oleh ${parentDoc.amendedBy}]` : '';

    return `### ${docTitle}${amendedNotice}
- Ketentuan: ${art.articleNumber} ${art.articleTitle ? `(${art.articleTitle})` : ''}
- Naskah Resmi: "${art.substance}"`;
  });

  return `
LANDASAN HUKUM RESMI TERVERIFIKASI (GROUNDED RAW LEGAL TEXT):
Instruksi Wajib: Anda HANYA boleh mengutip ketentuan pasal yang tercantum di bawah ini.
DILARANG KERAS mengarang pasal fiktif atau merujuk peraturan yang telah dicabut.

${sections.join('\n\n')}
`;
}
