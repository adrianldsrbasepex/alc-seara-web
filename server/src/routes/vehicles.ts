import { Router } from 'express';
import pool from '../db';

const router = Router();

// GET all vehicles
router.get('/', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM vehicles ORDER BY plate ASC');
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch vehicles' });
    }
});

// Create vehicle
router.post('/', async (req, res) => {
    const { plate, model, status, daily_rate, km_rate } = req.body;
    try {
        const id = crypto.randomUUID();
        await pool.query(
            'INSERT INTO vehicles (id, plate, model, status, daily_rate, km_rate) VALUES (?, ?, ?, ?, ?, ?)',
            [id, plate, model, status || 'Disponível', daily_rate || 0, km_rate || 0]
        );
        const [rows] = await pool.query('SELECT * FROM vehicles WHERE id = ?', [id]);
        res.status(201).json((rows as any)[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to create vehicle' });
    }
});

// Update vehicle
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const updates = req.body;

    try {
        // Dynamic query construction
        const fields: string[] = [];
        const values: any[] = [];

        Object.keys(updates).forEach(key => {
            if (key !== 'id' && key !== 'created_at') {
                fields.push(`${key} = ?`);
                values.push(updates[key]);
            }
        });

        if (fields.length === 0) {
            return res.status(400).json({ error: 'No fields to update' });
        }

        values.push(id);
        await pool.query(`UPDATE vehicles SET ${fields.join(', ')} WHERE id = ?`, values);

        const [rows] = await pool.query('SELECT * FROM vehicles WHERE id = ?', [id]);
        res.json((rows as any)[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to update vehicle' });
    }
});

// Delete vehicle
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM vehicles WHERE id = ?', [id]);
        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to delete vehicle' });
    }
});

// Get daily status for a month
router.get('/daily-status/:yearMonth', async (req, res) => {
    const { yearMonth } = req.params; // Format: YYYY-MM
    try {
        const [rows] = await pool.query(
            "SELECT * FROM vehicle_daily_status WHERE DATE_FORMAT(date, '%Y-%m') = ?",
            [yearMonth]
        );
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch daily status' });
    }
});

// Upsert daily status
router.post('/daily-status', async (req, res) => {
    const { vehicle_id, date, status, status_text } = req.body;
    try {
        const id = crypto.randomUUID();
        // UPSERT logic in MySQL: ON DUPLICATE KEY UPDATE
        const query = `
            INSERT INTO vehicle_daily_status (id, vehicle_id, date, status, status_text)
            VALUES (?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE status = VALUES(status), status_text = VALUES(status_text)
        `;

        await pool.query(query, [id, vehicle_id, date, status, status_text]);
        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to update daily status' });
    }
});

export default router;
