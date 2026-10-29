/**
 * On-Demand AI Generated Learning Engine (CorpuKU Bangkom ASN)
 * 
 * Menghasilkan konten pembelajaran berbasis masalah tempat kerja ASN secara deterministik,
 * berlandaskan regulasi otentik (Zero Fabrication), taksonomi Bloom C3-C4,
 * checklist SOP verifikasi mandiri, dan kuis penilaian situasional (Situational Judgment Test).
 */

import { applyDynamicJpToCourse } from './dynamic-jp-calculator';
import { validateArticleCitations, buildRagPromptContext } from './citation-validator';
import { searchRegulationsHybrid } from './regulatory-registry';

export interface RegulatoryGrounding {
    regulation: string;
    relevantArticles: string;
    relevanceExplanation: string;
}

export interface CurriculumMeta {
    title: string;
    targetAudience: string;
    competencyLevel: string;
    estimatedDurationMinutes: number;
    equivalentJp: number;
    learningObjectives: string[];
    regulatoryGrounding: RegulatoryGrounding[];
}

export interface LearningModule {
    moduleOrder: number;
    moduleTitle: string;
    learningPoints: string[];
    contentBody: string;
    commonPitfalls: string[];
}

export interface ChecklistCheckpoint {
    checkpoint: string;
    regulatoryBasis: string;
    verificationMethod: string;
    riskIfNotCompliant: string;
}

export interface HpsWorksheetStructure {
    components: string[];
    guidelines: string;
}

export interface ActionableToolkits {
    selfVerificationChecklist: ChecklistCheckpoint[];
    hpsWorksheetStructure: HpsWorksheetStructure;
}

export interface SituationalQuizOption {
    key: "A" | "B" | "C" | "D" | string;
    text: string;
    isCorrect: boolean;
    reasoning: string;
}

export interface SituationalQuizItem {
    questionNumber: number;
    scenario: string;
    options: SituationalQuizOption[];
    regulatoryReference: string;
    keyTakeaway: string;
}

export interface OnDemandCoursePackage {
    curriculumMeta: CurriculumMeta;
    modules: LearningModule[];
    actionableToolkits: ActionableToolkits;
    situationalJudgmentQuiz: SituationalQuizItem[];
    pipelineMetadata?: {
        stage1Model?: string;
        stage2Model?: string;
        generatedAt: string;
        totalElapsedSeconds: number;
    };
}

export interface QualityAuditReport {
    isValid: boolean;
    score: number;
    checks: string[];
    errors: string[];
}

// Pool model Gemini dengan fallback otomatis
export const GEMINI_MODEL_POOL = [
    "gemini-3.1-flash-lite",
    "gemini-flash-latest",
    "gemini-3.5-flash-lite",
    "gemini-3.5-flash",
    "gemini-3.8-flash"
];

/**
 * Memanggil Gemini API dengan retry dan model fallback pool
 */
export async function callGeminiJson<T>(
    systemPrompt: string,
    userPrompt: string,
    apiKey: string,
    maxTokens: number = 4096
): Promise<{ data: T; modelUsed: string }> {
    let lastError = "Tidak ada model yang merespon";

    for (const model of GEMINI_MODEL_POOL) {
        try {
            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    signal: AbortSignal.timeout(40000),
                    body: JSON.stringify({
                        contents: [
                            {
                                role: "user",
                                parts: [
                                    { text: systemPrompt },
                                    { text: userPrompt }
                                ]
                            }
                        ],
                        generationConfig: {
                            temperature: 0.25,
                            topP: 0.85,
                            maxOutputTokens: maxTokens,
                            responseMimeType: "application/json"
                        }
                    })
                }
            );

            const result = await response.json();
            if (result.error) {
                lastError = `[${model}] ${result.error.message}`;
                continue;
            }

            const rawText = result.candidates?.[0]?.content?.parts?.[0]?.text;
            if (!rawText) {
                lastError = `[${model}] Respon teks kosong`;
                continue;
            }

            const cleaned = rawText.replace(/```json/gi, "").replace(/```/g, "").trim();
            const parsed = JSON.parse(cleaned) as T;
            return { data: parsed, modelUsed: model };
        } catch (err: unknown) {
            lastError = `[${model}] Exception: ${err instanceof Error ? err.message : String(err)}`;
        }
    }

    throw new Error(`Semua endpoint Gemini gagal merespon. Detail: ${lastError}`);
}

