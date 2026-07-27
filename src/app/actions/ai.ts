"use server";

import { requireInstructorSession } from "./auth";

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

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: 0.7,
                    topP: 0.8,
                    topK: 40,
                    maxOutputTokens: 2048,
                    responseMimeType: "application/json"
                }
            })
        });

        const data = await response.json();
        
        if (data.error) {
            console.error("Gemini API Error:", data.error);
            return { success: false, error: data.error.message };
        }

        const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!textResponse) {
            return { success: false, error: "Gagal mendapatkan respon dari AI." };
        }

        // Clean up the text response (just in case there are markdown blocks)
        const cleanedText = textResponse.replace(/```json/g, '').replace(/```/g, '').trim();
        const quizData = JSON.parse(cleanedText);

        return { success: true, questions: quizData };

    } catch (err: unknown) {
        console.error("AI Generation Failed:", err);
        return { success: false, error: "Terjadi kesalahan saat memproses permintaan AI." };
    }
}
