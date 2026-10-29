import { describe, expect, it } from 'vitest';
import {
  SEED_PBJ_DOCUMENTS,
  SEED_PBJ_ARTICLES,
  filterRepealedDocuments,
  searchRegulationsHybrid,
  calculateSemanticScore
} from '../../src/lib/regulatory-registry';
import {
  parseBpkContent,
  determineRegulationStatus
} from '../../src/lib/regulatory-crawler';
import {
  calculateDynamicDurationAndJp,
  applyDynamicJpToCourse,
  MINUTES_PER_JP
} from '../../src/lib/dynamic-jp-calculator';
import {
  validateArticleCitations,
  extractArticleCitationsFromText,
  buildRagPromptContext
} from '../../src/lib/citation-validator';
import { type OnDemandCoursePackage } from '../../src/lib/on-demand-learning';

describe('R1. Document Registry & Version Control Schema', () => {
  it('models PBJ regulatory lineage accurately across Perpres and LKPP regulations', () => {
    const p16 = SEED_PBJ_DOCUMENTS.find(d => d.id === 'perpres-16-2018');
    const p12 = SEED_PBJ_DOCUMENTS.find(d => d.id === 'perpres-12-2021');
    const p46 = SEED_PBJ_DOCUMENTS.find(d => d.id === 'perpres-46-2025');
    const lkpp12 = SEED_PBJ_DOCUMENTS.find(d => d.id === 'peraturan-lkpp-12-2021');
    const lkpp4 = SEED_PBJ_DOCUMENTS.find(d => d.id === 'peraturan-lkpp-4-2024');
    const p54 = SEED_PBJ_DOCUMENTS.find(d => d.id === 'perpres-54-2010');

    expect(p16?.status).toBe('AMENDED_PARTIALLY');
    expect(p12?.status).toBe('AMENDED_PARTIALLY');
    expect(p46?.status).toBe('ACTIVE');
    expect(p46?.docYear).toBe(2025);
    expect(p46?.docNumber).toBe('46');

    expect(lkpp12?.status).toBe('AMENDED_PARTIALLY');
    expect(lkpp4?.status).toBe('ACTIVE');
    expect(lkpp4?.docYear).toBe(2024);
    expect(lkpp4?.docNumber).toBe('4');

    expect(p54?.status).toBe('REPEALED');
    expect(p54?.supersededBy).toBe('perpres-16-2018');
  });

  it('stores authentic legal articles for PBJ key provisions', () => {
    const art11 = SEED_PBJ_ARTICLES.find(a => a.id === 'perpres-16-2018-pasal-11');
    const art20 = SEED_PBJ_ARTICLES.find(a => a.id === 'perpres-16-2018-pasal-20');
    const art25 = SEED_PBJ_ARTICLES.find(a => a.id === 'perpres-16-2018-pasal-25');
    const art26 = SEED_PBJ_ARTICLES.find(a => a.id === 'perpres-16-2018-pasal-26');
    const art46 = SEED_PBJ_ARTICLES.find(a => a.id === 'perpres-46-2025-pasal-1');

    expect(art11?.articleNumber).toBe('Pasal 11');
    expect(art11?.articleTitle).toBe('Tugas dan Kewenangan PPK');
    expect(art11?.substance).toContain('tugas dan wewenang');

    expect(art20?.articleNumber).toBe('Pasal 20');
    expect(art20?.substance).toContain('dilarang memecah Pengadaan');

    expect(art25?.articleNumber).toBe('Pasal 25');
    expect(art25?.substance).toContain('katalog elektronik');

    expect(art26?.articleNumber).toBe('Pasal 26');
    expect(art26?.substance).toContain('28 (dua puluh delapan) hari kerja');
    expect(art26?.substance).toContain('contingency');

    expect(art46?.documentId).toBe('perpres-46-2025');
    expect(art46?.isActive).toBe(true);
  });
});

