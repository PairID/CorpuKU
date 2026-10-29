import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const sql = neon(process.env.DATABASE_URL);

async function checkTsConfig() {
  const configs = await sql`SELECT cfgname FROM pg_ts_config`;
  console.log('Available ts_configs:', configs.map(c => c.cfgname));
}

checkTsConfig().catch(console.error);
