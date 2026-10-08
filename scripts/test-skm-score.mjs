import assert from 'node:assert/strict';

// Helper mirroring the logic in submitPublicWebinarAttendance
function calculateSkmScore(skmAnswers) {
  if (!Array.isArray(skmAnswers) || skmAnswers.length === 0) return 0;
  const totalScore = skmAnswers.reduce((sum, item) => sum + (Number(item.score) || 0), 0);
  const maxPossibleScore = skmAnswers.length * 4;
  return maxPossibleScore > 0 ? Math.round((totalScore / maxPossibleScore) * 100) : 0;
}

function sanitizeNip(raw) {
  return raw.trim().replace(/\D/g, '');
}

console.log("Running self-check tests for SKM score calculation and NIP sanitization...");

// Test 1: All A (score 4) -> 100
const allA = Array.from({ length: 9 }, (_, i) => ({ questionId: i + 1, score: 4 }));
assert.equal(calculateSkmScore(allA), 100, "All A must produce score 100");

// Test 2: All B (score 3) -> 75
const allB = Array.from({ length: 9 }, (_, i) => ({ questionId: i + 1, score: 3 }));
assert.equal(calculateSkmScore(allB), 75, "All B must produce score 75");

// Test 3: All C (score 2) -> 50
const allC = Array.from({ length: 9 }, (_, i) => ({ questionId: i + 1, score: 2 }));
assert.equal(calculateSkmScore(allC), 50, "All C must produce score 50");

// Test 4: All D (score 1) -> 25
const allD = Array.from({ length: 9 }, (_, i) => ({ questionId: i + 1, score: 1 }));
assert.equal(calculateSkmScore(allD), 25, "All D must produce score 25");

// Test 5: Mixed answers (e.g. 5 A and 4 B: 5*4 + 4*3 = 20 + 12 = 32 / 36 * 100 = 88.88 -> 89)
const mixed = [
  ...Array.from({ length: 5 }, (_, i) => ({ questionId: i + 1, score: 4 })),
  ...Array.from({ length: 4 }, (_, i) => ({ questionId: i + 6, score: 3 })),
];
assert.equal(calculateSkmScore(mixed), 89, "Mixed (32/36) must round to 89");

// Test 6: Empty array or invalid input
assert.equal(calculateSkmScore([]), 0, "Empty array must return 0");
assert.equal(calculateSkmScore(null), 0, "Null must return 0");

// Test 7: NIP sanitization strips spaces, dashes, dots, and characters
assert.equal(sanitizeNip(" 19900101 202012 1 001 "), "199001012020121001");
assert.equal(sanitizeNip("1990-01-01.202012"), "19900101202012");
assert.equal(sanitizeNip("abc12345678xyz"), "12345678");

console.log("All 7 assertion checks passed successfully! ✨");
