import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
const sql = neon(process.env.DATABASE_URL || process.env.POSTGRES_URL);

const result = await sql`
  SELECT column_name, data_type 
  FROM information_schema.columns 
  WHERE table_name = 'users' 
  ORDER BY ordinal_position
`;
console.log('📋 Kolom tabel users:');
result.forEach(r => console.log(`   - ${r.column_name} (${r.data_type})`));
