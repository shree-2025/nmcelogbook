import express from 'express';
import multer from 'multer';
import { requireAuth } from '../middleware/auth.js';
import { uploadBuffer } from '../utils/storage.js';
import { randomUUID } from 'crypto';
import { query } from '../db.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } }); // 25MB

function safeName(name = '') {
  return name.replace(/[^a-zA-Z0-9._-]+/g, '_');
}

function slug(s = '') {
  return String(s)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50) || 'n-a';
}

router.post('/upload', requireAuth(['STAFF', 'STUDENT', 'DEPT', 'ORG']), upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file provided' });
    const role = String(req.user.role || '').toUpperCase();

    // Common org/dept names if available
    let orgSlug = 'org';
    let deptSlug = 'dept';
    if (req.user.orgId) {
      const orgRows = await query('SELECT name FROM organizations WHERE id = ? LIMIT 1', [req.user.orgId]);
      if (orgRows[0]?.name) orgSlug = slug(orgRows[0].name);
    }
    if (req.user.departmentId) {
      const deptRows = await query('SELECT name FROM departments WHERE id = ? LIMIT 1', [req.user.departmentId]);
      if (deptRows[0]?.name) deptSlug = slug(deptRows[0].name);
    }

    let prefix = 'misc';
    if (role === 'STUDENT') {
      // students/{org}/{dept}/{staff}/{student}
      let staffSlug = 'staff';
      if (req.user.staffId) {
        const rows = await query('SELECT name FROM staff WHERE id = ? LIMIT 1', [req.user.staffId]);
        if (rows[0]?.name) staffSlug = slug(rows[0].name);
      }
      let studentSlug = 'student';
      if (req.user.studentId) {
        const rows = await query('SELECT name FROM students WHERE id = ? LIMIT 1', [req.user.studentId]);
        if (rows[0]?.name) studentSlug = slug(rows[0].name);
      }
      prefix = `students/${orgSlug}/${deptSlug}/${staffSlug}/${studentSlug}`;
    } else if (role === 'STAFF') {
      // staff/{org}/{dept}/{staff}
      let staffSlug = 'staff';
      if (req.user.staffId) {
        const rows = await query('SELECT name FROM staff WHERE id = ? LIMIT 1', [req.user.staffId]);
        if (rows[0]?.name) staffSlug = slug(rows[0].name);
      }
      prefix = `staff/${orgSlug}/${deptSlug}/${staffSlug}`;
    } else if (role === 'DEPT') {
      // departments/{org}/{dept}
      prefix = `departments/${orgSlug}/${deptSlug}`;
    } else if (role === 'ORG') {
      // organizations/{org}
      prefix = `organizations/${orgSlug}`;
    } else {
      // fallback by role string
      prefix = `${(role || 'user').toLowerCase()}`;
    }

    const key = `${prefix}/${randomUUID()}_${safeName(req.file.originalname)}`;
    const out = await uploadBuffer({ key, buffer: req.file.buffer, contentType: req.file.mimetype });
    return res.json({ url: out.url, key: out.key, bucket: out.bucket, contentType: req.file.mimetype, size: req.file.size });
  } catch (e) {
    console.error('[upload] failed', e);
    res.status(500).json({ error: 'Upload failed' });
  }
});

export default function uploadsRouter() {
  return router;
}
