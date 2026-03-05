import { Router } from 'express';
import pool from '../db';

const router = Router();

// GET all drivers
router.get('/', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM drivers ORDER BY name ASC');
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch drivers' });
    }
});

// Create driver
router.post('/', async (req, res) => {
    const { nome, email, telefone, placa, modeloVeiculo, avatarUrl, tipo } = req.body;
    try {
        const id = crypto.randomUUID();
        await pool.query(
            'INSERT INTO drivers (id, name, email, phone, license_plate, vehicle_model, avatar_url) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [id, nome, email, telefone, placa, modeloVeiculo, avatarUrl]
        );
        const [rows] = await pool.query('SELECT * FROM drivers WHERE id = ?', [id]);
        res.status(201).json((rows as any)[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to create driver' });
    }
});

// Update driver
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const updates = req.body;

    // Map camelCase to snake_case
    const dbUpdates: any = {};
    if (updates.nome) dbUpdates.name = updates.nome;
    if (updates.email) dbUpdates.email = updates.email;
    if (updates.telefone) dbUpdates.phone = updates.telefone;
    if (updates.placa) dbUpdates.license_plate = updates.placa;
    if (updates.modeloVeiculo) dbUpdates.vehicle_model = updates.modeloVeiculo;
    if (updates.avatarUrl) dbUpdates.avatar_url = updates.avatarUrl;

    try {
        const fields: string[] = [];
        const values: any[] = [];

        Object.keys(dbUpdates).forEach(key => {
            fields.push(`${key} = ?`);
            values.push(dbUpdates[key]);
        });

        if (fields.length === 0) return res.status(400).json({ error: 'No updates provided' });

        values.push(id);

        await pool.query(`UPDATE drivers SET ${fields.join(', ')} WHERE id = ?`, values);
        const [rows] = await pool.query('SELECT * FROM drivers WHERE id = ?', [id]);
        res.json((rows as any)[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to update driver' });
    }
});

// Delete driver
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM drivers WHERE id = ?', [id]);
        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to delete driver' });
    }
});

export default router;
