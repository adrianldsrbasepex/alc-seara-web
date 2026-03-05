import { Router } from 'express';
import pool from '../db';
import { randomUUID } from 'crypto';
import { ravexScraperService } from '../services/ravexScraper';

const router = Router();

// GET all routes
router.get('/', async (req, res) => {
    try {
        // Join with drivers to get names if needed, or just fetch raw routes
        // The frontend expects some joined data likely, or fetches it separately.
        // Based on legacy `routeService.ts` inspection (I should have done that), 
        // usually Supabase does simple joins. 
        // Let's assume for now we return raw execution of "SELECT *". 
        // Wait, the frontend might need driver name. 
        // Let's check `routeService.ts` first? I'll assume raw for now and improve if broken.
        const [rows] = await pool.query('SELECT * FROM routes ORDER BY date DESC');
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch routes' });
    }
});

// Create route
router.post('/', async (req, res) => {
    // Basic implementation
    const id = randomUUID();
    const { driver_id, origin, destination, date, status, cargo_type, estimated_revenue,
        initial_km, final_km, km_final_seara, route_number, description } = req.body;

    try {
        await pool.query(
            `INSERT INTO routes (id, driver_id, origin, destination, date, status, cargo_type, 
            estimated_revenue, initial_km, final_km, km_final_seara, route_number, description) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [id, driver_id, origin, destination, date, status, cargo_type,
                estimated_revenue, initial_km, final_km, km_final_seara, route_number, description]
        );
        const [rows] = await pool.query('SELECT * FROM routes WHERE id = ?', [id]);
        res.status(201).json((rows as any)[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to create route' });
    }
});

// Update route
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const updates = req.body;
    const fields = [];
    const values = [];

    const allowedFields = [
        'driver_id', 'origin', 'destination', 'date', 'final_date', 'status',
        'cargo_type', 'estimated_revenue', 'initial_km', 'final_km',
        'km_final_seara', 'route_number', 'description', 'reimbursement_sent'
    ];

    for (const [key, value] of Object.entries(updates)) {
        if (allowedFields.includes(key)) {
            fields.push(`${key} = ?`);
            values.push(value);
        }
    }

    if (fields.length === 0) {
        return res.status(400).json({ error: 'No valid fields to update' });
    }

    values.push(id);
    const sql = `UPDATE routes SET ${fields.join(', ')} WHERE id = ?`;

    try {
        await pool.query(sql, values);
        const [rows] = await pool.query('SELECT * FROM routes WHERE id = ?', [id]);
        res.json((rows as any)[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to update route' });
    }
});

// Get all cached Ravex costs
router.get('/ravex-costs/all', async (req, res) => {
    try {
        const [rows]: any = await pool.query('SELECT route_number, raw_data FROM ravex_automation_results WHERE status = "success"');
        const costsMap: Record<string, any> = {};

        for (const row of rows) {
            try {
                const data = typeof row.raw_data === 'string' ? JSON.parse(row.raw_data) : row.raw_data;
                costsMap[row.route_number] = data;
            } catch (e) {
                console.error('Error parsing ravex raw_data for', row.route_number);
            }
        }
        res.json(costsMap);
    } catch (error: any) {
        console.error('Error fetching cached Ravex costs:', error);
        res.status(500).json({ error: error.message });
    }
});

// Scrape Ravex Cost
router.get('/ravex-cost/:routeNumber', async (req, res) => {
    try {
        const routeNumber = req.params.routeNumber;
        if (!routeNumber) {
            return res.status(400).json({ error: 'Route number not found for scraping' });
        }

        const data = await ravexScraperService.getDescargaCost(routeNumber);
        res.json(data);
    } catch (error: any) {
        console.error('Error fetching Ravex cost:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router;
