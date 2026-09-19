const mysql = require('mysql2/promise');
require('dotenv').config();

const config = {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'smart_segment',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 5000,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,

  // Enable SSL when DB_SSL=true
  ...(process.env.DB_SSL === 'true'
    ? {
        ssl: {
          rejectUnauthorized: false
        }
      }
    : {}),
};

if (process.env.DB_SOCKET) {
  config.socketPath = process.env.DB_SOCKET;
  delete config.host;
  delete config.port;
}

const pool = mysql.createPool(config);

async function checkDatabase() {
  let conn;
  try {
    conn = await pool.getConnection();
    await conn.query('SELECT 1');
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      code: error.code,
      message: error.message
    };
  } finally {
    conn?.release();
  }
}

module.exports = { pool, checkDatabase };
