import pg from 'pg';
import 'dotenv/config';

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

pool.on('error', (err) => {
  console.error('Unexpected database error', err);
  process.exit(-1);
});

export async function query(text, params) {
  const result = await pool.query(text, params);
  return result;
}

export default pool;
