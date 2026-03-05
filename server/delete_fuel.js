const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
dotenv.config();

async function run() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 3306,
    });

    try {
        const [result] = await pool.query('DELETE FROM despesas WHERE tipo = ?', ['Combustível']);
        console.log(`Deleted rows: ${result.affectedRows}`);
    } catch (err) {
        console.error(err);
    } finally {
        pool.end();
    }
}
run();
