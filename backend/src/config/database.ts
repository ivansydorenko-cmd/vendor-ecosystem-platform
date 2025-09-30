import { Pool } from 'pg';

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'vendor_platform_dev',
  user: process.env.DB_USER || 'vendor_user',
  password: process.env.DB_PASS,
  max: 20,
});

pool.on('connect', () => {
  console.log('Database connected');
});

export const query = async (text: string, params?: any[]) => {
  const result = await pool.query(text, params);
  return result;
};

export const getClient = async () => {
  const client = await pool.connect();
  return client;
};

export const closePool = async () => {
  await pool.end();
};

export { pool };