/**
 * Validasi Standar Mutu Konten Pembelajaran ASN (Quality Gate)
 * Memeriksa kepatuhan terhadap Taksonomi Bloom C3-C4, Zero Fabrication regulasi & pasal,
 * kelengkapan modul praktis, checklist SOP, dan studi kasus situasional.
 */
export function verifyCourseQuality(course: Partial<OnDemandCoursePackage>): QualityAuditReport {
    const report: QualityAuditReport = {
        isValid: true,
        score: 100,
        checks: [],
        errors: []
    };

    // 1. Verifikasi Metadata Kurikulum
    const meta = course.curriculumMeta;
    if (!meta || !meta.title || !meta.learningObjectives || meta.learningObjectives.length < 3) {
        report.isValid = false;
        report.score -= 25;
        report.errors.push("Metadata kurikulum tidak lengkap atau tujuan pembelajaran kurang dari 3 butir.");
    } else {
        const hasBloomVerbs = meta.learningObjectives.some(obj =>
            /menganalisis|menerapkan|mengaplikasikan|mengevaluasi|menyusun|merumuskan|mengidentifikasi|memvalidasi/i.test(obj)
        );
        if (!hasBloomVerbs) {
            report.score -= 10;
            report.errors.push("Tujuan pembelajaran kurang mencerminkan kata kerja operasional Taksonomi Bloom C3-C4.");
        } else {
            report.checks.push(`Metadata Kurikulum Lengkap: "${meta.title}" (${meta.equivalentJp} JP, Level ${meta.competencyLevel || "C3-C4"})`);
        }
    }

    // 2. Verifikasi Integritas Regulasi (Zero Fabrication)
    const regs = meta?.regulatoryGrounding || [];
    if (regs.length === 0) {
        report.isValid = false;
        report.score -= 25;
        report.errors.push("Tidak ada landasan regulasi yang dicantumkan.");
    } else {
        // Cek nama regulasi otentik hukum positif PBJP
        const hasValidRegulation = regs.some(r =>
            r.regulation && (
                r.regulation.toLowerCase().includes("16") ||
                r.regulation.toLowerCase().includes("12") ||
                r.regulation.toLowerCase().includes("lkpp")
            )
        );
        if (!hasValidRegulation) {
            report.isValid = false;
            report.score -= 20;
            report.errors.push("Rujukan regulasi tidak memuat regulasi sah terkait PBJP (Perpres 16/2018 jo. 12/2021 atau Peraturan LKPP).");
        }

        // Cek apakah mengutip regulasi yang sudah dicabut sebagai regulasi aktif
        const citesRevokedReg = regs.some(r =>
            /perpres\s*(no\.?)?\s*54\s*tahun\s*2010/i.test(r.regulation) &&
            !/dicabut|perubahan|sebelumnya/i.test(r.regulation)
        );
        if (citesRevokedReg) {
            report.isValid = false;
            report.score -= 25;
            report.errors.push("Terdeteksi rujukan regulasi yang sudah dicabut (Perpres 54/2010) sebagai regulasi aktif.");
        }

        // Cek kelengkapan pasal dan relevansi
        const incompleteArticles = regs.some(r => !r.relevantArticles || !r.relevanceExplanation);
        if (incompleteArticles) {
            report.score -= 10;
            report.errors.push("Rincian pasal atau uraian relevansi pada landasan regulasi belum lengkap.");
        } else if (hasValidRegulation && !citesRevokedReg) {
            report.checks.push(`Landasan Regulasi Sah: ${regs.length} regulasi otentik terverifikasi.`);
        }
    }

    // 3. Verifikasi Modul Pembelajaran Terapan
    const modules = course.modules || [];
    if (modules.length < 3) {
        report.isValid = false;
        report.score -= 20;
        report.errors.push(`Jumlah modul terapan kurang dari standar minimum (${modules.length} < 3 modul).`);
    } else {
        const totalWords = modules.reduce((acc, m) => acc + (m.contentBody?.split(/\s+/).length || 0), 0);
        const hasIncompleteModule = modules.some(m =>
            !m.moduleTitle ||
            !m.learningPoints || m.learningPoints.length === 0 ||
            !m.commonPitfalls || m.commonPitfalls.length === 0 ||
            (m.contentBody?.split(/\s+/).length || 0) < 50
        );

        if (totalWords < 250 || hasIncompleteModule) {
            report.score -= 15;
            report.errors.push("Uraian materi modul terlalu singkat (< 250 kata total) atau rincian modul belum lengkap.");
        } else {
            report.checks.push(`Modul Pembelajaran Terapan: ${modules.length} modul terstruktur (~${totalWords} kata panduan kerja).`);
        }
    }

    // 4. Verifikasi Actionable Toolkits
    const toolkits = course.actionableToolkits;
    const checklists = toolkits?.selfVerificationChecklist || [];
    const hpsComponents = toolkits?.hpsWorksheetStructure?.components || [];
    const incompleteChecklist = checklists.some(c =>
        !c.checkpoint || !c.regulatoryBasis || !c.verificationMethod || !c.riskIfNotCompliant
    );

    if (checklists.length < 3 || hpsComponents.length < 4 || incompleteChecklist) {
        report.isValid = false;
        report.score -= 15;
        report.errors.push("Checklist SOP verifikasi mandiri (< 3 butir atau field kosong) atau struktur kertas kerja (< 4 komponen) belum memadai.");
    } else {
        report.checks.push(`Actionable Toolkits: ${checklists.length} butir checklist SOP & struktur kertas kerja (${hpsComponents.length} komponen).`);
    }

    // 5. Verifikasi Situational Judgment Quiz
    const quizzes = course.situationalJudgmentQuiz || [];
    if (quizzes.length < 3) {
        report.isValid = false;
        report.score -= 20;
        report.errors.push(`Soal Situational Judgment Test kurang dari standar (${quizzes.length} < 3 butir).`);
    } else {
        let validStructure = true;
        let hasFabricatedArticle = false;
        let incompleteReasoning = false;

        for (const q of quizzes) {
            if (!q.scenario || q.scenario.trim().length < 40) validStructure = false;
            if (!q.options || q.options.length !== 4) validStructure = false;
            const correctCount = q.options?.filter(o => o.isCorrect).length || 0;
            if (correctCount !== 1) validStructure = false;
            if (!q.regulatoryReference || q.regulatoryReference.trim().length < 5) validStructure = false;
            if (!q.keyTakeaway || q.keyTakeaway.trim().length < 10) validStructure = false;

            for (const opt of q.options || []) {
                if (!opt.text || opt.text.trim().length < 5) validStructure = false;
                if (!opt.reasoning || opt.reasoning.trim().length < 10) incompleteReasoning = true;
            }

            // Zero Fabrication: Cek kesalahan spesifik mencampuradukkan Pasal 19 untuk larangan merek PBJ
            if (/merek|brand/i.test(q.scenario) || /merek|brand/i.test(q.keyTakeaway)) {
                if (/pasal\s*19\b/i.test(q.regulatoryReference)) {
                    hasFabricatedArticle = true;
                }
            }
        }

        if (!validStructure) {
            report.isValid = false;
            report.score -= 20;
            report.errors.push("Struktur soal situational quiz tidak valid (wajib 4 opsi lengkap, tepat 1 jawaban benar, skenario kontekstual).");
        }
        if (incompleteReasoning) {
            report.score -= 10;
            report.errors.push("Sebagian opsi jawaban kuis belum dilengkapi 'reasoning' analisis yang memadai.");
        }
        if (hasFabricatedArticle) {
            report.isValid = false;
            report.score -= 25;
            report.errors.push("Terdeteksi kesalahan rujukan regulasi pada kuis (larangan merek diatur dalam Pasal 25 Perpres 16/2018 jo. 12/2021, bukan Pasal 19).");
        }

        if (validStructure && !incompleteReasoning && !hasFabricatedArticle) {
            report.checks.push(`Situational Judgment Quiz: ${quizzes.length} butir studi kasus dilematis C3-C4 tervalidasi.`);
        }
    }

    // 6. Verifikasi Sitasi Pasal Terdaftar (Citation Validation)
    const citationReport = validateArticleCitations(course);
    if (!citationReport.isValid) {
        report.isValid = false;
        report.score -= Math.min(30, citationReport.invalidCitationsCount * 15);
        for (const err of citationReport.errors) {
            if (!report.errors.some(e => e.includes(err) || err.includes(e))) {
                report.errors.push(err);
            }
        }
    } else if (citationReport.validCitationsCount > 0) {
        report.checks.push(`Citation Validation: ${citationReport.validCitationsCount} sitasi pasal otentik terverifikasi.`);
    }

    report.score = Math.max(0, report.score);
    return report;
}

