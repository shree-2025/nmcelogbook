import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import authRouter from './routes/auth.js';
import orgRouter from './routes/organization.js';
import deptRouter from './routes/department.js';
import staffRouter from './routes/staff.js';
import studentRouter from './routes/student.js';
import notificationsRouter from './routes/notifications.js';
import uploadsRouter from './routes/uploads.js';
import { getPool } from './db.js';

const app = express();

// Initialize MySQL pool early to fail fast
getPool();

// Environment variables
const PORT = process.env.PORT || 4000;
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || '*';

// --- MIDDLEWARE ---
// CORS setup
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (curl, mobile apps) or from frontend
    if (!origin || origin === FRONTEND_ORIGIN) return callback(null, true);
    return callback(new Error('CORS not allowed'));
  },
  credentials: true,
  methods: ['GET','HEAD','PUT','PATCH','POST','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization','X-Requested-With'],
}));

// Handle preflight requests
app.options('*', cors());

// Parse JSON & URL-encoded
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- HEALTH CHECK ---
app.get('/health', (req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

// --- ROUTES ---
app.use('/auth', authRouter());
app.use('/org', orgRouter());
app.use('/departments', deptRouter());
app.use('/staff', staffRouter());
app.use('/student', studentRouter());
app.use('/notifications', notificationsRouter());
app.use('/uploads', uploadsRouter());

// --- ERROR HANDLER ---
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ error: err.message || 'Server error' });
});

// --- START SERVER ---
app.listen(PORT, () => {
  console.log(`API running on port ${PORT}`);
});
