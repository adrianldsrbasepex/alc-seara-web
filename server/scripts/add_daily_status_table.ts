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
        console.log('Updating database schema...');

        const query = `
            CREATE TABLE IF NOT EXISTS vehicle_daily_status (
                id VARCHAR(36) PRIMARY KEY,
                vehicle_id VARCHAR(36) NOT NULL,
                date DATE NOT NULL,
                status VARCHAR(1) NOT NULL,
                status_text TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY unique_vehicle_date (vehicle_id, date),
                FOREIGN KEY (vehicle_id) REFERENCES vehicles(id)
            );
        `;

        await pool.query(query);
        console.log('Table vehicle_daily_status created successfully.');
    } catch (e) {
        console.error('Failed to update schema:', e);
    } finally {
        await pool.end();
    }
}

run();
