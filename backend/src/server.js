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
// initialize pool early to fail fast if DATABASE_URL is missing
getPool();

const PORT = process.env.PORT || 4000;

// CORS: reflect request origin (allows prod + localhost) and support credentials
const corsOptions = {
  origin: (origin, callback) => {
    // allow requests with no origin like mobile apps or curl
    if (!origin) return callback(null, true);
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
};

app.use(cors(corsOptions));
// Explicitly handle preflight for all routes
app.options('*', cors(corsOptions));

app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

app.use('/auth', authRouter());
app.use('/org', orgRouter());
app.use('/departments', deptRouter());
app.use('/staff', staffRouter());
app.use('/student', studentRouter());
app.use('/notifications', notificationsRouter());
app.use('/uploads', uploadsRouter());

app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Server error' });
});

app.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`);
});
