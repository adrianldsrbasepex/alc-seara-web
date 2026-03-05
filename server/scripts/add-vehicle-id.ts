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
        console.log('Adding vehicle_id to routes...');
        await pool.query("ALTER TABLE routes ADD COLUMN vehicle_id VARCHAR(36)");
        await pool.query("ALTER TABLE routes ADD FOREIGN KEY (vehicle_id) REFERENCES vehicles(id)");
        console.log('Column added successfully.');
    } catch (e: any) {
        if (e.message.includes("Duplicate column")) {
            console.log("Column already exists.");
        } else {
            console.error('Failed to add column:', e);
        }
    } finally {
        await pool.end();
    }
}

run();
