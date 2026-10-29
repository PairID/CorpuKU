import { describe, expect, it } from "vitest";
import {
    verifyCourseQuality,
    OnDemandCoursePackage,
    GEMINI_MODEL_POOL
} from "../../src/lib/on-demand-learning";

describe("On-Demand AI Generated Learning - Quality Gate", () => {
    const validCourseFixture: OnDemandCoursePackage = {
        curriculumMeta: {
            title: "Akselerasi Kompetensi PPK: Penyusunan Spesifikasi Teknis dan HPS Akuntabel",
            targetAudience: "Pejabat Pembuat Komitmen (PPK) Instansi Pemerintah Daerah",
            competencyLevel: "C3-C4 (Aplikasi & Analisis)",
            estimatedDurationMinutes: 60,
            equivalentJp: 2,
            learningObjectives: [
                "Menganalisis spesifikasi teknis barang/jasa untuk memastikan pemenuhan prinsip persaingan usaha sehat tanpa mengunci merek.",
                "Mengaplikasikan metode perhitungan HPS yang akurat berdasarkan data pasar yang valid sesuai ketentuan Perpres PBJ.",
                "Mengevaluasi risiko hukum dalam dokumen pengadaan untuk memitigasi temuan auditor BPK/Inspektorat."
            ],
            regulatoryGrounding: [
                {
                    regulation: "Perpres No. 16 Tahun 2018 jo. Perpres No. 12 Tahun 2021",
                    relevantArticles: "Pasal 25 (Spesifikasi Teknis) dan Pasal 26 (HPS)",
                    relevanceExplanation: "Dasar legalitas utama batasan pengadaan dan HPS"
                },
                {
                    regulation: "Peraturan LKPP No. 12 Tahun 2021",
                    relevantArticles: "Pedoman Pelaksanaan Pengadaan melalui Penyedia",
                    relevanceExplanation: "Tata cara survei dan penetapan HPS"
                }
            ]
        },
        modules: [
            {
                moduleOrder: 1,
                moduleTitle: "Penyusunan Spesifikasi Teknis Berbasis Kinerja",
                learningPoints: ["Non-diskriminatif", "Larangan merek"],
                contentBody: "PPK wajib menyusun spesifikasi teknis yang berorientasi pada fungsi dan kinerja, bukan merek. Langkah pertama adalah melakukan identifikasi kebutuhan riil unit kerja. Hindari penggunaan spesifikasi yang mengarah pada satu penyedia tertentu (lock-in) kecuali untuk pengadaan suku cadang atau barang yang kompatibel. Gunakan standar nasional (SNI) jika tersedia. Dalam dokumen, cantumkan batasan minimal kualitas, kuantitas, dan waktu. Pastikan spesifikasi teknis memuat aspek keberlanjutan (sustainable procurement) jika memungkinkan. PPK harus mendokumentasikan proses riset pasar yang dilakukan sebagai dasar penentuan spesifikasi. Ingat, spesifikasi yang terlalu ketat tanpa justifikasi teknis yang kuat adalah pintu masuk utama temuan auditor terkait persaingan usaha tidak sehat.",
                commonPitfalls: ["Penyebutan merek dagang", "Spesifikasi mengunci"]
            },
            {
                moduleOrder: 2,
                moduleTitle: "Teknik Perhitungan HPS yang Akuntabel",
                learningPoints: ["Survei harga", "PPN 11%"],
                contentBody: "HPS bukan sekadar harga pasar, melainkan estimasi harga yang telah memperhitungkan keuntungan dan biaya overhead penyedia. PPK harus mengumpulkan data dari minimal dua sumber, seperti harga pasar terkini, katalog elektronik, informasi biaya satuan dari instansi lain, atau hasil survei lapangan. Lakukan analisis kewajaran harga dengan membandingkan data yang diperoleh. HPS harus mencakup biaya pajak (PPN), biaya pengiriman, biaya instalasi, dan biaya pelatihan jika diperlukan. Pastikan HPS tidak melebihi pagu anggaran. PPK wajib menandatangani kertas kerja HPS sebagai bukti tanggung jawab profesional. Selalu simpan bukti survei harga (tangkapan layar, penawaran, atau nota) sebagai lampiran pendukung untuk menjawab pertanyaan auditor di masa depan.",
                commonPitfalls: ["Satu sumber data saja", "Biaya tak terduga dimasukkan"]
            },
            {
                moduleOrder: 3,
                moduleTitle: "Mitigasi Risiko Audit dan Pembuktian Rekam Jejak",
                learningPoints: ["Masa 28 hari kerja", "BA Penetapan HPS"],
                contentBody: "Setiap keputusan PPK harus memiliki jejak audit (audit trail) yang kuat. Mulailah dengan menyusun Berita Acara Penetapan HPS yang memuat metodologi perhitungan secara transparan. Pastikan seluruh dokumen pendukung, mulai dari spesifikasi teknis hingga riset pasar, tersimpan rapi dalam sistem pengarsipan digital maupun fisik. PPK harus proaktif melakukan reviu terhadap dokumen pemilihan untuk memastikan tidak ada klausul yang bertentangan dengan Perpres PBJ. Jika terdapat keraguan, lakukan konsultasi dengan unit kerja pengadaan barang/jasa (UKPBJ) atau ahli hukum pengadaan. Fokus utama PPK adalah memastikan proses pengadaan memberikan nilai manfaat (value for money) bagi negara dan masyarakat, bukan sekadar menggugurkan kewajiban administratif.",
                commonPitfalls: ["Dokumen hilang", "HPS lewat 28 hari kerja"]
            }
        ],
        actionableToolkits: {
            selfVerificationChecklist: [
                {
                    checkpoint: "Spesifikasi teknis tidak mengunci merek",
                    regulatoryBasis: "Pasal 25 Perpres 16/2018 jo. 12/2021",
                    verificationMethod: "Uji pencarian nama tipe/merek dagang pada draf spek",
                    riskIfNotCompliant: "Sanggahan penyedia dan temuan persaingan usaha tidak sehat"
                },
                {
                    checkpoint: "HPS disusun dari data pasar valid minimal 2 sumber",
                    regulatoryBasis: "Pasal 26 Perpres 16/2018 jo. 12/2021",
                    verificationMethod: "Cek dokumen faktur/katalog/penawaran terlampir",
                    riskIfNotCompliant: "Indikasi mark-up dan potensi kerugian negara"
                },
                {
                    checkpoint: "Eliminasi pos biaya cadangan (contingency)",
                    regulatoryBasis: "Pasal 26 ayat 5 Perpres 12/2021",
                    verificationMethod: "Audit formula spreadsheet",
                    riskIfNotCompliant: "Temuan audit BPK"
                },
                {
                    checkpoint: "Masa penetapan HPS tidak melebihi 28 hari kerja",
                    regulatoryBasis: "Pasal 26 ayat 4 Perpres 12/2021",
                    verificationMethod: "Hitung selisih tanggal SK HPS dengan penutupan penawaran",
                    riskIfNotCompliant: "Cacat prosedur pengadaan"
                }
            ],
            hpsWorksheetStructure: {
                components: [
                    "No",
                    "Item Barang",
                    "Spesifikasi Minimal",
                    "Volume",
                    "Harga Satuan Survei",
                    "Biaya Pengiriman",
                    "Subtotal",
                    "PPN 11%",
                    "Total HPS"
                ],
                guidelines: "Gunakan formula aktif Excel, lampirkan bukti fisik survei bertanggal"
            }
        },
        situationalJudgmentQuiz: [
            {
                questionNumber: 1,
                scenario: "PA meminta PPK mengunci merek tertentu dalam tender terbuka laptop Rp3,5 Miliar.",
                options: [
                    { key: "A", text: "Ikuti instruksi", isCorrect: false, reasoning: "Melanggar hukum" },
                    { key: "B", text: "Tolak santun dan gunakan spesifikasi kinerja", isCorrect: true, reasoning: "Sesuai Pasal 25" },
                    { key: "C", text: "Tambahkan atau setara", isCorrect: false, reasoning: "Tetap diskriminatif" },
                    { key: "D", text: "Pecah paket", isCorrect: false, reasoning: "Pelanggaran Pasal 20" }
                ],
                regulatoryReference: "Pasal 25 Perpres 16/2018 jo. 12/2021",
                keyTakeaway: "Spesifikasi tender terbuka wajib berbasis fungsi bukan merek"
            },
            {
                questionNumber: 2,
                scenario: "Staf memasukkan pos biaya cadangan fluktuasi BBM 10% ke dalam komponen HPS genset.",
                options: [
                    { key: "A", text: "Setujui usulan staf", isCorrect: false, reasoning: "Melanggar hukum" },
                    { key: "B", text: "Hapus pos cadangan, masukkan ke biaya freight riil", isCorrect: true, reasoning: "Sesuai Pasal 26 ayat 5" },
                    { key: "C", text: "Ubah nama jadi keuntungan", isCorrect: false, reasoning: "Manipulasi data" },
                    { key: "D", text: "Pindahkan ke pagu anggaran", isCorrect: false, reasoning: "Tidak menyelesaikan masalah" }
                ],
                regulatoryReference: "Pasal 26 ayat 5 Perpres 16/2018 jo. 12/2021",
                keyTakeaway: "HPS dilarang memuat biaya tidak terduga/cadangan"
            },
            {
                questionNumber: 3,
                scenario: "Tender tertunda sehingga batas akhir pemasukan penawaran melewati 35 hari kerja sejak SK HPS.",
                options: [
                    { key: "A", text: "Lanjutkan saja tanpa perubahan", isCorrect: false, reasoning: "Cacat hukum" },
                    { key: "B", text: "Lakukan kaji ulang pasar dan tetapkan HPS mutakhir", isCorrect: true, reasoning: "Sesuai Pasal 26 ayat 4" },
                    { key: "C", text: "Minta dispensasi verbal", isCorrect: false, reasoning: "Aturan bersifat imperatif" },
                    { key: "D", text: "Tarik paket pengadaan", isCorrect: false, reasoning: "Cukup dimutakhirkan" }
                ],
                regulatoryReference: "Pasal 26 ayat 4 Perpres 16/2018 jo. 12/2021",
                keyTakeaway: "HPS wajib dimutakhirkan jika melampaui batas 28 hari kerja"
            }
        ]
    };

    it("approves fully compliant course package with 100% score", () => {
        const audit = verifyCourseQuality(validCourseFixture);
        expect(audit.isValid).toBe(true);
        expect(audit.score).toBe(100);
        expect(audit.errors.length).toBe(0);
        expect(audit.checks.length).toBeGreaterThanOrEqual(5);
    });

    it("rejects incomplete metadata or missing learning objectives (< 3)", () => {
        const invalid = {
            ...validCourseFixture,
            curriculumMeta: {
                ...validCourseFixture.curriculumMeta,
                learningObjectives: ["Hanya satu tujuan"]
            }
        };
        const audit = verifyCourseQuality(invalid);
        expect(audit.isValid).toBe(false);
        expect(audit.errors.some(e => e.includes("kurang dari 3 butir"))).toBe(true);
    });

    it("rejects non-Bloom learning objectives without C3-C4 action verbs", () => {
        const invalid = {
            ...validCourseFixture,
            curriculumMeta: {
                ...validCourseFixture.curriculumMeta,
                learningObjectives: [
                    "Mengetahui tentang pengadaan barang dan jasa pemerintah",
                    "Memahami konsep dasar HPS dan spesifikasi teknis",
                    "Mendengar penjelasan narasumber mengenai pengadaan"
                ]
            }
        };
        const audit = verifyCourseQuality(invalid);
        expect(audit.score).toBeLessThan(100);
        expect(audit.errors.some(e => e.includes("Bloom C3-C4"))).toBe(true);
    });

    it("rejects course citing revoked regulation (Perpres 54/2010) as active legal grounding", () => {
        const invalid = {
            ...validCourseFixture,
            curriculumMeta: {
                ...validCourseFixture.curriculumMeta,
                regulatoryGrounding: [
                    {
                        regulation: "Perpres No. 54 Tahun 2010 tentang Pengadaan Barang/Jasa Pemerintah",
                        relevantArticles: "Pasal 19 Spesifikasi Teknis",
                        relevanceExplanation: "Dasar hukum pengadaan lama"
                    }
                ]
            }
        };
        const audit = verifyCourseQuality(invalid);
        expect(audit.isValid).toBe(false);
        expect(audit.errors.some(e => e.includes("Perpres 54/2010"))).toBe(true);
    });

    it("rejects course without authentic regulatory grounding (Zero Fabrication enforcement)", () => {
        const invalid = {
            ...validCourseFixture,
            curriculumMeta: {
                ...validCourseFixture.curriculumMeta,
                regulatoryGrounding: []
            }
        };
        const audit = verifyCourseQuality(invalid);
        expect(audit.isValid).toBe(false);
        expect(audit.errors.some(e => e.includes("Tidak ada landasan regulasi"))).toBe(true);
    });

    it("rejects course with fewer than 3 learning modules", () => {
        const invalid = {
            ...validCourseFixture,
            modules: [validCourseFixture.modules[0]]
        };
        const audit = verifyCourseQuality(invalid);
        expect(audit.isValid).toBe(false);
        expect(audit.errors.some(e => e.includes("< 3 modul"))).toBe(true);
    });

    it("rejects course with incomplete actionable toolkits (< 3 checklists)", () => {
        const invalid = {
            ...validCourseFixture,
            actionableToolkits: {
                ...validCourseFixture.actionableToolkits,
                selfVerificationChecklist: [validCourseFixture.actionableToolkits.selfVerificationChecklist[0]]
            }
        };
        const audit = verifyCourseQuality(invalid);
        expect(audit.isValid).toBe(false);
        expect(audit.errors.some(e => e.includes("Checklist SOP"))).toBe(true);
    });

    it("rejects situational quiz with invalid options count or multiple correct answers", () => {
        const invalid = {
            ...validCourseFixture,
            situationalJudgmentQuiz: [
                validCourseFixture.situationalJudgmentQuiz[0],
                validCourseFixture.situationalJudgmentQuiz[1],
                {
                    questionNumber: 3,
                    scenario: "Skenario valid yang cukup panjang untuk memenuhi batas minimal teks...",
                    options: [
                        { key: "A", text: "Opsi A", isCorrect: true, reasoning: "Alasan A panjang valid" },
                        { key: "B", text: "Opsi B", isCorrect: true, reasoning: "Alasan B panjang valid" }, // 2 jawaban benar -> Tidak valid!
                        { key: "C", text: "Opsi C", isCorrect: false, reasoning: "Alasan C panjang valid" },
                        { key: "D", text: "Opsi D", isCorrect: false, reasoning: "Alasan D panjang valid" }
                    ],
                    regulatoryReference: "Pasal 25 Perpres 16/2018",
                    keyTakeaway: "Takeaway panjang yang valid"
                }
            ]
        };
        const audit = verifyCourseQuality(invalid);
        expect(audit.isValid).toBe(false);
        expect(audit.errors.some(e => /situational/i.test(e))).toBe(true);
    });

    it("rejects situational quiz citing fabricated/obsolete article (Pasal 19 instead of Pasal 25 for brand locking)", () => {
        const invalid = {
            ...validCourseFixture,
            situationalJudgmentQuiz: [
                {
                    questionNumber: 1,
                    scenario: "PA meminta PPK mengunci merek tertentu dalam tender terbuka laptop Rp3,5 Miliar.",
                    options: [
                        { key: "A", text: "Ikuti instruksi", isCorrect: false, reasoning: "Melanggar hukum pengadaan barang jasa" },
                        { key: "B", text: "Tolak santun dan gunakan spesifikasi kinerja", isCorrect: true, reasoning: "Sesuai regulasi yang berlaku sah" },
                        { key: "C", text: "Tambahkan atau setara", isCorrect: false, reasoning: "Tetap diskriminatif dan melanggar hukum" },
                        { key: "D", text: "Pecah paket", isCorrect: false, reasoning: "Pelanggaran aturan pengadaan barang jasa" }
                    ],
                    // Kesalahan: mengutip Pasal 19 untuk larangan merek (seharusnya Pasal 25)
                    regulatoryReference: "Pasal 19 Perpres 16/2018 jo. 12/2021",
                    keyTakeaway: "Larangan mengunci merek pada spesifikasi teknis"
                },
                validCourseFixture.situationalJudgmentQuiz[1],
                validCourseFixture.situationalJudgmentQuiz[2]
            ]
        };
        const audit = verifyCourseQuality(invalid);
        expect(audit.isValid).toBe(false);
        expect(audit.errors.some(e => e.includes("Pasal 25"))).toBe(true);
    });

    it("defines high-availability Gemini model pool with fallbacks", () => {
        expect(GEMINI_MODEL_POOL).toBeDefined();
        expect(GEMINI_MODEL_POOL.length).toBeGreaterThanOrEqual(3);
        expect(GEMINI_MODEL_POOL).toContain("gemini-3.1-flash-lite");
        expect(GEMINI_MODEL_POOL).toContain("gemini-flash-latest");
    });
});
