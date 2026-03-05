import 'dotenv/config';
import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    multipleStatements: true // Required for schema.sql
});

async function run() {
    try {
        console.log('Initializing database schema...');
        const schemaPath = path.join(__dirname, '../schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');

        console.log(`Executing schema from ${schemaPath}...`);
        await pool.query(schema);

        console.log('Database initialized successfully.');
    } catch (e) {
        console.error('Failed to initialize database:', e);
    } finally {
        await pool.end();
    }
}

run();
