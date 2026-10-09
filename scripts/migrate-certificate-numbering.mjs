import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
const sql = neon(process.env.DATABASE_URL || process.env.POSTGRES_URL);

async function run() {
  console.log('🔄 Menjalankan migrasi penomoran sertifikat...');

  // 1. Kolom certificate_start_number pada webinars
  await sql`
    ALTER TABLE webinars 
    ADD COLUMN IF NOT EXISTS certificate_start_number INTEGER DEFAULT NULL
  `;
  console.log('✅ Kolom certificate_start_number pada tabel webinars siap.');

  // 2. Kolom certificate_start_number pada courses
  await sql`
    ALTER TABLE courses 
    ADD COLUMN IF NOT EXISTS certificate_start_number INTEGER DEFAULT NULL
  `;
  console.log('✅ Kolom certificate_start_number pada tabel courses siap.');

  // 3. Konfigurasi default global_numbering pada certificate_settings
  await sql`
    INSERT INTO certificate_settings (type, settings)
    VALUES (
      'global_numbering',
      ${JSON.stringify({
        classificationCode: '800.2.5',
        institutionCode: 'BPSDM',
        delimiter: '/',
      })}::jsonb
    )
    ON CONFLICT (type) DO NOTHING
  `;
  console.log('✅ Pengaturan default global_numbering siap.');

  // 4. Update data sertifikat yang sudah terbit dari '_' ke '/'
  const updatedWebinarCerts = await sql`
    UPDATE issued_webinar_certificates
    SET certificate_number = REPLACE(certificate_number, '_', '/')
    WHERE certificate_number LIKE '800.2.5_%'
    RETURNING id, certificate_number
  `;
  console.log(`✅ Diperbarui ${updatedWebinarCerts.length} nomor sertifikat webinar menjadi format '/'`);

  // 5. Cek sequence saat ini
  const seqs = await sql`
    SELECT sequencename, last_value 
    FROM pg_sequences 
    WHERE sequencename IN ('webinar_certificate_number_seq', 'course_certificate_number_seq')
  `;
  console.log('📊 Status sequence saat ini:', seqs);
}

run().catch((err) => {
  console.error('❌ Error migrasi:', err);
  process.exit(1);
});
