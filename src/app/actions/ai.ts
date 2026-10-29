"use server";

import { requireInstructorSession } from "./auth";
import { GEMINI_MODEL_POOL } from "@/lib/on-demand-learning";

export async function generateAIQuiz(content: string, requestedCount: number = 5) {
    try {
        await requireInstructorSession();
    } catch (err: unknown) {
        return { success: false, error: err instanceof Error ? err.message : "Unauthorized" };
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        return { success: false, error: "GEMINI_API_KEY belum diset di .env.local" };
    }

    if (!content || content.length < 50) {
        return { success: false, error: "Konten terlalu pendek untuk dibuat kuis." };
    }

    try {
        const prompt = `
Generate kuis pilihan ganda berdasarkan teks materi berikut dalam bahasa Indonesia.
Beri hasil dalam format PURE JSON ARRAY saja, tanpa teks penjelasan tambahan apapun di awal atau akhir.
Maksimal ${requestedCount} soal.

Materi:
"""
${content.substring(0, 5000)}
"""

Schema JSON yang harus diikuti:
[
  {
    "questionText": "Pertanyaan soal",
    "options": [
      { "optionText": "Pilihan A", "isCorrect": false },
      { "optionText": "Pilihan B", "isCorrect": true },
      { "optionText": "Pilihan C", "isCorrect": false },
      { "optionText": "Pilihan D", "isCorrect": false }
    ],
    "explanation": "Penjelasan singkat jawaban yang benar"
  }
]
        `;

        let quizData = null;
        let lastError = "Gagal memproses AI quiz";

        for (const model of GEMINI_MODEL_POOL) {
            try {
                const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: prompt }] }],
                        generationConfig: {
                            temperature: 0.5,
                            topP: 0.8,
                            topK: 40,
                            maxOutputTokens: 2048,
                            responseMimeType: "application/json"
                        }
                    })
                });

                const data = await response.json();
                if (data.error) {
                    lastError = data.error.message;
                    continue;
                }

                const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
                if (!textResponse) continue;

                const cleanedText = textResponse.replace(/```json/gi, '').replace(/```/g, '').trim();
                quizData = JSON.parse(cleanedText);
                break;
            } catch (e: unknown) {
                lastError = e instanceof Error ? e.message : String(e);
            }
        }

        if (!quizData) {
            return { success: false, error: lastError };
        }

        return { success: true, questions: quizData };

    } catch (err: unknown) {
        console.error("AI Generation Failed:", err);
        return { success: false, error: "Terjadi kesalahan saat memproses permintaan AI." };
    }
}
