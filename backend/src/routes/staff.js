import express from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import { randomUUID } from 'crypto';
import { requireAuth } from '../middleware/auth.js';
import { query } from '../db.js';
import { sendMail } from '../utils/mailer.js';
import { uploadBuffer } from '../utils/storage.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

const studentCreateSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  major: z.string().min(1).optional(),
  status: z.string().min(1).optional(),
  // Extended report/profile fields (all optional)
  registrationNo: z.string().max(100).optional(),
  universityRegNo: z.string().max(100).optional(),
  rollNo: z.string().max(100).optional(),
  programName: z.string().max(255).optional(),
  academicYear: z.string().max(50).optional(),
  batchYear: z.string().max(50).optional(),
  semester: z.string().max(50).optional(),
  rotationName: z.string().max(255).optional(),
  rotationStartDate: z.string().optional(),
  rotationEndDate: z.string().optional(),
  dob: z.string().optional(),
  gender: z.string().max(20).optional(),
  bloodGroup: z.string().max(10).optional(),
  phone: z.string().max(30).optional(),
  address: z.string().optional(),
  guardianName: z.string().max(255).optional(),
  guardianPhone: z.string().max(30).optional(),
  emergencyContactName: z.string().max(255).optional(),
  emergencyContactPhone: z.string().max(30).optional(),
  adviserName: z.string().max(255).optional(),
  hodName: z.string().max(255).optional(),
  principalName: z.string().max(255).optional(),
  remarks: z.string().optional(),
});

const studentUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  major: z.string().min(1).optional(),
  status: z.string().min(1).optional(),
  registrationNo: z.string().max(100).optional(),
  universityRegNo: z.string().max(100).optional(),
  rollNo: z.string().max(100).optional(),
  programName: z.string().max(255).optional(),
  academicYear: z.string().max(50).optional(),
  batchYear: z.string().max(50).optional(),
  semester: z.string().max(50).optional(),
  rotationName: z.string().max(255).optional(),
  rotationStartDate: z.string().optional(),
  rotationEndDate: z.string().optional(),
  dob: z.string().optional(),
  gender: z.string().max(20).optional(),
  bloodGroup: z.string().max(10).optional(),
  phone: z.string().max(30).optional(),
  address: z.string().optional(),
  guardianName: z.string().max(255).optional(),
  guardianPhone: z.string().max(30).optional(),
  emergencyContactName: z.string().max(255).optional(),
  emergencyContactPhone: z.string().max(30).optional(),
  adviserName: z.string().max(255).optional(),
  hodName: z.string().max(255).optional(),
  principalName: z.string().max(255).optional(),
  remarks: z.string().optional(),
});

