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
// Support comma-separated list of allowed origins
const FRONTEND_ORIGIN = (process.env.FRONTEND_ORIGIN || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

// --- MIDDLEWARE ---
// CORS setup
const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (curl, mobile apps)
    if (!origin) return callback(null, true);
    // If no allowed origins configured, allow all (use with caution)
    if (FRONTEND_ORIGIN.length === 0) return callback(null, true);
    // Allow if in the configured list
    if (FRONTEND_ORIGIN.includes(origin)) return callback(null, true);
    return callback(new Error('CORS not allowed'));
  },
  credentials: true,
  methods: ['GET','HEAD','PUT','PATCH','POST','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization','X-Requested-With'],
};
app.use(cors(corsOptions));

// Handle preflight requests
app.options('*', cors(corsOptions));

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
