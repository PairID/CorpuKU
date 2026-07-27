import { neon } from '@neondatabase/serverless';

// Pastikan DATABASE_URL atau POSTGRES_URL sudah ada di .env.local Anda
// Vercel Neon integration biasanya memberikan POSTGRES_URL
const rawConnectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL || "";
const connectionString = rawConnectionString.trim().replace(/^["']|["']$/g, '');

// Inisialisasi neon client dengan pengaman untuk build process
const isServer = typeof window === 'undefined';

if (isServer && !connectionString) {
  console.error("WARNING: DATABASE_URL tidak ditemukan. Pastikan Anda sudah setup Neon di Vercel dan melakukan 'vercel env pull'.");
}

export const sql = neon(connectionString);
