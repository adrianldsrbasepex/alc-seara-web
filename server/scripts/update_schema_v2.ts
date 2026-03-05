import 'dotenv/config';
import mysql from 'mysql2/promise';

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    multipleStatements: true
});

async function run() {
    try {
        console.log('Applying schema updates v2...');

        // 1. Add Columns
        try {
            await pool.query("ALTER TABLE vehicles ADD COLUMN average_consumption DECIMAL(10, 2) DEFAULT 0.00");
            console.log("Added average_consumption to vehicles");
        } catch (e: any) {
            if (!e.message.includes("Duplicate column")) console.error("Error adding average_consumption:", e.message);
        }

        try {
            await pool.query("ALTER TABLE vehicles ADD COLUMN last_odometer DECIMAL(10, 2) DEFAULT 0.00");
            console.log("Added last_odometer to vehicles");
        } catch (e: any) {
            if (!e.message.includes("Duplicate column")) console.error("Error adding last_odometer:", e.message);
        }

        try {
            await pool.query("ALTER TABLE expenses ADD COLUMN ticket_log_id VARCHAR(255) UNIQUE");
            console.log("Added ticket_log_id to expenses");
        } catch (e: any) {
            if (!e.message.includes("Duplicate column")) console.error("Error adding ticket_log_id:", e.message);
        }

        // 2. Create Tables
        const queries = `
            CREATE TABLE IF NOT EXISTS leftover_cargo (
                id VARCHAR(36) PRIMARY KEY,
                route_id VARCHAR(36),
                driver_id VARCHAR(36),
                box_number INTEGER NOT NULL,
                photo_url TEXT NOT NULL,
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (route_id) REFERENCES routes(id) ON DELETE CASCADE,
                FOREIGN KEY (driver_id) REFERENCES drivers(id)
            );

            CREATE TABLE IF NOT EXISTS spreadsheet_closures (
                id VARCHAR(36) PRIMARY KEY,
                route_number TEXT NOT NULL,
                route_id VARCHAR(36),
                vehicle_id VARCHAR(36),
                status TEXT DEFAULT 'Pendente',
                reference_date DATE,
                km_real DECIMAL(10, 2),
                km_seara DECIMAL(10, 2),
                valor_km_seara DECIMAL(10, 2),
                valor_km_perdido DECIMAL(10, 2),
                descarga_total DECIMAL(10, 2),
                valor_diaria DECIMAL(10, 2),
                valor_total DECIMAL(10, 2),
                payment_date DATE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (route_id) REFERENCES routes(id),
                FOREIGN KEY (vehicle_id) REFERENCES vehicles(id)
            );

            CREATE TABLE IF NOT EXISTS spreadsheet_items (
                id VARCHAR(36) PRIMARY KEY,
                closure_id VARCHAR(36),
                route_number TEXT,
                valor_bruto DECIMAL(10, 2),
                data_envio DATE,
                data_previsao DATE,
                raw_data JSON,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (closure_id) REFERENCES spreadsheet_closures(id) ON DELETE CASCADE
            );
        `;

        await pool.query(queries);
        console.log('New tables created successfully.');

    } catch (e) {
        console.error('Failed to update schema v2:', e);
    } finally {
        await pool.end();
    }
}

run();
