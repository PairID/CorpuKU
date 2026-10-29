#!/usr/bin/env node
/**
 * Official Simulation Runner for On-Demand AI Generated Learning
 * CorpuKU Bangkom ASN
 * 
 * Usage:
 *   node scripts/simulate-on-demand-learning.mjs [optional_problem_string]
 */

import fs from "fs";
import path from "path";
import { generateOnDemandCourse } from "../src/lib/on-demand-learning.ts";

// 1. Ambil API Key dari .env.local atau environment
let apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
    const envPath = path.resolve(process.cwd(), ".env.local");
    if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, "utf8");
        const match = envContent.match(/GEMINI_API_KEY=["']?([^"'\r\n]+)["']?/);
        if (match) apiKey = match[1];
    }
}

if (!apiKey) {
    console.error("FATAL: GEMINI_API_KEY tidak ditemukan di .env.local atau environment variable.");
    process.exit(1);
}

// 2. Tentukan masalah kinerja yang disimulasikan
const defaultProblem = "Saya butuh pelatihan untuk menyelesaikan masalah: baru ditunjuk sebagai Pejabat Pembuat Komitmen (PPK) dan harus menyusun Harga Perkiraan Sendiri (HPS) serta dokumen spesifikasi teknis pengadaan barang/jasa di instansi daerah agar akuntabel dan tidak melanggar Perpres PBJ";
const workplaceProblem = process.argv[2] || defaultProblem;

console.log("================================================================================");
console.log("    SIMULASI ON-DEMAND AI GENERATED LEARNING - CORPU BANGKOM ASN LMS");
console.log("================================================================================");
console.log("Masalah Kinerja Input:\n\"" + workplaceProblem + "\"\n");

async function run() {
    try {
        console.log("Menjalankan pipeline on-demand 2-stage generation...");
        const { course, audit } = await generateOnDemandCourse(workplaceProblem, apiKey);

        console.log("\n================================================================================");
        console.log("                      SCORECARD AUDIT STANDAR MUTU");
        console.log("================================================================================");
        for (const check of audit.checks) {
            console.log(`  [PASS] ${check}`);
        }
        for (const err of audit.errors) {
            console.log(`  [FAIL] ${err}`);
        }
        console.log("--------------------------------------------------------------------------------");
        console.log(`Skor Kualitas Konten: ${audit.score}/100`);
        console.log(`Status Mutu         : ${audit.isValid ? "PERFECT (MEMENUHI SELURUH STANDAR MUTU PELATIHAN ASN)" : "REJECTED (BELUM MEMENUHI STANDAR MUTU)"}`);
        console.log(`Model Stage 1       : ${course.pipelineMetadata?.stage1Model}`);
        console.log(`Model Stage 2       : ${course.pipelineMetadata?.stage2Model}`);
        console.log(`Waktu Pemrosesan    : ${course.pipelineMetadata?.totalElapsedSeconds} detik`);

        const scratchDir = path.resolve(process.cwd(), "scratch");
        if (!fs.existsSync(scratchDir)) fs.mkdirSync(scratchDir, { recursive: true });
        const outputPath = path.join(scratchDir, "simulation_result_final.json");
        fs.writeFileSync(outputPath, JSON.stringify(course, null, 2), "utf8");
        console.log(`File Hasil Lengkap  : ${outputPath}`);
        console.log("================================================================================\n");

        console.log("=== CUPLIKAN MODUL PEMBELAJARAN ===");
        for (const m of course.modules) {
            console.log(`\nModul ${m.moduleOrder}: ${m.moduleTitle}`);
            console.log(`Inti Panduan : ${m.contentBody.substring(0, 160)}...`);
            console.log(`Titik Rawan  : ${m.commonPitfalls.join(" | ")}`);
        }

        console.log("\n=== CUPLIKAN SITUATIONAL JUDGMENT QUIZ ===");
        for (const q of course.situationalJudgmentQuiz) {
            const correctOpt = q.options.find(o => o.isCorrect);
            console.log(`\n[Kasus ${q.questionNumber}] ${q.scenario.substring(0, 120)}...`);
            console.log(`  -> Jawaban Tepat (${correctOpt?.key}): ${correctOpt?.text}`);
            console.log(`  -> Rujukan Hukum: ${q.regulatoryReference}`);
            console.log(`  -> Key Takeaway : ${q.keyTakeaway}`);
        }

        console.log("\n================================================================================");

        if (!audit.isValid) {
            process.exit(1);
        }
    } catch (err) {
        console.error("Simulation failed:", err);
        process.exit(1);
    }
}

run();
