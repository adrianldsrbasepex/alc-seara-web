import { Router } from 'express';
import pool from '../db';

const router = Router();

// Login
router.post('/login', async (req, res) => {
    const { email, password, type } = req.body;

    try {
        let table = '';
        if (type === 'ADMIN') table = 'admins';
        else if (type === 'MANOBRISTA') table = 'shunters';
        else {
            return res.status(400).json({ error: 'Invalid login type for this endpoint' });
        }

        const [rows] = await pool.query(`SELECT * FROM ${table} WHERE email = ? AND password = ?`, [email, password]);
        const users = rows as any[];

        if (users.length > 0) {
            res.json(users[0]);
        } else {
            res.status(401).json({ error: 'Invalid credentials' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Login failed' });
    }
});

// Sync Check (for App.tsx vehicle check etc)
router.get('/sync/vehicles/count', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT COUNT(*) as count FROM vehicles');
        res.json({ count: (rows as any)[0].count });
    } catch (error) {
        res.status(500).json({ error: 'Failed' });
    }
});

export default router;
