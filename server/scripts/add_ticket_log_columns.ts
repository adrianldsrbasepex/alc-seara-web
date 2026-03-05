import pool from '../src/db';

async function migrate() {
    try {
        console.log('Adding specific columns for Ticket Log integration...');

        // expenses table
        try {
            await pool.query('ALTER TABLE expenses ADD COLUMN ticket_log_id VARCHAR(255) UNIQUE');
            console.log('Added ticket_log_id to expenses');
        } catch (error: any) {
            if (error.code === 'ER_DUP_FIELDNAME') {
                console.log('ticket_log_id already exists in expenses');
            } else {
                console.error('Error adding ticket_log_id:', error);
            }
        }

        // vehicles table
        try {
            await pool.query('ALTER TABLE vehicles ADD COLUMN average_consumption DECIMAL(10, 2) DEFAULT 0.00');
            console.log('Added average_consumption to vehicles');
        } catch (error: any) {
            if (error.code === 'ER_DUP_FIELDNAME') {
                console.log('average_consumption already exists in vehicles');
            } else {
                console.error('Error adding average_consumption:', error);
            }
        }

        try {
            await pool.query('ALTER TABLE vehicles ADD COLUMN last_odometer DECIMAL(10, 2) DEFAULT 0.00');
            console.log('Added last_odometer to vehicles');
        } catch (error: any) {
            if (error.code === 'ER_DUP_FIELDNAME') {
                console.log('last_odometer already exists in vehicles');
            } else {
                console.error('Error adding last_odometer:', error);
            }
        }

        console.log('Migration completed.');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

migrate();