export default function staffRouter() {
  // Current staff profile (basic info + org/department names)
  router.get('/me', requireAuth(['STAFF']), async (req, res) => {
    try {
      const rows = await query(
        `SELECT s.id, s.name, s.email, s.department_id AS departmentId, s.organization_id AS organizationId,
                d.name AS departmentName, o.name AS organizationName, s.avatar_url AS avatarUrl,
                o.avatar_url AS organizationAvatarUrl
         FROM staff s
         LEFT JOIN departments d ON d.id = s.department_id
         LEFT JOIN organizations o ON o.id = s.organization_id
         WHERE s.id = ?
         LIMIT 1`,
        [req.user.staffId]
      );
      const me = rows[0];
      if (!me) return res.status(404).json({ error: 'Staff not found' });
      return res.json(me);
    } catch (err) {
      // Fallback for older DBs without avatar_url column
      if (err && (err.code === 'ER_BAD_FIELD_ERROR' || err.errno === 1054)) {
        const rows2 = await query(
          `SELECT s.id, s.name, s.email, s.department_id AS departmentId, s.organization_id AS organizationId,
                  d.name AS departmentName, o.name AS organizationName, NULL AS organizationAvatarUrl
           FROM staff s
           LEFT JOIN departments d ON d.id = s.department_id
           LEFT JOIN organizations o ON o.id = s.organization_id
           WHERE s.id = ?
           LIMIT 1`,
          [req.user.staffId]
        );
        const me2 = rows2[0];
        if (!me2) return res.status(404).json({ error: 'Staff not found' });
        return res.json({ ...me2, avatarUrl: null });
      }
      return res.status(500).json({ error: 'Failed to load profile' });
    }
  });

  // Fetch a specific student's profile (for reports) if owned by this staff
  router.get('/:staffId/student/:studentId/profile', requireAuth(['STAFF']), async (req, res) => {
    const staffId = parseInt(req.params.staffId, 10);
    const studentId = parseInt(req.params.studentId, 10);
    if (!staffId || staffId !== req.user.staffId) return res.status(403).json({ error: 'Forbidden' });
    if (!studentId) return res.status(400).json({ error: 'Invalid student id' });
    const rows = await query(
      `SELECT s.id, s.name, s.email, s.avatar_url AS avatarUrl,
              s.registration_no AS registrationNo,
              s.university_reg_no AS universityRegNo,
              s.roll_no AS rollNo,
              s.program_name AS programName,
              s.academic_year AS academicYear,
              s.batch_year AS batchYear,
              s.semester AS semester,
              s.rotation_name AS rotationName,
              s.rotation_start_date AS rotationStartDate,
              s.rotation_end_date AS rotationEndDate,
              s.dob AS dob,
              s.gender AS gender,
              s.blood_group AS bloodGroup,
              s.phone AS phone,
              s.address AS address,
              s.guardian_name AS guardianName,
              s.guardian_phone AS guardianPhone,
              s.emergency_contact_name AS emergencyContactName,
              s.emergency_contact_phone AS emergencyContactPhone,
              s.adviser_name AS adviserName,
              s.hod_name AS hodName,
              s.principal_name AS principalName,
              s.remarks AS remarks
       FROM students s
       WHERE s.id = ? AND s.staff_id = ? AND s.department_id = ? AND s.organization_id = ?
       LIMIT 1`,
      [studentId, req.user.staffId, req.user.departmentId, req.user.orgId]
    );
    const row = rows[0];
    if (!row) return res.status(404).json({ error: 'Student not found' });
    res.json(row);
  });

  // Upload and persist staff avatar
  router.post('/avatar', requireAuth(['STAFF']), upload.single('file'), async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: 'No file provided' });
      const safeName = (name = '') => name.replace(/[^a-zA-Z0-9._-]+/g, '_');
      const slug = (s = '') => String(s)
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 50) || 'n-a';

      // resolve org/dept/staff names
      let orgSlug = 'org';
      let deptSlug = 'dept';
      const orgRows = await query('SELECT name FROM organizations WHERE id = ? LIMIT 1', [req.user.orgId]);
      if (orgRows[0]?.name) orgSlug = slug(orgRows[0].name);
      const deptRows = await query('SELECT name FROM departments WHERE id = ? LIMIT 1', [req.user.departmentId]);
      if (deptRows[0]?.name) deptSlug = slug(deptRows[0].name);
      let staffName = 'staff';
      const staffRows = await query('SELECT name FROM staff WHERE id = ? LIMIT 1', [req.user.staffId]);
      if (staffRows[0]?.name) staffName = staffRows[0].name;
      const staffSlug = slug(staffName);

      const key = `staff/${orgSlug}/${deptSlug}/${staffSlug}/${randomUUID()}_${safeName(req.file.originalname)}`;
      const out = await uploadBuffer({ key, buffer: req.file.buffer, contentType: req.file.mimetype });
      try {
        await query('UPDATE staff SET avatar_url = ? WHERE id = ?', [out.url, req.user.staffId]);
        return res.json({ ok: true, avatarUrl: out.url, persisted: true });
      } catch (err) {
        if (err && (err.code === 'ER_BAD_FIELD_ERROR' || err.errno === 1054)) {
          // Column missing; return URL but mark not persisted so client can prompt to run migrations
          return res.json({ ok: true, avatarUrl: out.url, persisted: false });
        }
        throw err;
      }
    } catch (e) {
      console.error('[staff/avatar] failed', e);
      return res.status(500).json({ error: 'Failed to upload avatar' });
    }
  });

  // Get a single student log with attachments (scoped to this staff/org/dept)
  router.get('/:staffId/student-logs/:id', requireAuth(['STAFF']), async (req, res) => {
    const staffId = parseInt(req.params.staffId, 10);
    const id = parseInt(req.params.id, 10);
    if (!staffId || staffId !== req.user.staffId) return res.status(403).json({ error: 'Forbidden' });
    if (!id) return res.status(400).json({ error: 'Invalid id' });
    const rows = await query(
      `SELECT sl.id, sl.student_id AS studentId, s.name AS studentName, s.email AS studentEmail,
              sl.activity_date AS activityDate, sl.activity_type AS activityType, sl.title,
              sl.detailed_description AS detailedDescription, sl.department, sl.level_of_involvement AS levelOfInvolvement,
              sl.patient_id AS patientId, sl.age_gender AS ageGender, sl.diagnosis,
              sl.status, sl.faculty_remark AS facultyRemark, sl.created_at AS createdAt, sl.updated_at AS updatedAt
       FROM student_logs sl
       JOIN students s ON s.id = sl.student_id
       WHERE sl.id = ? AND sl.staff_id = ? AND sl.department_id = ? AND sl.organization_id = ?
       LIMIT 1`,
      [id, req.user.staffId, req.user.departmentId, req.user.orgId]
    );
    const row = rows[0];
    if (!row) return res.status(404).json({ error: 'Log not found' });
    const files = await query(
      `SELECT url, content_type AS contentType, size, created_at AS createdAt
       FROM student_log_files WHERE log_id = ? ORDER BY id ASC`,
      [id]
    );
    row.attachments = files.map(f => ({ url: f.url, contentType: f.contentType || null, size: f.size ?? null, createdAt: f.createdAt }));
    res.json(row);
  });
  // List students for the authenticated staff
  router.get('/:staffId/students', requireAuth(['STAFF']), async (req, res) => {
    const staffId = parseInt(req.params.staffId, 10);
    if (!staffId || staffId !== req.user.staffId) {
      return res.status(403).json({ error: 'Cannot view students for another staff' });
    }

    const rows = await query(
      'SELECT id, name, email, major, status, department_id AS departmentId, organization_id AS organizationId, staff_id AS staffId, avatar_url AS avatarUrl FROM students WHERE staff_id = ? AND department_id = ? AND organization_id = ? ORDER BY id DESC',
      [staffId, req.user.departmentId, req.user.orgId]
    );
    res.json(rows);
  });

  // Staff settings: notification/email/theme (stored on staff table if columns exist)
  router.get('/:staffId/settings', requireAuth(['STAFF']), async (req, res) => {
    const staffId = parseInt(req.params.staffId, 10);
    if (!staffId || staffId !== req.user.staffId) return res.status(403).json({ error: 'Forbidden' });
    try {
      const rows = await query(
        `SELECT 
           COALESCE(email_opt_in, 1)        AS emailOptIn,
           COALESCE(notifications_muted, 0) AS notificationsMuted,
           COALESCE(default_theme, 'light')  AS defaultTheme
         FROM staff
         WHERE id = ?
         LIMIT 1`,
        [req.user.staffId]
      );
      const s = rows[0];
      if (!s) return res.json({ emailOptIn: 1, notificationsMuted: 0, defaultTheme: 'light' });
      return res.json(s);
    } catch (err) {
      // If columns don't exist, return defaults without failing
      if (err && (err.code === 'ER_BAD_FIELD_ERROR' || err.errno === 1054)) {
        return res.json({ emailOptIn: 1, notificationsMuted: 0, defaultTheme: 'light' });
      }
      return res.status(500).json({ error: 'Failed to load settings' });
    }
  });

  router.put('/:staffId/settings', requireAuth(['STAFF']), async (req, res) => {
    const staffId = parseInt(req.params.staffId, 10);
    if (!staffId || staffId !== req.user.staffId) return res.status(403).json({ error: 'Forbidden' });
    const schema = z.object({
      emailOptIn: z.boolean().optional(),
      notificationsMuted: z.boolean().optional(),
      defaultTheme: z.enum(['light','dark']).optional(),
    });
    const parse = schema.safeParse(req.body);
    if (!parse.success) return res.status(400).json({ error: parse.error.flatten() });
    const { emailOptIn, notificationsMuted, defaultTheme } = parse.data;
    try {
      const fields = []; const vals = [];
      if (emailOptIn !== undefined) { fields.push('email_opt_in = ?'); vals.push(emailOptIn ? 1 : 0); }
      if (notificationsMuted !== undefined) { fields.push('notifications_muted = ?'); vals.push(notificationsMuted ? 1 : 0); }
      if (defaultTheme !== undefined) { fields.push('default_theme = ?'); vals.push(defaultTheme); }
      if (!fields.length) return res.json({ ok: true });
      vals.push(req.user.staffId);
      await query(`UPDATE staff SET ${fields.join(', ')} WHERE id = ?`, vals);
      return res.json({ ok: true, persisted: true });
    } catch (err) {
      // If columns don't exist, accept request as no-op for compatibility
      if (err && (err.code === 'ER_BAD_FIELD_ERROR' || err.errno === 1054)) {
        return res.json({ ok: true, persisted: false });
      }
      return res.status(500).json({ error: 'Failed to save settings' });
    }
  });

  // Dashboard metrics for current staff
  router.get('/:staffId/dashboard', requireAuth(['STAFF']), async (req, res) => {
    const staffId = parseInt(req.params.staffId, 10);
    if (!staffId || staffId !== req.user.staffId) return res.status(403).json({ error: 'Forbidden' });

    const days = parseInt(String(req.query.days || ''), 10);
    const df = (!Number.isNaN(days) && days > 0) ? ` AND activity_date >= DATE_SUB(CURDATE(), INTERVAL ${days} DAY)` : '';

    const totalStudentsRows = await query('SELECT COUNT(*) AS c FROM students WHERE staff_id = ? AND department_id = ? AND organization_id = ?', [req.user.staffId, req.user.departmentId, req.user.orgId]);
    const pendingLogsRows = await query(`SELECT COUNT(*) AS c FROM student_logs WHERE staff_id = ? AND department_id = ? AND organization_id = ? AND LOWER(status) = 'pending'${df}`, [req.user.staffId, req.user.departmentId, req.user.orgId]);
    const approvedLogsRows = await query(`SELECT COUNT(*) AS c FROM student_logs WHERE staff_id = ? AND department_id = ? AND organization_id = ? AND LOWER(status) = 'approved'${df}`, [req.user.staffId, req.user.departmentId, req.user.orgId]);
    const rejectedLogsRows = await query(`SELECT COUNT(*) AS c FROM student_logs WHERE staff_id = ? AND department_id = ? AND organization_id = ? AND LOWER(status) = 'rejected'${df}`, [req.user.staffId, req.user.departmentId, req.user.orgId]);
    const myActivitiesRows = await query(`SELECT COUNT(*) AS c FROM staff_logs WHERE staff_id = ? AND department_id = ? AND organization_id = ?${df}`, [req.user.staffId, req.user.departmentId, req.user.orgId]);

    const statusDist = await query(
      `SELECT LOWER(status) AS s, COUNT(*) AS c
       FROM student_logs
       WHERE staff_id = ? AND department_id = ? AND organization_id = ?
       GROUP BY LOWER(status)`,
      [req.user.staffId, req.user.departmentId, req.user.orgId]
    );
    const dist = { approved: 0, pending: 0, rejected: 0 };
    for (const row of statusDist) { dist[row.s] = row.c; }

    const trend = await query(
      `SELECT DATE_FORMAT(activity_date, '%Y-%m') AS ym, COUNT(*) AS c
       FROM student_logs
       WHERE staff_id = ? AND department_id = ? AND organization_id = ? AND activity_date >= DATE_SUB(CURDATE(), INTERVAL 5 MONTH)
       GROUP BY ym
       ORDER BY ym ASC`,
      [req.user.staffId, req.user.departmentId, req.user.orgId]
    );

    const monthlyStatusRows = await query(
      `SELECT DATE_FORMAT(activity_date, '%Y-%m') AS ym, LOWER(status) AS s, COUNT(*) AS c
       FROM student_logs
       WHERE staff_id = ? AND department_id = ? AND organization_id = ? AND activity_date >= DATE_SUB(CURDATE(), INTERVAL 5 MONTH)
       GROUP BY ym, LOWER(status)
       ORDER BY ym ASC`,
      [req.user.staffId, req.user.departmentId, req.user.orgId]
    );
    const monthlyStatusTrendMap = new Map();
    for (const row of monthlyStatusRows) {
      const m = row.ym;
      if (!monthlyStatusTrendMap.has(m)) monthlyStatusTrendMap.set(m, { ym: m, approved: 0, pending: 0, rejected: 0 });
      const bucket = monthlyStatusTrendMap.get(m);
      if (row.s === 'approved') bucket.approved = row.c;
      else if (row.s === 'pending') bucket.pending = row.c;
      else if (row.s === 'rejected') bucket.rejected = row.c;
    }
    const monthlyStatusTrend = Array.from(monthlyStatusTrendMap.values());

    // Activity type distribution (overall within optional days filter)
    const dfTypes = df; // reuse same date filter clause
    const typeDistribution = await query(
      `SELECT activity_type AS type, COUNT(*) AS c
       FROM student_logs
       WHERE staff_id = ? AND department_id = ? AND organization_id = ?${dfTypes}
       GROUP BY activity_type
       ORDER BY c DESC`,
      [req.user.staffId, req.user.departmentId, req.user.orgId]
    );

    // Determine top 5 activity types in the window
    const topTypes = typeDistribution.slice(0, 5).map(r => r.type);
    // Monthly trend for top types
    let topTypeTrend = [];
    if (topTypes.length) {
      const placeholders = topTypes.map(() => '?').join(',');
      const rows = await query(
        `SELECT DATE_FORMAT(activity_date, '%Y-%m') AS ym, activity_type AS type, COUNT(*) AS c
         FROM student_logs
         WHERE staff_id = ? AND department_id = ? AND organization_id = ? AND activity_date >= DATE_SUB(CURDATE(), INTERVAL 5 MONTH)
           AND activity_type IN (${placeholders})
         GROUP BY ym, activity_type
         ORDER BY ym ASC`,
        [req.user.staffId, req.user.departmentId, req.user.orgId, ...topTypes]
      );
      const map = new Map();
      for (const r of rows) {
        const k = r.ym;
        if (!map.has(k)) {
          const base = { ym: r.ym };
          for (const t of topTypes) base[t] = 0;
          map.set(k, base);
        }
        const obj = map.get(k);
        obj[r.type] = r.c;
      }
      topTypeTrend = Array.from(map.values());
    }

    // Pending queue: latest 10 pending logs for this staff with student name
    const pendingQueue = await query(
      `SELECT sl.id, sl.title, sl.activity_type AS activityType, sl.activity_date AS activityDate,
              s.name AS studentName
       FROM student_logs sl
       JOIN students s ON s.id = sl.student_id
       WHERE sl.staff_id = ? AND sl.department_id = ? AND sl.organization_id = ? AND LOWER(sl.status) = 'pending'${df}
       ORDER BY sl.activity_date DESC, sl.id DESC
       LIMIT 10`,
      [req.user.staffId, req.user.departmentId, req.user.orgId]
    );

    // Top students by submission count in window
    const topStudents = await query(
      `SELECT s.id AS studentId, s.name AS studentName, COUNT(*) AS submissions
       FROM student_logs sl
       JOIN students s ON s.id = sl.student_id
       WHERE sl.staff_id = ? AND sl.department_id = ? AND sl.organization_id = ?${df}
       GROUP BY s.id, s.name
       ORDER BY submissions DESC
       LIMIT 5`,
      [req.user.staffId, req.user.departmentId, req.user.orgId]
    );

    res.json({
      totalStudents: totalStudentsRows[0]?.c || 0,
      pendingLogs: pendingLogsRows[0]?.c || 0,
      approvedLogs: approvedLogsRows[0]?.c || 0,
      rejectedLogs: rejectedLogsRows[0]?.c || 0,
      activitiesSubmitted: myActivitiesRows[0]?.c || 0,
      statusDistribution: dist,
      monthlyTrend: trend,
      monthlyStatusTrend,
      typeDistribution,
      topTypeTrend: { types: topTypes, points: topTypeTrend },
      pendingQueue,
      topStudents,
    });
  });

  // ===== Staff's own activity logs =====
  // List current staff's logs
  router.get('/:staffId/logs', requireAuth(['STAFF']), async (req, res) => {
    const staffId = parseInt(req.params.staffId, 10);
    if (!staffId || staffId !== req.user.staffId) return res.status(403).json({ error: 'Forbidden' });
    const days = parseInt(String(req.query.days || ''), 10);
    const df = (!Number.isNaN(days) && days > 0) ? ` AND activity_date >= DATE_SUB(CURDATE(), INTERVAL ${days} DAY)` : '';
    const rows = await query(
      `SELECT id, activity_date AS activityDate, activity_type AS activityType, title,
              description, contribution, status, admin_remark AS adminRemark,
              created_at AS createdAt, updated_at AS updatedAt
       FROM staff_logs
       WHERE staff_id = ? AND department_id = ? AND organization_id = ?${df}
       ORDER BY activity_date DESC, id DESC`,
      [req.user.staffId, req.user.departmentId, req.user.orgId]
    );
    res.json(rows);
  });

  // Get single staff log
  router.get('/:staffId/logs/:id', requireAuth(['STAFF']), async (req, res) => {
    const staffId = parseInt(req.params.staffId, 10);
    const id = parseInt(req.params.id, 10);
    if (!staffId || staffId !== req.user.staffId) return res.status(403).json({ error: 'Forbidden' });
    if (!id) return res.status(400).json({ error: 'Invalid id' });
    const rows = await query(
      `SELECT id, activity_date AS activityDate, activity_type AS activityType, title,
              description, contribution, status, admin_remark AS adminRemark,
              created_at AS createdAt, updated_at AS updatedAt
       FROM staff_logs
       WHERE id = ? AND staff_id = ? AND department_id = ? AND organization_id = ?
       LIMIT 1`,
      [id, req.user.staffId, req.user.departmentId, req.user.orgId]
    );
    const row = rows[0];
    if (!row) return res.status(404).json({ error: 'Log not found' });
    // include attachments
    const files = await query(
      `SELECT url, content_type AS contentType, size, created_at AS createdAt
       FROM staff_log_files WHERE log_id = ? ORDER BY id ASC`,
      [id]
    );
    row.attachments = files.map(f => ({ url: f.url, contentType: f.contentType || null, size: f.size ?? null, createdAt: f.createdAt }));
    res.json(row);
  });

  // Create staff log
  router.post('/:staffId/logs', requireAuth(['STAFF']), async (req, res) => {
    const staffId = parseInt(req.params.staffId, 10);
    if (!staffId || staffId !== req.user.staffId) return res.status(403).json({ error: 'Forbidden' });
    const schema = z.object({
      activityDate: z.string().min(1),
      activityType: z.string().min(1),
      title: z.string().min(1),
      description: z.string().min(1),
      contribution: z.string().min(1),
      attachments: z.array(z.object({
        url: z.string().url(),
        contentType: z.string().max(128).optional(),
        size: z.number().int().nonnegative().optional(),
      })).optional(),
    });
    const parse = schema.safeParse(req.body);
    if (!parse.success) return res.status(400).json({ error: parse.error.flatten() });
    const s = parse.data;
    const result = await query(
      `INSERT INTO staff_logs (staff_id, department_id, organization_id, activity_date, activity_type, title, description, contribution)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.user.staffId, req.user.departmentId, req.user.orgId, s.activityDate, s.activityType, s.title, s.description, s.contribution]
    );
    // persist attachments if provided
    if (Array.isArray(s.attachments) && s.attachments.length) {
      const values = [];
      for (const a of s.attachments) {
        const ct = a.contentType || null;
        const sz = Number.isFinite(a.size) ? a.size : null;
        values.push([result.insertId, a.url, ct, sz]);
      }
      const placeholders = values.map(() => '(?, ?, ?, ?)').join(',');
      await query(`INSERT INTO staff_log_files (log_id, url, content_type, size) VALUES ${placeholders}`, values.flat());
    }
    res.json({ id: result.insertId });
  });

  // Update staff log (only Pending or Rejected)
  router.put('/:staffId/logs/:id', requireAuth(['STAFF']), async (req, res) => {
    const staffId = parseInt(req.params.staffId, 10);
    const id = parseInt(req.params.id, 10);
    if (!staffId || staffId !== req.user.staffId) return res.status(403).json({ error: 'Forbidden' });
    if (!id) return res.status(400).json({ error: 'Invalid id' });
    const rows = await query('SELECT id, staff_id, department_id, organization_id FROM staff_logs WHERE id = ? LIMIT 1', [id]);
    const log = rows[0];
    if (!log) return res.status(404).json({ error: 'Log not found' });
    if (log.staff_id !== req.user.staffId || log.department_id !== req.user.departmentId || log.organization_id !== req.user.orgId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const schema = z.object({
      activityDate: z.string().min(1).optional(),
      activityType: z.string().min(1).optional(),
      title: z.string().min(1).optional(),
      description: z.string().min(1).optional(),
      contribution: z.string().min(1).optional(),
      attachments: z.array(z.object({
        url: z.string().url(),
        contentType: z.string().max(128).optional(),
        size: z.number().int().nonnegative().optional(),
      })).optional(),
    });
    const parse = schema.safeParse(req.body);
    if (!parse.success) return res.status(400).json({ error: parse.error.flatten() });
    const u = parse.data;
    const fields = [];
    const values = [];
    if (u.activityDate !== undefined) { fields.push('activity_date = ?'); values.push(u.activityDate); }
    if (u.activityType !== undefined) { fields.push('activity_type = ?'); values.push(u.activityType); }
    if (u.title !== undefined) { fields.push('title = ?'); values.push(u.title); }
    if (u.description !== undefined) { fields.push('description = ?'); values.push(u.description); }
    if (u.contribution !== undefined) { fields.push('contribution = ?'); values.push(u.contribution); }
    if (!fields.length && !u.attachments) return res.status(400).json({ error: 'No fields to update' });
    if (fields.length) {
      values.push(id);
      await query(`UPDATE staff_logs SET ${fields.join(', ')} WHERE id = ?`, values);
    }
    // replace attachments if provided
    if (u.attachments) {
      await query('DELETE FROM staff_log_files WHERE log_id = ?', [id]);
      if (u.attachments.length) {
        const valuesA = [];
        for (const a of u.attachments) {
          const ct = a.contentType || null;
          const sz = Number.isFinite(a.size) ? a.size : null;
          valuesA.push([id, a.url, ct, sz]);
        }
        const placeholdersA = valuesA.map(() => '(?, ?, ?, ?)').join(',');
        await query(`INSERT INTO staff_log_files (log_id, url, content_type, size) VALUES ${placeholdersA}`, valuesA.flat());
      }
    }
    res.json({ ok: true });
  });

  // List logs for students under this staff
  // Optional: studentId filter for per-student reports. When provided, also include attachments.
  router.get('/:staffId/student-logs', requireAuth(['STAFF']), async (req, res) => {
    const staffId = parseInt(req.params.staffId, 10);
    if (!staffId || staffId !== req.user.staffId) {
      return res.status(403).json({ error: 'Cannot view logs for another staff' });
    }
    const days = parseInt(String(req.query.days || ''), 10);
    const studentId = parseInt(String(req.query.studentId || ''), 10);
    const df = (!Number.isNaN(days) && days > 0) ? ` AND sl.activity_date >= DATE_SUB(CURDATE(), INTERVAL ${days} DAY)` : '';
    const sf = (!Number.isNaN(studentId) && studentId > 0) ? ` AND sl.student_id = ${studentId}` : '';
    const rows = await query(
      `SELECT sl.id, sl.student_id AS studentId, s.name AS studentName, s.email AS studentEmail,
              s.avatar_url AS studentAvatarUrl,
              sl.activity_date AS activityDate, sl.activity_type AS activityType, sl.title,
              sl.status, sl.faculty_remark AS facultyRemark, sl.created_at AS createdAt
       FROM student_logs sl
       JOIN students s ON s.id = sl.student_id
       WHERE sl.staff_id = ? AND sl.department_id = ? AND sl.organization_id = ?${sf}${df}
       ORDER BY sl.activity_date DESC, sl.id DESC`,
      [req.user.staffId, req.user.departmentId, req.user.orgId]
    );
    // If a specific student is requested, include attachments for each log
    if (!Number.isNaN(studentId) && studentId > 0 && rows.length) {
      const ids = rows.map(r => r.id);
      const placeholders = ids.map(() => '?').join(',');
      const files = await query(
        `SELECT log_id AS logId, url, content_type AS contentType, size, created_at AS createdAt
         FROM student_log_files WHERE log_id IN (${placeholders}) ORDER BY id ASC`,
        ids
      );
      const byLog = new Map();
      for (const f of files) {
        if (!byLog.has(f.logId)) byLog.set(f.logId, []);
        byLog.get(f.logId).push({ url: f.url, contentType: f.contentType || null, size: f.size ?? null, createdAt: f.createdAt });
      }
      for (const r of rows) r.attachments = byLog.get(r.id) || [];
    }
    res.json(rows);
  });

  // Staff announcements (role-specific)
  router.get('/:staffId/announcements', requireAuth(['STAFF']), async (req, res) => {
    const staffId = parseInt(req.params.staffId, 10);
    if (!staffId || staffId !== req.user.staffId) return res.status(403).json({ error: 'Forbidden' });
    const rows = await query(
      `SELECT id, title, content, created_at AS createdAt, role,
              CASE
                WHEN role = 'STUDENT' THEN 'Staff'
                WHEN role = 'STAFF' THEN 'Staff'
                WHEN role = 'DEPARTMENT' OR (role = 'ALL' AND department_id IS NOT NULL) THEN 'Department'
                WHEN role = 'ORGANIZATION' OR (role = 'ALL' AND department_id IS NULL AND organization_id IS NOT NULL) THEN 'Organization'
                ELSE 'Organization'
              END AS postedBy
       FROM announcements
       WHERE (role = 'STAFF' OR role = 'ALL')
         AND (organization_id IS NULL OR organization_id = ?)
         AND (department_id IS NULL OR department_id = ?)
       ORDER BY created_at DESC
       LIMIT 10`,
      [req.user.orgId, req.user.departmentId]
    );
    res.json(rows);
  });

  // Staff-managed announcements for students: list all for this org/department
  router.get('/:staffId/announcements/managed', requireAuth(['STAFF']), async (req, res) => {
    const staffId = parseInt(req.params.staffId, 10);
    if (!staffId || staffId !== req.user.staffId) return res.status(403).json({ error: 'Forbidden' });
    const rows = await query(
      `SELECT id, title, content, created_at AS createdAt, role,
              'Staff' AS postedBy
       FROM announcements
       WHERE role = 'STUDENT' AND organization_id = ? AND department_id = ?
       ORDER BY created_at DESC`,
      [req.user.orgId, req.user.departmentId]
    );
    res.json(rows);
  });

  // Create announcement targeted to students for this org/department
  router.post('/:staffId/announcements', requireAuth(['STAFF']), async (req, res) => {
    const staffId = parseInt(req.params.staffId, 10);
    if (!staffId || staffId !== req.user.staffId) return res.status(403).json({ error: 'Forbidden' });
    const schema = z.object({ title: z.string().min(1), content: z.string().min(1) });
    const parse = schema.safeParse(req.body);
    if (!parse.success) return res.status(400).json({ error: parse.error.flatten() });
    const { title, content } = parse.data;
    const result = await query(
      'INSERT INTO announcements (role, title, content, organization_id, department_id) VALUES (\'STUDENT\', ?, ?, ?, ?)',
      [title, content, req.user.orgId, req.user.departmentId]
    );
    res.json({ id: result.insertId, title, content });
  });

  // Update announcement (must belong to same org/department and be STUDENT-role)
  router.put('/:staffId/announcements/:id', requireAuth(['STAFF']), async (req, res) => {
    const staffId = parseInt(req.params.staffId, 10);
    const id = parseInt(req.params.id, 10);
    if (!staffId || staffId !== req.user.staffId) return res.status(403).json({ error: 'Forbidden' });
    if (!id) return res.status(400).json({ error: 'Invalid id' });
    const rows = await query('SELECT id, role, organization_id, department_id FROM announcements WHERE id = ?', [id]);
    const a = rows[0];
    if (!a || a.role !== 'STUDENT' || a.organization_id !== req.user.orgId || a.department_id !== req.user.departmentId) {
      return res.status(404).json({ error: 'Announcement not found' });
    }
    const schema = z.object({ title: z.string().min(1).optional(), content: z.string().min(1).optional() });
    const parse = schema.safeParse(req.body);
    if (!parse.success) return res.status(400).json({ error: parse.error.flatten() });
    const u = parse.data;
    const fields = []; const vals = [];
    if (u.title !== undefined) { fields.push('title = ?'); vals.push(u.title); }
    if (u.content !== undefined) { fields.push('content = ?'); vals.push(u.content); }
    if (!fields.length) return res.json({ ok: true });
    vals.push(id);
    await query(`UPDATE announcements SET ${fields.join(', ')} WHERE id = ?`, vals);
    res.json({ ok: true });
  });

  // Delete announcement (same scope rules)
  router.delete('/:staffId/announcements/:id', requireAuth(['STAFF']), async (req, res) => {
    const staffId = parseInt(req.params.staffId, 10);
    const id = parseInt(req.params.id, 10);
    if (!staffId || staffId !== req.user.staffId) return res.status(403).json({ error: 'Forbidden' });
    if (!id) return res.status(400).json({ error: 'Invalid id' });
    const rows = await query('SELECT id, role, organization_id, department_id FROM announcements WHERE id = ?', [id]);
    const a = rows[0];
    if (!a || a.role !== 'STUDENT' || a.organization_id !== req.user.orgId || a.department_id !== req.user.departmentId) {
      return res.status(404).json({ error: 'Announcement not found' });
    }
    await query('DELETE FROM announcements WHERE id = ?', [id]);
    res.json({ ok: true });
  });

  // Approve or reject a student log with remark
  router.put('/:staffId/student-logs/:logId/review', requireAuth(['STAFF']), async (req, res) => {
    const staffId = parseInt(req.params.staffId, 10);
    const logId = parseInt(req.params.logId, 10);
    if (!staffId || staffId !== req.user.staffId) {
      return res.status(403).json({ error: 'Cannot review logs for another staff' });
    }
    if (!logId) return res.status(400).json({ error: 'Invalid log id' });

    const schema = z.object({ action: z.enum(['approve', 'reject']), remark: z.string().min(1) });
    const parse = schema.safeParse(req.body);
    if (!parse.success) return res.status(400).json({ error: parse.error.flatten() });

    const rows = await query(
      'SELECT id, staff_id, department_id, organization_id, status FROM student_logs WHERE id = ? LIMIT 1',
      [logId]
    );
    const log = rows[0];
    if (!log) return res.status(404).json({ error: 'Log not found' });
    if (log.staff_id !== req.user.staffId || log.department_id !== req.user.departmentId || log.organization_id !== req.user.orgId) {
      return res.status(403).json({ error: 'You are not allowed to review this log' });
    }
    if (String(log.status).toLowerCase() !== 'pending') {
      return res.status(400).json({ error: 'Only pending logs can be reviewed' });
    }

    const nextStatus = parse.data.action === 'approve' ? 'Approved' : 'Rejected';
    const remark = parse.data.remark;
    await query('UPDATE student_logs SET status = ?, faculty_remark = ? WHERE id = ?', [nextStatus, remark, logId]);

    // Notify the student about the review decision
    const studentRow = await query('SELECT student_id FROM student_logs WHERE id = ?', [logId]);
    const studentId = studentRow[0]?.student_id;
    if (studentId) {
      const title = nextStatus === 'Approved' ? 'Your log was approved' : 'Your log was rejected';
      const body = nextStatus === 'Approved' ? 'Your submitted activity has been approved.' : `Your submitted activity was rejected. Remark: ${remark}`;
      await query('INSERT INTO notifications (role, target_id, title, body) VALUES (?, ?, ?, ?)', ['STUDENT', studentId, title, body]);
    }

    res.json({ ok: true, status: nextStatus });
  });

  // Staff creates Students
  router.post('/:staffId/students', requireAuth(['STAFF']), async (req, res) => {
    const parse = studentCreateSchema.safeParse(req.body);
    if (!parse.success) return res.status(400).json({ error: parse.error.flatten() });

    const staffId = parseInt(req.params.staffId, 10);
    if (!staffId || staffId !== req.user.staffId) {
      return res.status(403).json({ error: 'Cannot create students for another staff' });
    }

    const { name, email } = parse.data;
    const exists = await query('SELECT id FROM students WHERE email = ?', [email]);
    if (exists.length) return res.status(409).json({ error: 'Email already used' });

    const major = (parse.data.major || '').trim();
    const status = (parse.data.status || 'Active').trim();

    // Generate temporary password and hash
    const tempPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-2);
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    const result = await query(
      `INSERT INTO students (
        name, email, major, status, password_hash, must_change_password,
        department_id, organization_id, staff_id,
        registration_no, university_reg_no, roll_no, program_name, academic_year, batch_year, semester,
        rotation_name, rotation_start_date, rotation_end_date,
        dob, gender, blood_group, phone, address,
        guardian_name, guardian_phone, emergency_contact_name, emergency_contact_phone,
        adviser_name, hod_name, principal_name, remarks
      ) VALUES (
        ?, ?, ?, ?, ?, 1,
        ?, ?, ?,
        ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?
      )`,
      [
        name, email, major, status, passwordHash,
        req.user.departmentId, req.user.orgId, staffId,
        parse.data.registrationNo || null,
        parse.data.universityRegNo || null,
        parse.data.rollNo || null,
        parse.data.programName || null,
        parse.data.academicYear || null,
        parse.data.batchYear || null,
        parse.data.semester || null,
        parse.data.rotationName || null,
        parse.data.rotationStartDate || null,
        parse.data.rotationEndDate || null,
        parse.data.dob || null,
        parse.data.gender || null,
        parse.data.bloodGroup || null,
        parse.data.phone || null,
        parse.data.address || null,
        parse.data.guardianName || null,
        parse.data.guardianPhone || null,
        parse.data.emergencyContactName || null,
        parse.data.emergencyContactPhone || null,
        parse.data.adviserName || null,
        parse.data.hodName || null,
        parse.data.principalName || null,
        parse.data.remarks || null,
      ]
    );

    // Send login email with temp password
    const baseUrl = process.env.FRONTEND_ORIGIN || process.env.APP_BASE_URL || 'http://localhost:5173';
    const loginUrl = `${baseUrl}/login?role=Student`;
    try {
      await sendMail({
        to: email,
        subject: 'Your ElogBook Student Account',
        text: `Hello ${name},\n\nYour student account has been created.\nLogin: ${loginUrl}\nTemporary Password: ${tempPassword}\n\nYou will be asked to change your password on first login.`,
        html: `<p>Hello ${name},</p><p>Your student account has been created.</p><p><strong>Login:</strong> <a href="${loginUrl}">${loginUrl}</a><br/><strong>Temporary Password:</strong> ${tempPassword}</p><p>You will be asked to change your password on first login.</p>`,
      });
    } catch (e) {
      console.warn('[mail] failed to send student invite', e);
    }

    res.json({ id: result.insertId, name, email, major, status });
  });

  // Update a student owned by this staff
  router.put('/:staffId/students/:studentId', requireAuth(['STAFF']), async (req, res) => {
    const staffId = parseInt(req.params.staffId, 10);
    const studentId = parseInt(req.params.studentId, 10);
    if (!staffId || staffId !== req.user.staffId) {
      return res.status(403).json({ error: 'Cannot update students for another staff' });
    }
    if (!studentId) return res.status(400).json({ error: 'Invalid student id' });

    const parse = studentUpdateSchema.safeParse(req.body);
    if (!parse.success) return res.status(400).json({ error: parse.error.flatten() });

    // Ensure the student belongs to this staff and department/org
    const rows = await query(
      'SELECT id, name, email, major, status FROM students WHERE id = ? AND staff_id = ? AND department_id = ? AND organization_id = ? LIMIT 1',
      [studentId, staffId, req.user.departmentId, req.user.orgId]
    );
    if (!rows.length) return res.status(404).json({ error: 'Student not found' });

    const updates = parse.data;
    if (updates.email) {
      const emailCheck = await query('SELECT id FROM students WHERE email = ? AND id != ?', [updates.email, studentId]);
      if (emailCheck.length) return res.status(409).json({ error: 'Email already used' });
    }

    const fields = [];
    const vals = [];
    const map = {
      name: 'name',
      email: 'email',
      major: 'major',
      status: 'status',
      registrationNo: 'registration_no',
      universityRegNo: 'university_reg_no',
      rollNo: 'roll_no',
      programName: 'program_name',
      academicYear: 'academic_year',
      batchYear: 'batch_year',
      semester: 'semester',
      rotationName: 'rotation_name',
      rotationStartDate: 'rotation_start_date',
      rotationEndDate: 'rotation_end_date',
      dob: 'dob',
      gender: 'gender',
      bloodGroup: 'blood_group',
      phone: 'phone',
      address: 'address',
      guardianName: 'guardian_name',
      guardianPhone: 'guardian_phone',
      emergencyContactName: 'emergency_contact_name',
      emergencyContactPhone: 'emergency_contact_phone',
      adviserName: 'adviser_name',
      hodName: 'hod_name',
      principalName: 'principal_name',
      remarks: 'remarks',
    };
    for (const k of Object.keys(updates)) {
      if (updates[k] !== undefined && map[k]) {
        fields.push(`${map[k]} = ?`);
        vals.push(updates[k]);
      }
    }
    if (!fields.length) {
      return res.json({ id: studentId, ...rows[0] });
    }
    vals.push(studentId);
    await query(`UPDATE students SET ${fields.join(', ')} WHERE id = ?`, vals);
    res.json({ id: studentId, ...updates });
  });

  // Delete a student owned by this staff
  router.delete('/:staffId/students/:studentId', requireAuth(['STAFF']), async (req, res) => {
    const staffId = parseInt(req.params.staffId, 10);
    const studentId = parseInt(req.params.studentId, 10);
    if (!staffId || staffId !== req.user.staffId) {
      return res.status(403).json({ error: 'Cannot delete students for another staff' });
    }
    if (!studentId) return res.status(400).json({ error: 'Invalid student id' });

    const rows = await query(
      'SELECT id FROM students WHERE id = ? AND staff_id = ? AND department_id = ? AND organization_id = ? LIMIT 1',
      [studentId, staffId, req.user.departmentId, req.user.orgId]
    );
    if (!rows.length) return res.status(404).json({ error: 'Student not found' });

    await query('DELETE FROM students WHERE id = ?', [studentId]);
    res.json({ success: true });
  });

  return router;
}