/**
 * Pipeline Penghasil Pelatihan On-Demand AI
 * Menjalankan generasi 2 tahap (Stage 1: Blueprint + Modul + Toolkits, Stage 2: Situational Quiz)
 */
export async function generateOnDemandCourse(
    workplaceProblem: string,
    apiKeyOverride?: string
): Promise<{ course: OnDemandCoursePackage; audit: QualityAuditReport }> {
    const apiKey = apiKeyOverride || process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error("GEMINI_API_KEY belum dikonfigurasi.");
    }

    if (!workplaceProblem || workplaceProblem.trim().length < 20) {
        throw new Error("Uraian masalah tempat kerja terlalu singkat (minimal 20 karakter).");
    }

    const tStart = Date.now();

    // RAG Grounding Retrieval dari basis data Document Registry (eliminasi REPEALED otomatis)
    const retrieved = await searchRegulationsHybrid(workplaceProblem, { limit: 4 });
    const groundingArticles = retrieved
        .filter(r => r.substance && r.articleNumber)
        .map(r => ({
            id: r.articleId || `${r.documentId}-${r.articleNumber}`,
            documentId: r.documentId,
            articleNumber: r.articleNumber!,
            articleTitle: undefined,
            substance: r.substance!,
            isActive: r.status === 'ACTIVE' || r.status === 'AMENDED_PARTIALLY'
        }));
    const ragContext = buildRagPromptContext(groundingArticles);

    // Stage 1: Blueprint Kurikulum, Modul Operasional, & Toolkits
    const stage1SystemPrompt = `
Anda adalah Senior Instructional Designer LAN RI / LKPP dan Ahli Hukum Pengadaan Barang/Jasa Pemerintah (PBJP).
Tugas Anda: Merancang blueprint kurikulum dan modul pembelajaran terapan berstandar tinggi berdasarkan masalah kinerja nyata pegawai ASN.

${ragContext}

ATURAN WAJIB & INTEGRITAS DATA (ZERO FABRICATION):
1. Landasan regulasi HARUS otentik dan berlaku sah di Indonesia:
   - Perpres No. 16 Tahun 2018 jo. Perpres No. 12 Tahun 2021 dan Perpres No. 46 Tahun 2025:
     * Pasal 11: Tugas dan Kewenangan PPK.
     * Pasal 25: Spesifikasi Teknis/KAK & Larangan Penguncian Merek (Pengecualian penyebutan merek HANYA untuk suku cadang, komponen, bagian dari satu sistem yang sudah ada, atau katalog elektronik/toko daring).
       CATATAN PENTING: Larangan merek diatur pada PASAL 25 (BUKAN Pasal 19. Dalam Perpres 16/2018, Pasal 19 adalah tentang Kualifikasi Penyedia. Jangan gunakan aturan lama Perpres 54/2010 yang telah dicabut).
     * Pasal 26: Harga Perkiraan Sendiri (HPS). Ayat (4) penetapan HPS paling lama 28 hari kerja sebelum batas akhir penawaran. Ayat (5) HPS dilarang memperhitungkan keuntungan dan biaya tidak terduga (contingency).
   - Peraturan LKPP No. 11 Tahun 2021 tentang Perencanaan Pengadaan.
   - Peraturan LKPP No. 12 Tahun 2021 tentang Pedoman Pelaksanaan PBJ melalui Penyedia.
   - DILARANG mencantumkan nomor pasal atau nama peraturan fiktif.
2. Taksonomi Bloom C3-C4 (Aplikasi & Analisis):
   - Konten berorientasi prosedur kerja nyata (SOP), formula matematis HPS, eliminasi biaya terlarang (contingency/biaya tak terduga), pencegahan temuan auditor BPK/Inspektorat, dan telaah spesifikasi teknis bebas penguncian merek.
3. Respon WAJIB berupa format PURE JSON VALID.

Format JSON Output:
{
  "curriculumMeta": {
    "title": "string (Judul pelatihan ringkas, profesional, dan berorientasi solusi)",
    "targetAudience": "string",
    "competencyLevel": "C3-C4 (Aplikasi & Analisis)",
    "estimatedDurationMinutes": 60,
    "equivalentJp": 2,
    "learningObjectives": [
      "string (3 indikator hasil belajar dengan kata kerja operasional Bloom C3/C4)"
    ],
    "regulatoryGrounding": [
      {
        "regulation": "string (Nama resmi regulasi)",
        "relevantArticles": "string (Pasal spesifik & substansi ketentuannya)",
        "relevanceExplanation": "string (Mengapa pasal ini penting bagi PPK)"
      }
    ]
  },
  "modules": [
    {
      "moduleOrder": 1,
      "moduleTitle": "string",
      "learningPoints": ["string"],
      "contentBody": "string (Panduan operasional teknis langkah-demi-langkah sekitar 150-220 kata, fokus pada tindakan nyata PPK)",
      "commonPitfalls": ["string (Titik rawan temuan BPK/Inspektorat atau kekeliruan fatal)"]
    }
  ],
  "actionableToolkits": {
    "selfVerificationChecklist": [
      {
        "checkpoint": "string (Aspek yang diverifikasi)",
        "regulatoryBasis": "string (Dasar hukum spesifik)",
        "verificationMethod": "string (Cara verifikasi dokumen oleh PPK)",
        "riskIfNotCompliant": "string (Risiko administratif/hukum jika diabaikan)"
      }
    ],
    "hpsWorksheetStructure": {
      "components": ["string (Daftar rincian kolom Kertas Kerja HPS yang akuntabel)"],
      "guidelines": "string (Pedoman penyusunan & batasan legal perhitungan)"
    }
  }
}
`;

    const stage1UserPrompt = `
Masalah Kinerja Pegawai / ASN:
"${workplaceProblem}"

Hasilkan blueprint kurikulum, tepat 3 modul terapan terstruktur, dan actionable toolkits (minimal 4 butir checklist verifikasi mandiri + panduan kertas kerja HPS). Pastikan materi padat, akurat secara hukum (Pasal 25 untuk spesifikasi teknis, Pasal 26 untuk HPS), dan bernilai guna tinggi.
`;

    type Stage1Payload = {
        curriculumMeta: CurriculumMeta;
        modules: LearningModule[];
        actionableToolkits: ActionableToolkits;
    };

    const stage1 = await callGeminiJson<Stage1Payload>(
        stage1SystemPrompt,
        stage1UserPrompt,
        apiKey,
        4096
    );

    // Stage 2: Situational Judgment Quiz
    const stage2SystemPrompt = `
Anda adalah Asesor Kompetensi PBJP dan Spesialis Evaluasi Pembelajaran LAN RI.
Tugas Anda: Menyusun 3 butir soal Situational Judgment Test (Uji Kasus Situasional) berbobot Taksonomi Bloom C3 (Aplikasi) dan C4 (Analisis).

STANDAR SOAL SITUASIONAL & ZERO FABRICATION:
1. Skenario bukan hafalan definisi teoretis, melainkan dilema nyata di Pemda/Instansi:
   - Kasus 1: Tekanan pimpinan/PA untuk mengunci merek tertentu pada tender terbuka.
     * Rujukan Hukum WAJIB: "Pasal 25 Perpres No. 16 Tahun 2018 jo. Perpres No. 12 Tahun 2021" (Larangan penyebutan merek/spesifikasi mengunci kecuali suku cadang/komponen/sistem existing/e-katalog).
     * PERINGATAN KERAS: JANGAN menyebut Pasal 19 (Pasal 19 adalah tentang Kualifikasi Penyedia; jangan mencampuradukkan dengan Perpres 54/2010 lama).
   - Kasus 2: Usulan staf memasukkan pos biaya cadangan (contingency cost) atau keuntungan ganda dalam HPS.
     * Rujukan Hukum WAJIB: "Pasal 26 ayat (5) Perpres No. 16 Tahun 2018 jo. Perpres No. 12 Tahun 2021" (Larangan memperhitungkan biaya tidak terduga/contingency dalam HPS).
   - Kasus 3: Keterlambatan jadwal tender yang menyebabkan penetapan HPS telah melewati batas 28 hari kerja sebelum penutupan penawaran.
     * Rujukan Hukum WAJIB: "Pasal 26 ayat (4) Perpres No. 16 Tahun 2018 jo. Perpres No. 12 Tahun 2021" (Kewajiban pemutakhiran HPS jika melampaui 28 hari kerja).
2. Terdapat 4 opsi jawaban (A, B, C, D) dengan 1 jawaban benar dan 3 pengecoh realistis (plausible distractors).
3. Setiap opsi WAJIB dilengkapi 'reasoning' (alasan analisis hukum/operasional mengapa benar atau mengapa salah).
4. Zero Fabrication: Landasan regulasi mengacu pada Perpres 16/2018 jo. Perpres 12/2021 dan Peraturan LKPP terkait secara presisi.
5. Format PURE JSON VALID.

Format JSON Output:
{
  "situationalJudgmentQuiz": [
    {
      "questionNumber": 1,
      "scenario": "string (Skenario masalah dilema konkrit)",
      "options": [
        { "key": "A", "text": "string", "isCorrect": false, "reasoning": "string" },
        { "key": "B", "text": "string", "isCorrect": true, "reasoning": "string" },
        { "key": "C", "text": "string", "isCorrect": false, "reasoning": "string" },
        { "key": "D", "text": "string", "isCorrect": false, "reasoning": "string" }
      ],
      "regulatoryReference": "string",
      "keyTakeaway": "string"
    }
  ]
}
`;

    const stage2UserPrompt = `
Judul Pelatihan: "${stage1.data.curriculumMeta.title}"
Masalah Kinerja ASN: "${workplaceProblem}"
Tujuan Pembelajaran: ${JSON.stringify(stage1.data.curriculumMeta.learningObjectives)}

Buat 3 butir soal Situational Judgment Test berstandar C3-C4 untuk menguji kesiapan PPK menghadapi dilema di lapangan.
Pastikan rujukan hukum kasus penguncian merek adalah Pasal 25 Perpres 16/2018 jo. 12/2021 (BUKAN Pasal 19).
`;

    type Stage2Payload = {
        situationalJudgmentQuiz: SituationalQuizItem[];
    };

    const stage2 = await callGeminiJson<Stage2Payload>(
        stage2SystemPrompt,
        stage2UserPrompt,
        apiKey,
        4096
    );

    // Safeguard Sanitizer: Koreksi otomatis jika LLM masih terkontaminasi halusinasi Pasal 19 untuk spesifikasi teknis
    const sanitizedQuizzes = (stage2.data.situationalJudgmentQuiz || []).map(q => {
        let regRef = q.regulatoryReference;
        if ((/merek|brand/i.test(q.scenario) || /merek|brand/i.test(q.keyTakeaway)) && /pasal\s*19\b/i.test(regRef)) {
            regRef = regRef.replace(/pasal\s*19\b/gi, "Pasal 25");
        }
        const updatedOptions = q.options.map(opt => {
            let reasoning = opt.reasoning;
            if ((/merek|brand/i.test(q.scenario) || /merek|brand/i.test(opt.text)) && /pasal\s*19\b/i.test(reasoning)) {
                reasoning = reasoning.replace(/pasal\s*19(\s*ayat\s*\(?2\)?)?/gi, "Pasal 25 ayat (2)");
            }
            return { ...opt, reasoning };
        });
        return { ...q, regulatoryReference: regRef, options: updatedOptions };
    });

    const totalElapsedSeconds = Number(((Date.now() - tStart) / 1000).toFixed(2));

    const rawCourse: OnDemandCoursePackage = {
        curriculumMeta: stage1.data.curriculumMeta,
        modules: stage1.data.modules,
        actionableToolkits: stage1.data.actionableToolkits,
        situationalJudgmentQuiz: sanitizedQuizzes,
        pipelineMetadata: {
            stage1Model: stage1.modelUsed,
            stage2Model: stage2.modelUsed,
            generatedAt: new Date().toISOString(),
            totalElapsedSeconds
        }
    };

    // R4: Dynamic JP Calculator - dihitung secara dinamis setelah silabus dan modul selesai disusun
    const fullCourse = applyDynamicJpToCourse(rawCourse);

    const audit = verifyCourseQuality(fullCourse);

    return { course: fullCourse, audit };
}
