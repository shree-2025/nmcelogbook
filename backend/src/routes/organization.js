import express from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import multer from 'multer';
import { randomUUID } from 'crypto';
import { requireAuth } from '../middleware/auth.js';
import { query } from '../db.js';
import { sendMail } from '../utils/mailer.js';
import { uploadBuffer } from '../utils/storage.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

const deptCreateSchema = z.object({
  name: z.string().min(1),
  managerName: z.string().min(1),
  email: z.string().email(),
});

const bulkSchema = z.object({
  departments: z.array(deptCreateSchema).min(1),
});

function genTempPassword(len = 10) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*';
  let out = '';
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export default function orgRouter() {
  // Organization profile
  router.get('/me', requireAuth(['ORG']), async (req, res) => {
    try {
      const rows = await query(
        `SELECT o.id, o.name, o.email, o.avatar_url AS avatarUrl
         FROM organizations o
         WHERE o.id = ?
         LIMIT 1`,
        [req.user.orgId]
      );
      const me = rows[0];
      if (!me) return res.status(404).json({ error: 'Organization not found' });
      return res.json(me);
    } catch (err) {
      if (err && (err.code === 'ER_BAD_FIELD_ERROR' || err.errno === 1054)) {
        const rows2 = await query(
          `SELECT o.id, o.name, o.email
           FROM organizations o
           WHERE o.id = ?
           LIMIT 1`,
          [req.user.orgId]
        );
        const me2 = rows2[0];
        if (!me2) return res.status(404).json({ error: 'Organization not found' });
        return res.json({ ...me2, avatarUrl: null });
      }
      return res.status(500).json({ error: 'Failed to load profile' });
    }
  });

  // List departments for this organization with counts
  router.get('/departments', requireAuth(['ORG']), async (req, res) => {
    try {
      const orgId = req.user.orgId;
      const rows = await query(
        `SELECT d.id, d.name, d.email,
                (SELECT COUNT(*) FROM staff s WHERE s.department_id = d.id AND s.organization_id = d.organization_id) AS staffCount,
                (SELECT COUNT(*) FROM students st WHERE st.department_id = d.id AND st.organization_id = d.organization_id) AS studentCount,
                (SELECT COUNT(*) FROM student_logs sl WHERE sl.department_id = d.id AND sl.organization_id = d.organization_id) AS logCount
         FROM departments d
         WHERE d.organization_id = ?
         ORDER BY d.name ASC`,
        [orgId]
      );
      res.json(rows);
    } catch (e) {
      console.error('[org/departments] error', e);
      res.status(500).json({ error: 'Failed to load departments' });
    }
  });

  // Create a department under this organization
  router.post('/departments', requireAuth(['ORG']), async (req, res) => {
    const schema = z.object({ name: z.string().min(1), managerName: z.string().optional(), email: z.string().email() });
    const parse = schema.safeParse(req.body);
    if (!parse.success) return res.status(400).json({ error: parse.error.flatten() });
    try {
      const { name, managerName, email } = parse.data;
      const result = await query('INSERT INTO departments (name, email, organization_id) VALUES (?, ?, ?)', [name, email, req.user.orgId]);
      const id = result.insertId;
      res.json({ id, name, managerName, email });
    } catch (e) {
      console.error('[org/departments POST] error', e);
      res.status(500).json({ error: 'Failed to create department' });
    }
  });

  // Bulk create departments
  router.post('/departments/bulk', requireAuth(['ORG']), async (req, res) => {
    const schema = z.object({ departments: z.array(z.object({ name: z.string().min(1), managerName: z.string().optional(), email: z.string().email() })) });
    const parse = schema.safeParse(req.body);
    if (!parse.success) return res.status(400).json({ error: parse.error.flatten() });
    try {
      const items = parse.data.departments;
      for (const it of items) {
        await query('INSERT INTO departments (name, email, organization_id) VALUES (?, ?, ?)', [it.name, it.email, req.user.orgId]);
      }
      res.json({ ok: true });
    } catch (e) {
      console.error('[org/departments/bulk] error', e);
      res.status(500).json({ error: 'Bulk create failed' });
    }
  });

  // Update department
  router.put('/departments/:id', requireAuth(['ORG']), async (req, res) => {
    const depId = parseInt(req.params.id, 10);
    if (!depId) return res.status(400).json({ error: 'Invalid id' });
    const schema = z.object({ name: z.string().min(1), managerName: z.string().optional(), email: z.string().email() });
    const parse = schema.safeParse(req.body);
    if (!parse.success) return res.status(400).json({ error: parse.error.flatten() });
    try {
      const rows = await query('SELECT id, organization_id FROM departments WHERE id = ? LIMIT 1', [depId]);
      const d = rows[0];
      if (!d || d.organization_id !== req.user.orgId) return res.status(404).json({ error: 'Department not found' });
      await query('UPDATE departments SET name = ?, email = ? WHERE id = ?', [parse.data.name, parse.data.email, depId]);
      res.json({ ok: true });
    } catch (e) {
      console.error('[org/departments PUT] error', e);
      res.status(500).json({ error: 'Failed to update department' });
    }
  });

  // Delete department
  router.delete('/departments/:id', requireAuth(['ORG']), async (req, res) => {
    const depId = parseInt(req.params.id, 10);
    if (!depId) return res.status(400).json({ error: 'Invalid id' });
    try {
      const rows = await query('SELECT id, organization_id FROM departments WHERE id = ? LIMIT 1', [depId]);
      const d = rows[0];
      if (!d || d.organization_id !== req.user.orgId) return res.status(404).json({ error: 'Department not found' });
      await query('DELETE FROM departments WHERE id = ?', [depId]);
      res.json({ ok: true });
    } catch (e) {
      console.error('[org/departments DELETE] error', e);
      res.status(500).json({ error: 'Failed to delete department' });
    }
  });

  // Per-department lists for Organization Admin
  router.get('/departments/:id/staff', requireAuth(['ORG']), async (req, res) => {
    const depId = parseInt(req.params.id, 10);
    if (!depId) return res.status(400).json({ error: 'Invalid id' });
    try {
      const rows = await query('SELECT id, organization_id FROM departments WHERE id = ? LIMIT 1', [depId]);
      const d = rows[0];
      if (!d || d.organization_id !== req.user.orgId) return res.status(404).json({ error: 'Department not found' });
      const staff = await query(
        `SELECT s.id, s.name, s.email,
                'Staff' AS role,
                (SELECT COUNT(*) FROM students st WHERE st.staff_id = s.id AND st.department_id = s.department_id AND st.organization_id = s.organization_id) AS assignedCount
         FROM staff s
         WHERE s.department_id = ? AND s.organization_id = ?
         ORDER BY s.name ASC`,
        [depId, req.user.orgId]
      );
      res.json(staff);
    } catch (e) {
      console.error('[org/departments/:id/staff] error', e);
      res.status(500).json({ error: 'Failed to load staff' });
    }
  });

  // Students assigned to a specific staff within a department
  router.get('/departments/:depId/staff/:staffId/students', requireAuth(['ORG']), async (req, res) => {
    const depId = parseInt(req.params.depId, 10);
    const staffId = parseInt(req.params.staffId, 10);
    if (!depId || !staffId) return res.status(400).json({ error: 'Invalid id' });
    try {
      const rows = await query('SELECT id, organization_id FROM departments WHERE id = ? LIMIT 1', [depId]);
      const d = rows[0];
      if (!d || d.organization_id !== req.user.orgId) return res.status(404).json({ error: 'Department not found' });
      const srows = await query('SELECT id FROM staff WHERE id = ? AND department_id = ? AND organization_id = ? LIMIT 1', [staffId, depId, req.user.orgId]);
      if (!srows[0]) return res.status(404).json({ error: 'Staff not found' });
      const students = await query('SELECT id, name, email FROM students WHERE staff_id = ? AND department_id = ? AND organization_id = ? ORDER BY name ASC', [staffId, depId, req.user.orgId]);
      res.json(students);
    } catch (e) {
      console.error('[org/departments/:depId/staff/:staffId/students] error', e);
      res.status(500).json({ error: 'Failed to load students for staff' });
    }
  });

  router.get('/departments/:id/students', requireAuth(['ORG']), async (req, res) => {
    const depId = parseInt(req.params.id, 10);
    if (!depId) return res.status(400).json({ error: 'Invalid id' });
    try {
      const rows = await query('SELECT id, organization_id FROM departments WHERE id = ? LIMIT 1', [depId]);
      const d = rows[0];
      if (!d || d.organization_id !== req.user.orgId) return res.status(404).json({ error: 'Department not found' });
      const students = await query(
        `SELECT s.id, s.name, s.email,
                (SELECT COUNT(*) FROM student_logs sl WHERE sl.student_id = s.id AND sl.department_id = ? AND sl.organization_id = ?) AS logCount
         FROM students s
         WHERE s.department_id = ? AND s.organization_id = ?
         ORDER BY s.name ASC`,
        [depId, req.user.orgId, depId, req.user.orgId]
      );
      res.json(students);
    } catch (e) {
      console.error('[org/departments/:id/students] error', e);
      res.status(500).json({ error: 'Failed to load students' });
    }
  });

  router.get('/departments/:id/logs', requireAuth(['ORG']), async (req, res) => {
    const depId = parseInt(req.params.id, 10);
    if (!depId) return res.status(400).json({ error: 'Invalid id' });
    try {
      const rows = await query('SELECT id, organization_id FROM departments WHERE id = ? LIMIT 1', [depId]);
      const d = rows[0];
      if (!d || d.organization_id !== req.user.orgId) return res.status(404).json({ error: 'Department not found' });
      const logs = await query(
        `SELECT sl.id,
                sl.student_id AS studentId,
                sl.staff_id AS staffId,
                sl.department_id AS departmentId,
                sl.organization_id AS organizationId,
                sl.title,
                sl.activity_type AS activityType,
                sl.activity_date AS activityDate,
                sl.status,
                sl.created_at AS createdAt,
                COALESCE(st.name, sf.name) AS submittedBy
         FROM student_logs sl
         LEFT JOIN students st ON st.id = sl.student_id
         LEFT JOIN staff sf ON sf.id = sl.staff_id
         WHERE sl.department_id = ? AND sl.organization_id = ?
         ORDER BY sl.created_at DESC
         LIMIT 100`,
        [depId, req.user.orgId]
      );
      res.json(logs);
    } catch (e) {
      console.error('[org/departments/:id/logs] error', e);
      res.status(500).json({ error: 'Failed to load logs' });
    }
  });

  // Organization dashboard metrics
  router.get('/dashboard', requireAuth(['ORG']), async (req, res) => {
    try {
      const orgId = req.user.orgId;
      const [deptCountRow] = await query('SELECT COUNT(*) AS c FROM departments WHERE organization_id = ?', [orgId]);
      const [staffCountRow] = await query('SELECT COUNT(*) AS c FROM staff WHERE organization_id = ?', [orgId]);
      const [studentCountRow] = await query('SELECT COUNT(*) AS c FROM students WHERE organization_id = ?', [orgId]);

      const [pendingRow] = await query("SELECT COUNT(*) AS c FROM student_logs WHERE organization_id = ? AND LOWER(status) = 'pending'", [orgId]);
      const [approvedRow] = await query("SELECT COUNT(*) AS c FROM student_logs WHERE organization_id = ? AND LOWER(status) = 'approved'", [orgId]);
      const [rejectedRow] = await query("SELECT COUNT(*) AS c FROM student_logs WHERE organization_id = ? AND LOWER(status) = 'rejected'", [orgId]);
      const [totalLogsRow] = await query('SELECT COUNT(*) AS c FROM student_logs WHERE organization_id = ?', [orgId]);

      const announcements = await query(
        `SELECT id, title, content, created_at AS createdAt, role
         FROM announcements
         WHERE organization_id = ?
         ORDER BY created_at DESC
         LIMIT 5`,
        [orgId]
      );

      res.json({
        departments: deptCountRow?.c || 0,
        staff: staffCountRow?.c || 0,
        students: studentCountRow?.c || 0,
        logs: {
          pending: pendingRow?.c || 0,
          approved: approvedRow?.c || 0,
          rejected: rejectedRow?.c || 0,
          total: totalLogsRow?.c || 0,
        },
        announcements,
      });
    } catch (e) {
      console.error('[org/dashboard] error', e);
      res.status(500).json({ error: 'Failed to load dashboard' });
    }
  });

  // Department overview for Organization Admin
  router.get('/departments/:id/overview', requireAuth(['ORG']), async (req, res) => {
    try {
      const depId = parseInt(req.params.id, 10);
      if (!depId) return res.status(400).json({ error: 'Invalid department id' });
      const rows = await query('SELECT id, organization_id FROM departments WHERE id = ? LIMIT 1', [depId]);
      const d = rows[0];
      if (!d || d.organization_id !== req.user.orgId) return res.status(404).json({ error: 'Department not found' });

      const [staffCountRow] = await query('SELECT COUNT(*) AS c FROM staff WHERE department_id = ? AND organization_id = ?', [depId, req.user.orgId]);
      const [studentCountRow] = await query('SELECT COUNT(*) AS c FROM students WHERE department_id = ? AND organization_id = ?', [depId, req.user.orgId]);

      const [pendingRow] = await query("SELECT COUNT(*) AS c FROM student_logs WHERE department_id = ? AND organization_id = ? AND LOWER(status) = 'pending'", [depId, req.user.orgId]);
      const [approvedRow] = await query("SELECT COUNT(*) AS c FROM student_logs WHERE department_id = ? AND organization_id = ? AND LOWER(status) = 'approved'", [depId, req.user.orgId]);
      const [rejectedRow] = await query("SELECT COUNT(*) AS c FROM student_logs WHERE department_id = ? AND organization_id = ? AND LOWER(status) = 'rejected'", [depId, req.user.orgId]);
      const [totalLogsRow] = await query('SELECT COUNT(*) AS c FROM student_logs WHERE department_id = ? AND organization_id = ?', [depId, req.user.orgId]);

      res.json({
        staff: staffCountRow?.c || 0,
        students: studentCountRow?.c || 0,
        logs: {
          pending: pendingRow?.c || 0,
          approved: approvedRow?.c || 0,
          rejected: rejectedRow?.c || 0,
          total: totalLogsRow?.c || 0,
        }
      });
    } catch (e) {
      console.error('[org/departments/:id/overview] error', e);
      res.status(500).json({ error: 'Failed to load department overview' });
    }
  });

  // Update Organization profile (allow updating name only; email read-only)
  router.put('/me', requireAuth(['ORG']), async (req, res) => {
    const schema = z.object({ name: z.string().min(1).max(255) });
    const parse = schema.safeParse(req.body);
    if (!parse.success) return res.status(400).json({ error: parse.error.flatten() });
    try {
      await query('UPDATE organizations SET name = ? WHERE id = ?', [parse.data.name, req.user.orgId]);
      return res.json({ ok: true });
    } catch (e) {
      return res.status(500).json({ error: 'Failed to update organization' });
    }
  });

  // Upload and persist organization avatar
  router.post('/avatar', requireAuth(['ORG']), upload.single('file'), async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: 'No file provided' });
      const safeName = (name = '') => name.replace(/[^a-zA-Z0-9._-]+/g, '_');
      const slug = (s = '') => String(s).normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0,50)||'n-a';
      // org name
      let orgSlug = 'org';
      const orgRows = await query('SELECT name FROM organizations WHERE id = ? LIMIT 1', [req.user.orgId]);
      if (orgRows[0]?.name) orgSlug = slug(orgRows[0].name);
      const key = `organizations/${orgSlug}/${randomUUID()}_${safeName(req.file.originalname)}`;
      const out = await uploadBuffer({ key, buffer: req.file.buffer, contentType: req.file.mimetype });
      try {
        await query('UPDATE organizations SET avatar_url = ? WHERE id = ?', [out.url, req.user.orgId]);
        return res.json({ ok: true, avatarUrl: out.url, persisted: true });
      } catch (err) {
        if (err && (err.code === 'ER_BAD_FIELD_ERROR' || err.errno === 1054)) {
          return res.json({ ok: true, avatarUrl: out.url, persisted: false });
        }
        throw err;
      }
    } catch (e) {
      console.error('[org/avatar] failed', e);
      return res.status(500).json({ error: 'Failed to upload avatar' });
    }
  });
  // Ensure additional column exists for manager name (HOD) in a portable way
  (async () => {
    try {
      const rows = await query(
        `SELECT 1 FROM information_schema.COLUMNS 
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'departments' AND COLUMN_NAME = 'hod_name' 
         LIMIT 1`
      );
      const exists = Array.isArray(rows) && rows.length > 0;
      if (!exists) {
        try {
          await query(`ALTER TABLE departments ADD COLUMN hod_name VARCHAR(255) NULL`);
        } catch (err) {
          // ignore if lacks privilege or already exists due to race condition
        }
      }
    } catch (e) {
      // ignore metadata query issues on restricted environments
    }
  })();

  // Update Department
  router.put('/departments/:id', requireAuth(['ORG']), async (req, res) => {
    const schema = z.object({
      name: z.string().min(1),
      managerName: z.string().min(1),
      email: z.string().email()
    });

    const parse = schema.safeParse(req.body);
    if (!parse.success) return res.status(400).json({ error: parse.error.flatten() });
  
    const { name, managerName, email } = parse.data;
    const departmentId = parseInt(req.params.id, 10);
  
    try {
      // Check if department exists and belongs to this org
      const [dept] = await query(
        'SELECT id FROM departments WHERE id = ? AND organization_id = ?', 
        [departmentId, req.user.orgId]
      );
      
      if (!dept) {
        return res.status(404).json({ error: 'Department not found' });
      }
      
      // Check if email is already used by another department in this org
      const [existing] = await query(
        'SELECT id FROM departments WHERE email = ? AND organization_id = ? AND id != ?',
        [email, req.user.orgId, departmentId]
      );
      
      if (existing) {
        return res.status(409).json({ error: 'Email already in use by another department' });
      }
      
      await query(
        'UPDATE departments SET name = ?, hod_name = ?, email = ? WHERE id = ?',
        [name, managerName, email, departmentId]
      );
      
      res.json({ id: departmentId, name, managerName, email });
    } catch (error) {
      console.error('Error updating department:', error);
      res.status(500).json({ error: 'Failed to update department' });
    }
  });

  // Delete Department
  router.delete('/departments/:id', requireAuth(['ORG']), async (req, res) => {
    const departmentId = parseInt(req.params.id, 10);
  
    try {
      // Check if department exists and belongs to this org
      const [dept] = await query(
        'SELECT id FROM departments WHERE id = ? AND organization_id = ?', 
        [departmentId, req.user.orgId]
      );
      
      if (!dept) {
        return res.status(404).json({ error: 'Department not found' });
      }
      
      // Delete department (CASCADE will handle related staff/students)
      await query('DELETE FROM departments WHERE id = ?', [departmentId]);
      
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting department:', error);
      res.status(500).json({ error: 'Failed to delete department' });
    }
  });

  // Create Department under Organization
  router.post('/departments', requireAuth(['ORG']), async (req, res) => {
    const parse = deptCreateSchema.safeParse(req.body);
    if (!parse.success) return res.status(400).json({ error: parse.error.flatten() });
    const { name, managerName, email } = parse.data;
    const exists = await query('SELECT id FROM departments WHERE email = ? AND organization_id = ?', [email, req.user.orgId]);
    if (exists.length) return res.status(409).json({ error: 'Email already used' });

    const tempPassword = genTempPassword(12);
    const passwordHash = await bcrypt.hash(tempPassword, 10);
    const result = await query(
      'INSERT INTO departments (name, hod_name, email, password_hash, organization_id) VALUES (?, ?, ?, ?, ?)',
      [name, managerName, email, passwordHash, req.user.orgId]
    );

    const frontendOrigin = process.env.FRONTEND_ORIGIN || '';
    const loginUrl = `${frontendOrigin}`;
    try {
      await sendMail({
        to: email,
        subject: 'Your Department Account Credentials',
        text: `Hello ${managerName},\n\nYour department account has been created for ${name}.\n\nLogin URL: ${loginUrl}\nEmail: ${email}\nTemporary Password: ${tempPassword}\n\nPlease log in and change your password immediately.`,
      });
    } catch (e) {
      // Do not fail creation if email sending fails; log and continue
      console.warn('Failed to send department credential email:', e?.message || e);
    }

    res.json({ id: result.insertId, name, managerName, email });
  });

  // Bulk create departments
  router.post('/departments/bulk', requireAuth(['ORG']), async (req, res) => {
    const parse = bulkSchema.safeParse(req.body);
    if (!parse.success) return res.status(400).json({ error: parse.error.flatten() });
    const created = [];
    const skipped = [];
    const frontendOrigin = process.env.FRONTEND_ORIGIN || '';
    const loginUrl = `${frontendOrigin}`;
    for (const d of parse.data.departments) {
      try {
        const exists = await query('SELECT id FROM departments WHERE email = ? AND organization_id = ?', [d.email, req.user.orgId]);
        if (exists.length) {
          skipped.push({ email: d.email, reason: 'duplicate' });
          continue;
        }
        const temp = genTempPassword(12);
        const passwordHash = await bcrypt.hash(temp, 10);
        const result = await query(
          'INSERT INTO departments (name, hod_name, email, password_hash, organization_id) VALUES (?, ?, ?, ?, ?)',
          [d.name, d.managerName, d.email, passwordHash, req.user.orgId]
        );
        try {
          await sendMail({
            to: d.email,
            subject: 'Your Department Account Credentials',
            text: `Hello ${d.managerName},\n\nYour department account has been created for ${d.name}.\n\nLogin URL: ${loginUrl}\nEmail: ${d.email}\nTemporary Password: ${temp}\n\nPlease log in and change your password immediately.`,
          });
        } catch (e) {
          // continue even if email fails
        }
        created.push({ id: result.insertId, email: d.email });
      } catch (e) {
        skipped.push({ email: d.email, reason: 'error' });
      }
    }
    res.json({ created, skipped });
  });

  // List departments for the organization
  router.get('/departments', requireAuth(['ORG']), async (req, res) => {
    const rows = await query(
      'SELECT id, name, hod_name AS managerName, email FROM departments WHERE organization_id = ? ORDER BY id DESC',
      [req.user.orgId]
    );
    res.json(rows);
  });

  return router;
}
