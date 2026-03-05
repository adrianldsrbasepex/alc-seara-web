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
        console.log('Verifying table counts...');
        const tables = [
            'drivers', 'vehicles', 'routes', 'expenses',
            'admins', 'shunters', 'financial_closures',
            'payment_requests', 'leftover_cargo',
            'spreadsheet_closures', 'spreadsheet_items',
            'vehicle_daily_status'
        ];

        for (const table of tables) {
            const [rows] = await pool.query(`SELECT COUNT(*) as count FROM ${table}`);
            const count = (rows as any)[0].count;
            console.log(`${table}: ${count} records`);
        }
    } catch (e) {
        console.error('Verification failed:', e);
    } finally {
        await pool.end();
    }
}

run();
