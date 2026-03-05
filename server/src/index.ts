import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pool from './db';
import driverRoutes from './routes/drivers';
import vehicleRoutes from './routes/vehicles';
import routeRoutes from './routes/routes';
import financialRoutes from './routes/financial';
import authRoutes from './routes/auth';
import uploadRoutes from './routes/uploads';
import path from 'path';
import { ravexAutomationService } from './services/ravexAutomation';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/drivers', driverRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/routes', routeRoutes);
app.use('/api/financial', financialRoutes);
app.use('/api/upload', uploadRoutes);

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.get('/health', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT 1');
        res.json({ status: 'ok', db: 'connected' });
    } catch (error: any) {
        console.error('Database connection failed:', error);
        res.status(500).json({ status: 'error', db: 'disconnected', details: error.message });
    }
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);

    // Start the Ravex sync background job
    ravexAutomationService.start();
});
