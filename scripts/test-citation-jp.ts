import { validateArticleCitations } from '../src/lib/citation-validator';
import { calculateDynamicDurationAndJp } from '../src/lib/dynamic-jp-calculator';
import { type OnDemandCoursePackage } from '../src/lib/on-demand-learning';

const mockCourse: Partial<OnDemandCoursePackage> = {
  curriculumMeta: {
    title: 'Akselerasi Kompetensi PPK',
    targetAudience: 'PPK',
    competencyLevel: 'C3-C4',
    estimatedDurationMinutes: 60,
    equivalentJp: 2,
    learningObjectives: ['Menganalisis', 'Mengaplikasikan', 'Mengevaluasi'],
    regulatoryGrounding: [
      { regulation: 'Perpres No. 16 Tahun 2018 jo. Perpres No. 12 Tahun 2021', relevantArticles: 'Pasal 25 dan Pasal 26', relevanceExplanation: 'Legalitas' }
    ]
  },
  modules: [
    {
      moduleOrder: 1,
      moduleTitle: 'Modul 1: Spek',
      contentBody: 'Uraian materi mengacu pada Pasal 25 mengenai larangan merek dan Pasal 26 mengenai HPS. ' + 'kata '.repeat(150),
      learningPoints: ['Point 1', 'Point 2'],
      commonPitfalls: ['Pitfall 1']
    },
    {
      moduleOrder: 2,
      moduleTitle: 'Modul 2: HPS',
      contentBody: 'Perhitungan HPS berlandaskan Pasal 26 dan Pasal 11 tugas PPK. ' + 'kata '.repeat(150),
      learningPoints: ['Point 1'],
      commonPitfalls: ['Pitfall 1']
    },
    {
      moduleOrder: 3,
      moduleTitle: 'Modul 3: Mitigasi',
      contentBody: 'Kepatuhan Pasal 20 larangan pemecahan paket dan Pasal 25. ' + 'kata '.repeat(150),
      learningPoints: ['Point 1'],
      commonPitfalls: ['Pitfall 1']
    }
  ],
  actionableToolkits: {
    selfVerificationChecklist: [
      { checkpoint: 'Cek 1', regulatoryBasis: 'Pasal 25 Perpres 16/2018', verificationMethod: 'Verifikasi', riskIfNotCompliant: 'Risiko' },
      { checkpoint: 'Cek 2', regulatoryBasis: 'Pasal 26 Perpres 16/2018', verificationMethod: 'Verifikasi', riskIfNotCompliant: 'Risiko' },
      { checkpoint: 'Cek 3', regulatoryBasis: 'Pasal 11 Perpres 16/2018', verificationMethod: 'Verifikasi', riskIfNotCompliant: 'Risiko' }
    ],
    hpsWorksheetStructure: { components: ['C1', 'C2', 'C3', 'C4'], guidelines: 'Panduan' }
  },
  situationalJudgmentQuiz: [
    {
      questionNumber: 1,
      scenario: 'Kasus larangan merek pada tender laptop',
      regulatoryReference: 'Pasal 25 Perpres 16/2018',
      keyTakeaway: 'Takeaway',
      options: [
        { key: 'A', text: 'Opsi A', isCorrect: false, reasoning: 'Alasan A' },
        { key: 'B', text: 'Opsi B', isCorrect: true, reasoning: 'Alasan B sesuai Pasal 25' },
        { key: 'C', text: 'Opsi C', isCorrect: false, reasoning: 'Alasan C' },
        { key: 'D', text: 'Opsi D', isCorrect: false, reasoning: 'Alasan D sesuai Pasal 20' }
      ]
    },
    {
      questionNumber: 2,
      scenario: 'Kasus biaya tidak terduga',
      regulatoryReference: 'Pasal 26 ayat 5 Perpres 16/2018',
      keyTakeaway: 'Takeaway',
      options: [
        { key: 'A', text: 'Opsi A', isCorrect: false, reasoning: 'Alasan A' },
        { key: 'B', text: 'Opsi B', isCorrect: true, reasoning: 'Alasan B sesuai Pasal 26 ayat (5)' },
        { key: 'C', text: 'Opsi C', isCorrect: false, reasoning: 'Alasan C' },
        { key: 'D', text: 'Opsi D', isCorrect: false, reasoning: 'Alasan D' }
      ]
    },
    {
      questionNumber: 3,
      scenario: 'Kasus kadaluwarsa HPS 28 hari kerja',
      regulatoryReference: 'Pasal 26 ayat 4 Perpres 16/2018',
      keyTakeaway: 'Takeaway',
      options: [
        { key: 'A', text: 'Opsi A', isCorrect: false, reasoning: 'Alasan A' },
        { key: 'B', text: 'Opsi B', isCorrect: true, reasoning: 'Alasan B sesuai Pasal 26 ayat (4)' },
        { key: 'C', text: 'Opsi C', isCorrect: false, reasoning: 'Alasan C' },
        { key: 'D', text: 'Opsi D', isCorrect: false, reasoning: 'Alasan D' }
      ]
    }
  ]
};

const report = validateArticleCitations(mockCourse);
console.log('Citation Validation Report:');
console.log('isValid:', report.isValid);
console.log('totalChecked:', report.totalCitationsChecked);
console.log('validCount:', report.validCitationsCount);
console.log('invalidCount:', report.invalidCitationsCount);
console.log('errors:', report.errors);

const jp = calculateDynamicDurationAndJp(mockCourse);
console.log('\nDynamic JP Breakdown:');
console.log('Total Minutes:', jp.totalCalculatedMinutes);
console.log('Equivalent JP:', jp.equivalentJp);
console.log('Breakdown:', jp);