describe('R2. Automated Regulatory Bot Crawler (JDIH BPK Ingestion)', () => {
  it('correctly determines regulation status from BPK keywords', () => {
    const activeResult = determineRegulationStatus('Status Berlaku', ['Mengubah : PERPRES No. 12 Tahun 2021']);
    expect(activeResult.status).toBe('ACTIVE');
    expect(activeResult.isAmending).toBe(true);

    const repealedResult = determineRegulationStatus('Status Dicabut', ['Dicabut oleh Perpres 16/2018']);
    expect(repealedResult.status).toBe('REPEALED');
  });

  it('parses Perpres No. 46 Tahun 2025 BPK content deterministically', () => {
    const sampleHtmlText = `
      Peraturan Presiden (Perpres) Nomor 46 Tahun 2025 Perubahan Kedua atas Peraturan Presiden Nomor 16 Tahun 2018 tentang Pengadaan Barang/Jasa Pemerintah
      MATERI POKOK PERATURAN
      Abstrak
      Perpres ini mengatur mengenai perubahan beberapa ketentuan dalam Perpres Nomor 16 Tahun 2018 tentang Pengadaan Barang/Jasa Pemerintah.
      METADATA PERATURAN
      Nomor 46
      Tahun 2025
      Tanggal Berlaku 30 April 2025
      Status Berlaku
      STATUS PERATURAN
      Mengubah :
      PERPRES No. 12 Tahun 2021 tentang Perubahan atas Peraturan Presiden Nomor 16 Tahun 2018
      PERPRES No. 16 Tahun 2018 tentang Pengadaan Barang/Jasa Pemerintah
    `;

    const parsed = parseBpkContent(
      'Peraturan Presiden (Perpres) Nomor 46 Tahun 2025',
      'https://peraturan.bpk.go.id/Details/318647/perpres-no-46-tahun-2025',
      sampleHtmlText,
      'https://peraturan.bpk.go.id/Read/380134/Perpres46_2025.pdf'
    );

    expect(parsed.docNumber).toBe('46');
    expect(parsed.docYear).toBe(2025);
    expect(parsed.docType).toBe('PERPRES');
    expect(parsed.issuer).toBe('Presiden Republik Indonesia');
    expect(parsed.inferredStatus).toBe('ACTIVE');
    expect(parsed.amendingTargetTitles.length).toBeGreaterThanOrEqual(1);
    expect(parsed.amendingTargetTitles.some(t => t.includes('12 Tahun 2021'))).toBe(true);
    expect(parsed.pdfUrl).toBe('https://peraturan.bpk.go.id/Read/380134/Perpres46_2025.pdf');
  });

  it('parses Peraturan LKPP No. 4 Tahun 2024 BPK content deterministically', () => {
    const sampleHtmlText = `
      Peraturan Lembaga Kebijakan Pengadaan Barang/Jasa Pemerintah Nomor 4 Tahun 2024 tentang Perubahan Atas Peraturan LKPP Nomor 12 Tahun 2021
      MATERI POKOK PERATURAN
      Abstrak
      Peraturan ini mengubah beberapa ketentuan dalam Peraturan LKPP Nomor 12 Tahun 2021 tentang Pedoman Pelaksanaan Pengadaan Barang/Jasa Pemerintah melalui Penyedia yaitu bagian Lampiran III dan Lampiran VI.
      METADATA PERATURAN
      Nomor 4
      Tahun 2024
      Tanggal Berlaku 18 Oktober 2024
      Status Berlaku
      STATUS PERATURAN
      Mengubah :
      Peraturan LKPP No. 12 Tahun 2021 tentang Pedoman Pelaksanaan Pengadaan Barang/Jasa Pemerintah Melalui Penyedia
    `;

    const parsed = parseBpkContent(
      'Peraturan Lembaga Kebijakan Pengadaan Barang/Jasa Pemerintah Nomor 4 Tahun 2024',
      'https://peraturan.bpk.go.id/Details/314291/peraturan-lkpp-no-4-tahun-2024',
      sampleHtmlText,
      'https://peraturan.bpk.go.id/Read/375218/Perka_LKPP_4_2024.pdf'
    );

    expect(parsed.docNumber).toBe('4');
    expect(parsed.docYear).toBe(2024);
    expect(parsed.docType).toBe('PERATURAN_LKPP');
    expect(parsed.issuer).toBe('Lembaga Kebijakan Pengadaan Barang/Jasa Pemerintah');
    expect(parsed.inferredStatus).toBe('ACTIVE');
    expect(parsed.amendingTargetTitles.some(t => t.includes('12 Tahun 2021'))).toBe(true);
  });
});

