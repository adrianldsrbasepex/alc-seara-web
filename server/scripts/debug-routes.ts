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
        // 1. Check current count
        const [rows] = await pool.query('SELECT COUNT(*) as count FROM routes');
        console.log('Current Routes in MySQL:', (rows as any)[0].count);

        // 2. Check dependencies
        const [drivers] = await pool.query('SELECT COUNT(*) as count FROM drivers');
        console.log('Drivers in MySQL:', (drivers as any)[0].count);

        const [vehicles] = await pool.query('SELECT COUNT(*) as count FROM vehicles');
        console.log('Vehicles in MySQL:', (vehicles as any)[0].count);

    } catch (e) {
        console.error('Debug failed:', e);
    } finally {
        await pool.end();
    }
}

run();
