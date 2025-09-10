import 'dotenv/config';
import mysql from 'mysql2/promise';

// Singleton pool
let pool;

/**
 * Returns a MySQL pool instance (singleton)
 */
export function getPool() {
  if (!pool) {
    let url = process.env.DATABASE_URL;

    // Build URL from DB_* env vars if DATABASE_URL is missing
    if (!url) {
      const host = process.env.DB_HOST || '127.0.0.1';
      const port = process.env.DB_PORT || '3306';
      const database = process.env.DB_DATABASE || '';
      const user = process.env.DB_USERNAME || 'root';
      const pass = process.env.DB_PASSWORD ?? '';

      const auth = pass === '' ? `${user}` : `${user}:${encodeURIComponent(pass)}`;
      url = `mysql://${auth}@${host}:${port}/${database}`;
    }

    // Add extra pool options
    const sep = url.includes('?') ? '&' : '?';
    pool = mysql.createPool(url + `${sep}connectionLimit=10&enableKeepAlive=true`);
    console.log('MySQL pool created');
  }
  return pool;
}

/**
 * Executes a query and returns rows
 * @param {string} sql - SQL query string
 * @param {Array} params - parameters for prepared statements
 * @returns {Promise<Array>}
 */
export async function query(sql, params = []) {
  try {
    const [rows] = await getPool().execute(sql, params);
    return rows;
  } catch (err) {
    console.error('MySQL query error:', err);
    throw err;
  }
}
