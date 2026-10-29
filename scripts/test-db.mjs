import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const sql = neon(process.env.DATABASE_URL);

async function testDb() {
  const res = await sql`SELECT current_database(), current_user, version()`;
  console.log('Connected to Neon successfully:', res);
}

testDb().catch(e => console.error('DB Error:', e));
