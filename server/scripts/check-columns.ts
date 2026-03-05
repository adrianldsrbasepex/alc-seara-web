import 'dotenv/config';
import mysql from 'mysql2/promise';

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

async function run() {
    try {
        const [rows] = await pool.query('SHOW COLUMNS FROM routes');
        console.log('Columns in routes:', (rows as any[]).map(r => r.Field).join(', '));
    } catch (e) {
        console.error('Debug failed:', e);
    } finally {
        await pool.end();
    }
}

run();
