import 'dotenv/config';
import mysql from 'mysql2/promise';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials in .env');
    process.exit(1);
}

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

async function fetchSupabase(table: string) {
    const response = await fetch(`${supabaseUrl}/rest/v1/${table}?select=*`, {
        headers: {
            'apikey': supabaseKey as string,
            'Authorization': `Bearer ${supabaseKey}`
        }
    });
    if (!response.ok) {
        throw new Error(`Failed to fetch ${table}: ${response.statusText}`);
    }
    return await response.json();
}

async function migrateTable(tableName: string, mysqlTable: string, columnMapping?: Record<string, string>) {
    console.log(`Migrating ${tableName} -> ${mysqlTable}...`);
    try {
        const data = await fetchSupabase(tableName);
        if (!data || data.length === 0) {
            console.log(`No data in ${tableName}.`);
            return;
        }

        console.log(`Found ${data.length} records in ${tableName}.`);

        // Get columns from first record
        const sample = data[0];
        const columns = Object.keys(sample).filter(key => sample[key] !== undefined);

        // Filter out columns not in MySQL if any logic needed, but here assuming match or superset.
        // Actually, safest is to construct query dynamically based on keys.

        for (const row of data) {
            const cols = Object.keys(row);
            const vals = Object.values(row).map(v => {
                if (v === null) return null;
                if (typeof v === 'object') return JSON.stringify(v); // JSON columns
                // Fix date format if needed (Supabase usually returns ISO)
                return v;
            });

            const placeholders = cols.map(() => '?').join(', ');
            const query = `INSERT IGNORE INTO ${mysqlTable} (${cols.join(', ')}) VALUES (${placeholders})`; // Use INSERT IGNORE to skip duplicates

            try {
                await pool.execute(query, vals);
            } catch (err: any) {
                console.error(`Error inserting into ${mysqlTable}:`, err.message);
                // Continue with next row
            }
        }
        console.log(`Finished ${tableName}.`);

    } catch (e: any) {
        console.error(`Error migrating ${tableName}:`, e.message);
    }
}

async function run() {
    try {
        console.log('Starting migration...');

        // Order matters for Foreign Keys
        // 1. Independent tables: drivers, vehicles, admins
        await migrateTable('drivers', 'drivers');
        await migrateTable('vehicles', 'vehicles');
        await migrateTable('admins', 'admins');
        await migrateTable('shunters', 'shunters');

        // 2. Dependent tables
        await migrateTable('routes', 'routes');
        await migrateTable('expenses', 'expenses');
        await migrateTable('financial_closures', 'financial_closures');
        await migrateTable('payment_requests', 'payment_requests');
        await migrateTable('leftover_cargo', 'leftover_cargo');

        // 3. Spreadsheet tables (depend on routes/vehicles)
        await migrateTable('spreadsheet_closures', 'spreadsheet_closures');
        await migrateTable('spreadsheet_items', 'spreadsheet_items');

        // 4. Vehicle Daily Status (if exists)
        try {
            await migrateTable('vehicle_daily_status', 'vehicle_daily_status');
        } catch (e) {
            console.log('Skipping vehicle_daily_status (likely not in Supabase)');
        }

        console.log('Migration complete.');
    } catch (e) {
        console.error('Migration failed:', e);
    } finally {
        await pool.end();
    }
}

run();
