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

const staffCreateSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  // password optional; if omitted, we generate a temp password
  password: z.string().min(6).optional(),
});

export default function deptRouter() {
  // Department profile
  router.get('/me', requireAuth(['DEPT']), async (req, res) => {
    try {
      const rows = await query(
        `SELECT d.id, d.name, d.email, d.organization_id AS organizationId,
                o.name AS organizationName, d.avatar_url AS avatarUrl,
                o.avatar_url AS organizationAvatarUrl
         FROM departments d
         LEFT JOIN organizations o ON o.id = d.organization_id
         WHERE d.id = ?
         LIMIT 1`,
        [req.user.departmentId]
      );
      const me = rows[0];
      if (!me) return res.status(404).json({ error: 'Department not found' });
      res.json(me);
    } catch (err) {
      if (err && (err.code === 'ER_BAD_FIELD_ERROR' || err.errno === 1054)) {
        const rows2 = await query(
          `SELECT d.id, d.name, d.email, d.organization_id AS organizationId,
                  o.name AS organizationName
           FROM departments d
           LEFT JOIN organizations o ON o.id = d.organization_id
           WHERE d.id = ?
           LIMIT 1`,
          [req.user.departmentId]
        );
        const me2 = rows2[0];
        if (!me2) return res.status(404).json({ error: 'Department not found' });
        return res.json({ ...me2, avatarUrl: null, organizationAvatarUrl: null });
      }
      return res.status(500).json({ error: 'Failed to load profile' });
    }
  });

  // Upload and persist department avatar
  router.post('/avatar', requireAuth(['DEPT']), upload.single('file'), async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: 'No file provided' });
      const safeName = (name = '') => name.replace(/[^a-zA-Z0-9._-]+/g, '_');
      const slug = (s = '') => String(s).normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0,50)||'n-a';
      // org/department names
      let orgSlug = 'org';
      const orgRows = await query('SELECT name FROM organizations WHERE id = ? LIMIT 1', [req.user.orgId]);
      if (orgRows[0]?.name) orgSlug = slug(orgRows[0].name);
      let deptSlug = 'dept';
      const deptRows = await query('SELECT name FROM departments WHERE id = ? LIMIT 1', [req.user.departmentId]);
      if (deptRows[0]?.name) deptSlug = slug(deptRows[0].name);
      const key = `departments/${orgSlug}/${deptSlug}/${randomUUID()}_${safeName(req.file.originalname)}`;
      const out = await uploadBuffer({ key, buffer: req.file.buffer, contentType: req.file.mimetype });
      try {
        await query('UPDATE departments SET avatar_url = ? WHERE id = ?', [out.url, req.user.departmentId]);
        return res.json({ ok: true, avatarUrl: out.url, persisted: true });
      } catch (err) {
        if (err && (err.code === 'ER_BAD_FIELD_ERROR' || err.errno === 1054)) {
          return res.json({ ok: true, avatarUrl: out.url, persisted: false });
        }
        throw err;
      }
    } catch (e) {
      console.error('[dept/avatar] failed', e);
      return res.status(500).json({ error: 'Failed to upload avatar' });
    }
  });

  // Department Admin: Generate staff report data (students + their logs + attachments)
  router.get('/:departmentId/staff/:staffId/report', requireAuth(['DEPT']), async (req, res) => {
    const departmentId = parseInt(req.params.departmentId, 10);
    const staffId = parseInt(req.params.staffId, 10);
    if (!departmentId || departmentId !== req.user.departmentId) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    if (!staffId) return res.status(400).json({ error: 'Invalid staff id' });

    // Ensure staff belongs to this department & org
    const staffRows = await query(
      `SELECT id, name, email, department_id AS departmentId, organization_id AS organizationId
       FROM staff WHERE id = ? LIMIT 1`,
      [staffId]
    );
    const staff = staffRows[0];
    if (!staff || staff.departmentId !== req.user.departmentId || staff.organizationId !== req.user.orgId) {
      return res.status(404).json({ error: 'Staff not found in this department' });
    }

    // Students under this staff
    const students = await query(
      `SELECT id, name, email, avatar_url AS avatarUrl
       FROM students
       WHERE staff_id = ? AND department_id = ? AND organization_id = ?
       ORDER BY name ASC`,
      [staffId, req.user.departmentId, req.user.orgId]
    );

    if (!students.length) {
      return res.json({ staff, students: [], logs: [], attachments: [] });
    }

    const studentIds = students.map(s => s.id);
    const placeholders = studentIds.map(() => '?').join(',');
    const logs = await query(
      `SELECT id, student_id AS studentId, activity_date AS activityDate, activity_type AS activityType,
              title, detailed_description AS detailedDescription, department, level_of_involvement AS levelOfInvolvement,
              patient_id AS patientId, age_gender AS ageGender, diagnosis, status, faculty_remark AS facultyRemark,
              created_at AS createdAt, updated_at AS updatedAt
       FROM student_logs
       WHERE student_id IN (${placeholders})
       ORDER BY activity_date DESC, id DESC`,
      studentIds
    );

    let attachments = [];
    if (logs.length) {
      const logIds = logs.map(l => l.id);
      const ph2 = logIds.map(() => '?').join(',');
      attachments = await query(
        `SELECT log_id AS logId, url, content_type AS contentType, size, created_at AS createdAt
         FROM student_log_files
         WHERE log_id IN (${ph2})
         ORDER BY id ASC`,
        logIds
      );
    }

    res.json({ staff, students, logs, attachments });
  });

  // Department Admin: Staff uploads with student lists
  router.get('/me/staff-uploads', requireAuth(['DEPT']), async (req, res) => {
    const orgId = req.user.orgId;
    const depId = req.user.departmentId;
    // Staff summary
    const staffSummary = await query(
      `SELECT st.id AS staffId, st.name AS staffName,
              COUNT(sl.id) AS totalLogs,
              COUNT(DISTINCT s.id) AS studentsCount
       FROM staff st
       LEFT JOIN students s ON s.staff_id = st.id AND s.department_id = ? AND s.organization_id = ?
       LEFT JOIN student_logs sl ON sl.student_id = s.id
       WHERE st.department_id = ? AND st.organization_id = ?
       GROUP BY st.id
       ORDER BY st.name ASC`,
      [depId, orgId, depId, orgId]
    );
    // Student-level counts
    const studentCounts = await query(
      `SELECT s.id AS studentId, s.name AS studentName, s.staff_id AS staffId,
              COUNT(sl.id) AS uploads
       FROM students s
       LEFT JOIN student_logs sl ON sl.student_id = s.id
       WHERE s.department_id = ? AND s.organization_id = ?
       GROUP BY s.id
       ORDER BY s.name ASC`,
      [depId, orgId]
    );
    res.json({ staff: staffSummary, students: studentCounts });
  });
  // Department Admin: Announcements CRUD (scoped to department & org)
  router.get('/me/announcements', requireAuth(['DEPT']), async (req, res) => {
    const rows = await query(
      `SELECT id, title, content, created_at AS createdAt, role,
              'Department' AS postedBy
       FROM announcements
       WHERE organization_id = ? AND department_id = ?
       ORDER BY created_at DESC`,
      [req.user.orgId, req.user.departmentId]
    );
    res.json(rows);
  });

  // Department Admin Dashboard metrics
  router.get('/me/dashboard', requireAuth(['DEPT']), async (req, res) => {
    const days = parseInt(String(req.query.days || ''), 10);
    const df = (!Number.isNaN(days) && days > 0) ? ` AND activity_date >= DATE_SUB(CURDATE(), INTERVAL ${days} DAY)` : '';

    const staffCountRows = await query(
      'SELECT COUNT(*) AS c FROM staff WHERE department_id = ? AND organization_id = ?',
      [req.user.departmentId, req.user.orgId]
    );
    const studentCountRows = await query(
      'SELECT COUNT(*) AS c FROM students WHERE department_id = ? AND organization_id = ?',
      [req.user.departmentId, req.user.orgId]
    );
    const pendingLogsRows = await query(
      `SELECT COUNT(*) AS c FROM student_logs WHERE department_id = ? AND organization_id = ? AND LOWER(status) = 'pending'${df}`,
      [req.user.departmentId, req.user.orgId]
    );
    const approvedLogsRows = await query(
      `SELECT COUNT(*) AS c FROM student_logs WHERE department_id = ? AND organization_id = ? AND LOWER(status) = 'approved'${df}`,
      [req.user.departmentId, req.user.orgId]
    );
    const rejectedLogsRows = await query(
      `SELECT COUNT(*) AS c FROM student_logs WHERE department_id = ? AND organization_id = ? AND LOWER(status) = 'rejected'${df}`,
      [req.user.departmentId, req.user.orgId]
    );
    const totalLogsRows = await query(
      `SELECT COUNT(*) AS c FROM student_logs WHERE department_id = ? AND organization_id = ?${df}`,
      [req.user.departmentId, req.user.orgId]
    );
    const announcementsCountRows = await query(
      `SELECT COUNT(*) AS c FROM announcements WHERE organization_id = ? AND department_id = ?`,
      [req.user.orgId, req.user.departmentId]
    );

    res.json({
      staffCount: staffCountRows[0]?.c || 0,
      studentCount: studentCountRows[0]?.c || 0,
      pendingLogs: pendingLogsRows[0]?.c || 0,
      approvedLogs: approvedLogsRows[0]?.c || 0,
      rejectedLogs: rejectedLogsRows[0]?.c || 0,
      totalLogs: totalLogsRows[0]?.c || 0,
      announcements: announcementsCountRows[0]?.c || 0,
    });
  });

  router.post('/me/announcements', requireAuth(['DEPT']), async (req, res) => {
    const schema = z.object({ title: z.string().min(1), content: z.string().min(1), audience: z.enum(['ALL','STUDENT','STAFF']).optional() });
    const parse = schema.safeParse(req.body);
    if (!parse.success) return res.status(400).json({ error: parse.error.flatten() });
    const { title, content, audience } = parse.data;
    const role = audience || 'ALL';
    const r = await query(
      `INSERT INTO announcements (role, title, content, organization_id, department_id) VALUES (?, ?, ?, ?, ?)`,
      [role, title, content, req.user.orgId, req.user.departmentId]
    );
    res.json({ id: r.insertId, title, content });
  });

  router.put('/me/announcements/:id', requireAuth(['DEPT']), async (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (!id) return res.status(400).json({ error: 'Invalid id' });
    // Must belong to same org/department
    const rows = await query('SELECT id, organization_id, department_id FROM announcements WHERE id = ?', [id]);
    const a = rows[0];
    if (!a || a.organization_id !== req.user.orgId || a.department_id !== req.user.departmentId) {
      return res.status(404).json({ error: 'Announcement not found' });
    }
    const schema = z.object({ title: z.string().min(1).optional(), content: z.string().min(1).optional(), audience: z.enum(['ALL','STUDENT','STAFF']).optional() });
    const parse = schema.safeParse(req.body);
    if (!parse.success) return res.status(400).json({ error: parse.error.flatten() });
    const u = parse.data; const fields = []; const vals = [];
    if (u.title !== undefined) { fields.push('title = ?'); vals.push(u.title); }
    if (u.content !== undefined) { fields.push('content = ?'); vals.push(u.content); }
    if (u.audience !== undefined) { fields.push('role = ?'); vals.push(u.audience); }
    if (!fields.length) return res.json({ ok: true });
    vals.push(id);
    await query(`UPDATE announcements SET ${fields.join(', ')} WHERE id = ?`, vals);
    res.json({ ok: true });
  });

  router.delete('/me/announcements/:id', requireAuth(['DEPT']), async (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (!id) return res.status(400).json({ error: 'Invalid id' });
    const rows = await query('SELECT id, organization_id, department_id FROM announcements WHERE id = ?', [id]);
    const a = rows[0];
    if (!a || a.organization_id !== req.user.orgId || a.department_id !== req.user.departmentId) {
      return res.status(404).json({ error: 'Announcement not found' });
    }
    await query('DELETE FROM announcements WHERE id = ?', [id]);
    res.json({ ok: true });
  });
  // List staff under a department
  router.get('/:departmentId/staff', requireAuth(['DEPT']), async (req, res) => {
    const departmentId = parseInt(req.params.departmentId, 10);
    if (!departmentId || departmentId !== req.user.departmentId) {
      return res.status(403).json({ error: 'Cannot view staff outside your department' });
    }
    const rows = await query(
      'SELECT id, name, email, department_id AS departmentId, organization_id AS organizationId, created_at AS createdAt FROM staff WHERE department_id = ? ORDER BY name ASC',
      [departmentId]
    );
    res.json(rows);
  });

  // Department creates Staff (teachers)
  router.post('/:departmentId/staff', requireAuth(['DEPT']), async (req, res) => {
    const parse = staffCreateSchema.safeParse(req.body);
    if (!parse.success) return res.status(400).json({ error: parse.error.flatten() });

    const departmentId = parseInt(req.params.departmentId, 10);
    if (!departmentId || departmentId !== req.user.departmentId) {
      return res.status(403).json({ error: 'Cannot create staff outside your department' });
    }

    const { name, email } = parse.data;
    const exists = await query('SELECT id FROM staff WHERE email = ?', [email]);
    if (exists.length) return res.status(409).json({ error: 'Email already used' });

    // Generate a temporary password if one is not provided
    const tempPassword = parse.data.password || Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-2);
    const passwordHash = await bcrypt.hash(tempPassword, 10);
    const result = await query(
      'INSERT INTO staff (name, email, password_hash, must_change_password, department_id, organization_id) VALUES (?, ?, ?, 1, ?, ?)',
      [name, email, passwordHash, departmentId, req.user.orgId]
    );

    // Email login link and temp password
    const baseUrl = process.env.FRONTEND_ORIGIN || process.env.APP_BASE_URL || 'http://localhost:5173';
    const loginUrl = `${baseUrl}/login?role=Staff`;
    try {
      await sendMail({
        to: email,
        subject: 'Your ElogBook Staff Account',
        text: `Hello ${name},\n\nYour staff account has been created.\nLogin: ${loginUrl}\nTemporary Password: ${tempPassword}\n\nYou will be asked to change your password on first login.`,
        html: `<p>Hello ${name},</p><p>Your staff account has been created.</p><p><strong>Login:</strong> <a href="${loginUrl}">${loginUrl}</a><br/><strong>Temporary Password:</strong> ${tempPassword}</p><p>You will be asked to change your password on first login.</p>`,
      });
    } catch (e) {
      console.warn('[mail] failed to send staff invite', e);
    }

    res.json({ id: result.insertId, name, email, departmentId });
  });

  // Update a staff member's basic info (name, email)
  router.put('/:departmentId/staff/:staffId', requireAuth(['DEPT']), async (req, res) => {
    const departmentId = parseInt(req.params.departmentId, 10);
    const staffId = parseInt(req.params.staffId, 10);
    if (!departmentId || departmentId !== req.user.departmentId) {
      return res.status(403).json({ error: 'Cannot modify staff outside your department' });
    }
    if (!staffId) return res.status(400).json({ error: 'Invalid staff id' });

    const updateSchema = z.object({
      name: z.string().min(1).optional(),
      email: z.string().email().optional(),
    }).refine((data) => Object.keys(data).length > 0, { message: 'No fields to update' });

    const parse = updateSchema.safeParse(req.body);
    if (!parse.success) return res.status(400).json({ error: parse.error.flatten() });

    // Ensure staff belongs to this department
    const rows = await query('SELECT id, department_id FROM staff WHERE id = ?', [staffId]);
    const staff = rows[0];
    if (!staff || staff.department_id !== departmentId) {
      return res.status(404).json({ error: 'Staff not found in this department' });
    }

    // If changing email, ensure uniqueness
    if (parse.data.email) {
      const exists = await query('SELECT id FROM staff WHERE email = ? AND id <> ?', [parse.data.email, staffId]);
      if (exists.length) return res.status(409).json({ error: 'Email already used' });
    }

    const fields = [];
    const values = [];
    if (parse.data.name !== undefined) { fields.push('name = ?'); values.push(parse.data.name); }
    if (parse.data.email !== undefined) { fields.push('email = ?'); values.push(parse.data.email); }
    if (!fields.length) return res.status(400).json({ error: 'No fields to update' });
    values.push(staffId);
    await query(`UPDATE staff SET ${fields.join(', ')} WHERE id = ?`, values);
    res.json({ ok: true });
  });

  // Delete a staff member
  router.delete('/:departmentId/staff/:staffId', requireAuth(['DEPT']), async (req, res) => {
    const departmentId = parseInt(req.params.departmentId, 10);
    const staffId = parseInt(req.params.staffId, 10);
    if (!departmentId || departmentId !== req.user.departmentId) {
      return res.status(403).json({ error: 'Cannot delete staff outside your department' });
    }
    if (!staffId) return res.status(400).json({ error: 'Invalid staff id' });

    // Ensure staff belongs to this department
    const rows = await query('SELECT id, department_id FROM staff WHERE id = ?', [staffId]);
    const staff = rows[0];
    if (!staff || staff.department_id !== departmentId) {
      return res.status(404).json({ error: 'Staff not found in this department' });
    }

    await query('DELETE FROM staff WHERE id = ?', [staffId]);
    res.json({ ok: true });
  });

  return router;
}