describe('R3. Hybrid Search & Conflict Detection Engine', () => {
  it('strictly eliminates REPEALED regulations from active candidate pool', () => {
    const filtered = filterRepealedDocuments(SEED_PBJ_DOCUMENTS);
    expect(filtered.some(d => d.status === 'REPEALED')).toBe(false);
    expect(filtered.some(d => d.id === 'perpres-54-2010')).toBe(false);
    expect(filtered.some(d => d.id === 'perpres-46-2025')).toBe(true);
  });

  it('ranks grounded PBJ articles by exact match and semantic score', async () => {
    const query = 'penyusunan HPS dan survei harga pasar biaya tak terduga';
    const results = await searchRegulationsHybrid(query, { limit: 3 });

    expect(results.length).toBeGreaterThan(0);
    // Pasal 26 mengatur HPS dan larangan biaya tak terduga
    const topResult = results[0];
    expect(topResult.articleNumber).toBe('Pasal 26');
    expect(topResult.status).not.toBe('REPEALED');
    expect(topResult.combinedScore).toBeGreaterThan(0.5);
  });

  it('finds specification and brand locking provisions when searching for brand restrictions', async () => {
    const query = 'larangan penguncian merek spesifikasi teknis tender';
    const results = await searchRegulationsHybrid(query, { limit: 3 });

    expect(results.length).toBeGreaterThan(0);
    const hasPasal25 = results.some(r => r.articleNumber === 'Pasal 25');
    expect(hasPasal25).toBe(true);
  });

  it('calculates domain-weighted semantic scores accurately', () => {
    const score1 = calculateSemanticScore('hps survei pasar', 'Penyusunan HPS menggunakan data survei pasar');
    const score2 = calculateSemanticScore('hps survei pasar', 'Rapat umum dinas kepegawaian');
    expect(score1).toBeGreaterThan(score2);
  });
});

describe('R4. Dynamic Syllabus & Dynamic JP Calculator', () => {
  const sampleCourse: Partial<OnDemandCoursePackage> = {
    curriculumMeta: {
      title: 'Akselerasi Pengadaan',
      targetAudience: 'PPK',
      competencyLevel: 'C3-C4',
      estimatedDurationMinutes: 0,
      equivalentJp: 0,
      learningObjectives: ['Menganalisis', 'Mengaplikasikan', 'Mengevaluasi'],
      regulatoryGrounding: []
    },
    modules: [
      {
        moduleOrder: 1,
        moduleTitle: 'Penyusunan Spesifikasi Teknis',
        contentBody: 'Kata '.repeat(180),
        learningPoints: ['Point 1', 'Point 2'],
        commonPitfalls: ['Pitfall 1', 'Pitfall 2']
      },
      {
        moduleOrder: 2,
        moduleTitle: 'Teknik Perhitungan HPS',
        contentBody: 'Kata '.repeat(180),
        learningPoints: ['Point 1', 'Point 2'],
        commonPitfalls: ['Pitfall 1']
      },
      {
        moduleOrder: 3,
        moduleTitle: 'Mitigasi Risiko Pengadaan',
        contentBody: 'Kata '.repeat(180),
        learningPoints: ['Point 1'],
        commonPitfalls: ['Pitfall 1']
      }
    ],
    actionableToolkits: {
      selfVerificationChecklist: [
        { checkpoint: 'C1', regulatoryBasis: 'Pasal 25', verificationMethod: 'V1', riskIfNotCompliant: 'R1' },
        { checkpoint: 'C2', regulatoryBasis: 'Pasal 26', verificationMethod: 'V2', riskIfNotCompliant: 'R2' },
        { checkpoint: 'C3', regulatoryBasis: 'Pasal 20', verificationMethod: 'V3', riskIfNotCompliant: 'R3' },
        { checkpoint: 'C4', regulatoryBasis: 'Pasal 11', verificationMethod: 'V4', riskIfNotCompliant: 'R4' }
      ],
      hpsWorksheetStructure: {
        components: ['Item', 'Vol', 'Harga Satuan', 'Subtotal', 'PPN', 'Total'],
        guidelines: 'Gunakan spreadsheet resmi'
      }
    },
    situationalJudgmentQuiz: [
      {
        questionNumber: 1,
        scenario: 'Kasus 1 penguncian merek laptop',
        regulatoryReference: 'Pasal 25 Perpres 16/2018',
        keyTakeaway: 'Takeaway 1',
        options: [{ key: 'A', text: 'Text', isCorrect: true, reasoning: 'Alasan' }]
      },
      {
        questionNumber: 2,
        scenario: 'Kasus 2 pos biaya cadangan HPS',
        regulatoryReference: 'Pasal 26 ayat 5 Perpres 16/2018',
        keyTakeaway: 'Takeaway 2',
        options: [{ key: 'A', text: 'Text', isCorrect: true, reasoning: 'Alasan' }]
      },
      {
        questionNumber: 3,
        scenario: 'Kasus 3 kadaluwarsa HPS 28 hari kerja',
        regulatoryReference: 'Pasal 26 ayat 4 Perpres 16/2018',
        keyTakeaway: 'Takeaway 3',
        options: [{ key: 'A', text: 'Text', isCorrect: true, reasoning: 'Alasan' }]
      }
    ]
  };

  it('calculates dynamic duration based on 45 minutes per JP (LAN RI standard)', () => {
    expect(MINUTES_PER_JP).toBe(45);
    const breakdown = calculateDynamicDurationAndJp(sampleCourse);

    expect(breakdown.totalCalculatedMinutes).toBeGreaterThan(60);
    expect(breakdown.equivalentJp).toBeGreaterThanOrEqual(2);
    expect(breakdown.moduleReadingMinutes).toBeGreaterThan(0);
    expect(breakdown.checklistVerificationMinutes).toBe(16); // 4 checklists x 4 mins
    expect(breakdown.hpsWorksheetMinutes).toBe(8);
    expect(breakdown.situationalQuizMinutes).toBe(15); // 3 quizzes x 5 mins
  });

  it('updates course package curriculumMeta duration and JP dynamically', () => {
    const updated = applyDynamicJpToCourse(sampleCourse as OnDemandCoursePackage);
    expect(updated.curriculumMeta.estimatedDurationMinutes).toBeGreaterThan(60);
    expect(updated.curriculumMeta.equivalentJp).toBeGreaterThanOrEqual(2);
  });
});

