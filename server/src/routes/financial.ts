import { Router } from 'express';
import pool from '../db';
import { randomUUID } from 'crypto';

const router = Router();

// Expenses
router.get('/expenses', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM expenses ORDER BY date DESC');
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch expenses' });
    }
});

router.post('/expenses', async (req, res) => {
    const id = randomUUID();
    const { route_id, driver_id, type, amount, liters, date, notes, img_url, ticket_log_id } = req.body;
    try {
        await pool.query(
            `INSERT INTO expenses (id, route_id, driver_id, type, amount, liters, date, notes, img_url, ticket_log_id) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [id, route_id, driver_id, type, amount, liters, date, notes, img_url, ticket_log_id || null]
        );
        const [rows] = await pool.query('SELECT * FROM expenses WHERE id = ?', [id]);
        res.status(201).json((rows as any)[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to create expense' });
    }
});

router.put('/expenses/:id', async (req, res) => {
    const { id } = req.params;
    const updates = req.body; // Expecting partial updates object

    // Construct dynamic update query
    const fields = [];
    const values = [];
    for (const [key, value] of Object.entries(updates)) {
        // Whitelist allowed fields to prevent SQL injection or invalid columns
        if (['route_id', 'driver_id', 'vehicle_id', 'type', 'amount', 'liters', 'date', 'notes', 'img_url', 'ticket_log_id', 'reimbursement_sent'].includes(key)) {
            fields.push(`${key} = ?`);
            values.push(value);
        }
    }

    if (fields.length === 0) {
        return res.status(400).json({ error: 'No valid fields to update' });
    }

    values.push(id);
    const sql = `UPDATE expenses SET ${fields.join(', ')} WHERE id = ?`;

    try {
        await pool.query(sql, values);
        const [rows] = await pool.query('SELECT * FROM expenses WHERE id = ?', [id]);
        res.json((rows as any)[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to update expense' });
    }
});

// Closures
router.get('/closures', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM financial_closures ORDER BY created_at DESC');
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch closures' });
    }
});

router.get('/closures/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const [rows] = await pool.query('SELECT * FROM financial_closures WHERE id = ?', [id]);
        if ((rows as any).length === 0) {
            return res.status(404).json({ error: 'Closure not found' });
        }
        res.json((rows as any)[0]);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch closure' });
    }
});

router.post('/closures', async (req, res) => {
    const id = randomUUID();
    const { date_start, date_end, total_revenue, total_expenses, total_driver_salary,
        total_maintenance, total_wash, total_damage, notes } = req.body;
    try {
        await pool.query(
            `INSERT INTO financial_closures (id, date_start, date_end, total_revenue, total_expenses, 
            total_driver_salary, total_maintenance, total_wash, total_damage, notes) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [id, date_start, date_end, total_revenue, total_expenses, total_driver_salary,
                total_maintenance, total_wash, total_damage, notes || null]
        );
        const [rows] = await pool.query('SELECT * FROM financial_closures WHERE id = ?', [id]);
        res.status(201).json((rows as any)[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to create closure' });
    }
});

// Payment Requests
router.get('/payment-requests', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM payment_requests ORDER BY date DESC');
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch payment requests' });
    }
});

router.post('/payment-requests', async (req, res) => {
    const id = randomUUID();
    const { driver_id, type, amount, date, description, metodo_pagamento, comprovante_url } = req.body;
    try {
        await pool.query(
            `INSERT INTO payment_requests (id, driver_id, type, amount, date, description, metodo_pagamento, comprovante_url, status) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Aguardando')`,
            [id, driver_id, type, amount, date, description, metodo_pagamento, comprovante_url]
        );
        const [rows] = await pool.query('SELECT * FROM payment_requests WHERE id = ?', [id]);
        res.status(201).json((rows as any)[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to create payment request' });
    }
});

// Update payment request (generic)
router.put('/payment-requests/:id', async (req, res) => {
    const { id } = req.params;
    const updates = req.body;
    const fields = [];
    const values = [];

    for (const [key, value] of Object.entries(updates)) {
        if (['driver_id', 'type', 'amount', 'date', 'description', 'metodo_pagamento', 'comprovante_url', 'status'].includes(key)) {
            fields.push(`${key} = ?`);
            values.push(value);
        }
    }

    if (fields.length === 0) {
        return res.status(400).json({ error: 'No valid fields to update' });
    }

    values.push(id);
    const sql = `UPDATE payment_requests SET ${fields.join(', ')} WHERE id = ?`;

    try {
        await pool.query(sql, values);
        const [rows] = await pool.query('SELECT * FROM payment_requests WHERE id = ?', [id]);
        res.json((rows as any)[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to update payment request' });
    }
});

// Delete payment request
router.delete('/payment-requests/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM payment_requests WHERE id = ?', [id]);
        res.status(204).send();
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to delete payment request' });
    }
});

router.put('/payment-requests/:id/status', async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    try {
        await pool.query('UPDATE payment_requests SET status = ? WHERE id = ?', [status, id]);
        const [rows] = await pool.query('SELECT * FROM payment_requests WHERE id = ?', [id]);
        res.json((rows as any)[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to update payment request status' });
    }
});

export default router;
