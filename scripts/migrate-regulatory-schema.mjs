import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL tidak ditemukan!");
  process.exit(1);
}

const sql = neon(connectionString);

export async function migrateRegulatorySchema() {
  console.log("🚀 Menyiapkan skema Document Registry & Legal Articles di PostgreSQL Neon...");

  // 1. Tabel document_registry
  await sql`
    CREATE TABLE IF NOT EXISTS document_registry (
      id VARCHAR(100) PRIMARY KEY,
      doc_type VARCHAR(50) NOT NULL,
      doc_number VARCHAR(50) NOT NULL,
      doc_year INTEGER NOT NULL,
      title TEXT NOT NULL,
      issuer VARCHAR(255) NOT NULL,
      status VARCHAR(50) NOT NULL CHECK (status IN ('ACTIVE', 'AMENDED_PARTIALLY', 'REPEALED')),
      amended_by VARCHAR(100),
      superseded_by VARCHAR(100),
      effective_date DATE,
      official_url TEXT,
      pdf_url TEXT,
      abstract TEXT,
      content TEXT,
      metadata JSONB DEFAULT '{}'::jsonb,
      tsv_content tsvector,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;

  // 2. Foreign keys untuk lineage (self-referential)
  await sql`
    DO $$ 
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_doc_amended_by'
      ) THEN
        ALTER TABLE document_registry 
        ADD CONSTRAINT fk_doc_amended_by 
        FOREIGN KEY (amended_by) REFERENCES document_registry(id) ON DELETE SET NULL;
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_doc_superseded_by'
      ) THEN
        ALTER TABLE document_registry 
        ADD CONSTRAINT fk_doc_superseded_by 
        FOREIGN KEY (superseded_by) REFERENCES document_registry(id) ON DELETE SET NULL;
      END IF;
    END $$;
  `;

  // 3. Tabel legal_articles (pasal-pasal otentik untuk citation validation & granular RAG)
  await sql`
    CREATE TABLE IF NOT EXISTS legal_articles (
      id VARCHAR(150) PRIMARY KEY,
      document_id VARCHAR(100) NOT NULL REFERENCES document_registry(id) ON DELETE CASCADE,
      article_number VARCHAR(50) NOT NULL,
      article_title VARCHAR(255),
      substance TEXT NOT NULL,
      is_active BOOLEAN DEFAULT TRUE,
      tsv_article tsvector,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;

  // 4. Indexes (GIN untuk tsvector hybrid search, B-Tree untuk status & nomor)
  await sql`
    CREATE INDEX IF NOT EXISTS idx_doc_registry_status ON document_registry(status);
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_doc_registry_tsv ON document_registry USING GIN (tsv_content);
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_legal_articles_doc_id ON legal_articles(document_id);
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_legal_articles_num ON legal_articles(article_number);
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_legal_articles_tsv ON legal_articles USING GIN (tsv_article);
  `;

  console.log("✅ Skema Document Registry & Legal Articles berhasil diterapkan di Neon!");
}

migrateRegulatorySchema().catch(err => {
  console.error("❌ Gagal migrasi skema:", err);
  process.exit(1);
});