describe('R5. RAG Grounding & Citation Validation Pipeline', () => {
  it('extracts pasal citations accurately from Indonesian legal text', () => {
    const text = 'Berdasarkan Pasal 25 ayat (2) dan Pasal 26 ayat (4) Perpres 16/2018 jo. Perpres 12/2021';
    const extracted = extractArticleCitationsFromText(text, 'test');

    expect(extracted.length).toBe(2);
    expect(extracted[0].extractedArticle).toBe('Pasal 25 ayat (2)');
    expect(extracted[1].extractedArticle).toBe('Pasal 26 ayat (4)');
    expect(extracted[0].normalizedDocRef).toBe('perpres-16-2018');
  });

  it('approves course when all citations are grounded in active legal articles', () => {
    const validCourse: Partial<OnDemandCoursePackage> = {
      curriculumMeta: {
        title: 'Pelatihan PBJ Akuntabel',
        targetAudience: 'PPK',
        competencyLevel: 'C3-C4',
        estimatedDurationMinutes: 60,
        equivalentJp: 2,
        learningObjectives: ['Menganalisis', 'Mengaplikasikan', 'Mengevaluasi'],
        regulatoryGrounding: [
          {
            regulation: 'Perpres No. 16 Tahun 2018 jo. Perpres No. 12 Tahun 2021',
            relevantArticles: 'Pasal 25 dan Pasal 26',
            relevanceExplanation: 'Legalitas utama'
          }
        ]
      },
      modules: [
        {
          moduleOrder: 1,
          moduleTitle: 'Spesifikasi',
          contentBody: 'Ketentuan Pasal 25 mengenai larangan mengunci merek dan Pasal 11 tugas PPK.',
          learningPoints: ['Point 1'],
          commonPitfalls: ['Pitfall 1']
        }
      ],
      actionableToolkits: {
        selfVerificationChecklist: [
          { checkpoint: 'Cek 1', regulatoryBasis: 'Pasal 25 Perpres 16/2018', verificationMethod: 'V1', riskIfNotCompliant: 'R1' }
        ],
        hpsWorksheetStructure: { components: ['C1', 'C2', 'C3', 'C4'], guidelines: 'G' }
      },
      situationalJudgmentQuiz: [
        {
          questionNumber: 1,
          scenario: 'Kasus',
          regulatoryReference: 'Pasal 26 Perpres 16/2018',
          keyTakeaway: 'Takeaway',
          options: [{ key: 'A', text: 'T', isCorrect: true, reasoning: 'Sesuai Pasal 26' }]
        }
      ]
    };

    const report = validateArticleCitations(validCourse);
    expect(report.isValid).toBe(true);
    expect(report.errors.length).toBe(0);
    expect(report.validCitationsCount).toBeGreaterThanOrEqual(4);
  });

  it('rejects course citing fictitious/unregistered article numbers (Zero Fabrication check)', () => {
    const courseWithFabrication: Partial<OnDemandCoursePackage> = {
      curriculumMeta: {
        title: 'Pelatihan PBJ Akuntabel',
        targetAudience: 'PPK',
        competencyLevel: 'C3-C4',
        estimatedDurationMinutes: 60,
        equivalentJp: 2,
        learningObjectives: ['Menganalisis', 'Mengaplikasikan', 'Mengevaluasi'],
        regulatoryGrounding: [
          {
            regulation: 'Perpres No. 16 Tahun 2018',
            relevantArticles: 'Pasal 999 tentang Ketentuan Fiktif',
            relevanceExplanation: 'Pasal karangan'
          }
        ]
      }
    };

    const report = validateArticleCitations(courseWithFabrication);
    expect(report.isValid).toBe(false);
    expect(report.invalidCitationsCount).toBeGreaterThan(0);
    expect(report.errors.some(e => e.includes('Pasal 999'))).toBe(true);
  });

  it('rejects course citing repealed regulation Perpres 54/2010', () => {
    const courseWithRepealed: Partial<OnDemandCoursePackage> = {
      curriculumMeta: {
        title: 'Pelatihan PBJ',
        targetAudience: 'PPK',
        competencyLevel: 'C3-C4',
        estimatedDurationMinutes: 60,
        equivalentJp: 2,
        learningObjectives: ['Menganalisis', 'Mengaplikasikan', 'Mengevaluasi'],
        regulatoryGrounding: [
          {
            regulation: 'Perpres No. 54 Tahun 2010 tentang Pengadaan Barang/Jasa Pemerintah',
            relevantArticles: 'Pasal 19 Spesifikasi Teknis',
            relevanceExplanation: 'Aturan lama'
          }
        ]
      }
    };

    const report = validateArticleCitations(courseWithRepealed);
    expect(report.isValid).toBe(false);
    expect(report.errors.some(e => e.includes('54/2010'))).toBe(true);
  });

  it('builds RAG prompt context strictly with active regulations and articles', () => {
    const promptContext = buildRagPromptContext(SEED_PBJ_ARTICLES);
    expect(promptContext).toContain('LANDASAN HUKUM RESMI TERVERIFIKASI');
    expect(promptContext).toContain('Pasal 25');
    expect(promptContext).toContain('Pasal 26');
    expect(promptContext).not.toContain('Perpres Nomor 54 Tahun 2010');
  });
});

describe('R7. External Document Sources & Anna Archive Reference Links', () => {
  it('correctly constructs Anna Archive shadow query URL for book research', () => {
    const query = 'Pengadaan Barang dan Jasa Pemerintah';
    const encoded = encodeURIComponent(query);
    const annasUrl = `https://annas-archive.org/search?q=${encoded}`;

    expect(annasUrl).toContain('https://annas-archive.org/search?q=');
    expect(annasUrl).toContain('Pengadaan');
  });

  it('filters active local regulations and excludes repealed regulations', () => {
    const selectedStatuses = ['ACTIVE', 'AMENDED_PARTIALLY'];
    const activeDocuments = SEED_PBJ_DOCUMENTS.filter(doc => selectedStatuses.includes(doc.status));

    expect(activeDocuments.length).toBeGreaterThanOrEqual(4);
    expect(activeDocuments.some(d => d.id === 'perpres-46-2025')).toBe(true);
    expect(activeDocuments.some(d => d.id === 'peraturan-lkpp-4-2024')).toBe(true);
    expect(activeDocuments.some(d => d.id === 'perpres-54-2010')).toBe(false);
  });
});
