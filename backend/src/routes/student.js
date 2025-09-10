import express from 'express';
import { z } from 'zod';
import multer from 'multer';
import { requireAuth } from '../middleware/auth.js';
import { query } from '../db.js';
import { uploadBuffer } from '../utils/storage.js';
import { randomUUID } from 'crypto';
const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } }); // 5MB

const logCreateSchema = z.object({
  activityDate: z.string().min(1),
  activityType: z.string().min(1),
  title: z.string().min(1),
  detailedDescription: z.string().min(1),
  department: z.string().min(1),
  levelOfInvolvement: z.string().min(1),
  patientId: z.string().min(1),
  ageGender: z.string().min(1),
  diagnosis: z.string().min(1),
  attachments: z
    .array(z.object({
      url: z.string().url(),
      contentType: z.string().max(128).optional(),
      size: z.number().int().nonnegative().optional(),
    }))
    .optional(),
});

const logUpdateSchema = z.object({
  activityDate: z.string().min(1).optional(),
  activityType: z.string().min(1).optional(),
  title: z.string().min(1).optional(),
  detailedDescription: z.string().min(1).optional(),
  department: z.string().min(1).optional(),
  levelOfInvolvement: z.string().min(1).optional(),
  patientId: z.string().min(1).optional(),
  ageGender: z.string().min(1).optional(),
  diagnosis: z.string().min(1).optional(),
  // When provided, replace attachments with this new set
  attachments: z
    .array(z.object({
      url: z.string().url(),
      contentType: z.string().max(128).optional(),
      size: z.number().int().nonnegative().optional(),
    }))
    .optional(),
});

export default function studentRouter() {
  // Current student profile (basic info + org/department names + report fields)
  router.get('/me', requireAuth(['STUDENT']), async (req, res) => {
    try {
      const rows = await query(
        `SELECT s.id, s.name, s.email, s.department_id AS departmentId, s.organization_id AS organizationId,
                d.name AS departmentName, o.name AS organizationName, s.avatar_url AS avatarUrl,
                o.avatar_url AS organizationAvatarUrl,
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
         LEFT JOIN departments d ON d.id = s.department_id
         LEFT JOIN organizations o ON o.id = s.organization_id
         WHERE s.id = ?
         LIMIT 1`,
        [req.user.studentId]
      );
      const me = rows[0];
      if (!me) return res.status(404).json({ error: 'Student not found' });
      res.json(me);
    } catch (err) {
      if (err && (err.code === 'ER_BAD_FIELD_ERROR' || err.errno === 1054)) {
        const rows2 = await query(
          `SELECT s.id, s.name, s.email, s.department_id AS departmentId, s.organization_id AS organizationId,
                  d.name AS departmentName, o.name AS organizationName, s.avatar_url AS avatarUrl
           FROM students s
           LEFT JOIN departments d ON d.id = s.department_id
           LEFT JOIN organizations o ON o.id = s.organization_id
           WHERE s.id = ?
           LIMIT 1`,
          [req.user.studentId]
        );
        const me2 = rows2[0];
        if (!me2) return res.status(404).json({ error: 'Student not found' });
        return res.json({ ...me2, organizationAvatarUrl: null });
      }
      return res.status(500).json({ error: 'Failed to load profile' });
    }
  });

  // Update report/profile fields for current student
  router.put('/me', requireAuth(['STUDENT']), async (req, res) => {
    const schema = z.object({
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
    const parse = schema.safeParse(req.body);
    if (!parse.success) return res.status(400).json({ error: parse.error.flatten() });
    try {
      const fields = [];
      const vals = [];
      const map = {
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
      const body = parse.data;
      for (const k of Object.keys(body)) {
        if (body[k] !== undefined && map[k]) {
          fields.push(`${map[k]} = ?`);
          vals.push(body[k]);
        }
      }
      if (!fields.length) return res.json({ ok: true });
      vals.push(req.user.studentId);
      await query(`UPDATE students SET ${fields.join(', ')} WHERE id = ?`, vals);
      return res.json({ ok: true, persisted: true });
    } catch (err) {
      if (err && (err.code === 'ER_BAD_FIELD_ERROR' || err.errno === 1054)) {
        return res.json({ ok: true, persisted: false });
      }
      return res.status(500).json({ error: 'Failed to update profile' });
    }
  });

  // Upload and persist student avatar (combines upload + profile update)
  router.post('/avatar', requireAuth(['STUDENT']), upload.single('file'), async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: 'No file provided' });
      const safeName = (name = '') => name.replace(/[^a-zA-Z0-9._-]+/g, '_');
      const slug = (s = '') => String(s)
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '') // remove diacritics
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 50) || 'n-a';

      // Fetch names for org, department, staff, and student
      const [[orgRow] = []] = [await query('SELECT name FROM organizations WHERE id = ? LIMIT 1', [req.user.orgId])];
      const [[deptRow] = []] = [await query('SELECT name FROM departments WHERE id = ? LIMIT 1', [req.user.departmentId])];
      let staffName = 'staff';
      if (req.user.staffId) {
        const rows = await query('SELECT name FROM staff WHERE id = ? LIMIT 1', [req.user.staffId]);
        staffName = rows[0]?.name || staffName;
      }
      const [[studentRow] = []] = [await query('SELECT name FROM students WHERE id = ? LIMIT 1', [req.user.studentId])];

      const orgSlug = slug(orgRow?.name || 'org');
      const deptSlug = slug(deptRow?.name || 'dept');
      const staffSlug = slug(staffName || 'staff');
      const studentSlug = slug(studentRow?.name || 'student');

      const key = `students/${orgSlug}/${deptSlug}/${staffSlug}/${studentSlug}/${randomUUID()}_${safeName(req.file.originalname)}`;
      const out = await uploadBuffer({ key, buffer: req.file.buffer, contentType: req.file.mimetype });
      // Persist URL
      await query('UPDATE students SET avatar_url = ? WHERE id = ?', [out.url, req.user.studentId]);
      return res.json({ ok: true, avatarUrl: out.url });
    } catch (e) {
      console.error('[student/avatar] failed', e);
      return res.status(500).json({ error: 'Failed to upload avatar' });
    }
  });

  // Update profile (currently supports avatar URL only; name/email are read-only)
  router.put('/profile', requireAuth(['STUDENT']), async (req, res) => {
    const schema = z.object({ avatarUrl: z.string().url().max(255).optional() });
    const parse = schema.safeParse(req.body);
    if (!parse.success) return res.status(400).json({ error: parse.error.flatten() });
    const { avatarUrl } = parse.data;
    if (avatarUrl === undefined) return res.json({ ok: true });
    try {
      await query('UPDATE students SET avatar_url = ? WHERE id = ?', [avatarUrl, req.user.studentId]);
      return res.json({ ok: true });
    } catch (err) {
      // If column missing, treat as no-op for compatibility
      if (err && (err.code === 'ER_BAD_FIELD_ERROR' || err.errno === 1054)) {
        return res.json({ ok: true, persisted: false });
      }
      return res.status(500).json({ error: 'Failed to update profile' });
    }
  });

  // Settings: notification/email/theme (stored on students table if columns exist)
  router.get('/settings', requireAuth(['STUDENT']), async (req, res) => {
    try {
      const rows = await query(
        `SELECT 
           COALESCE(email_opt_in, 1)        AS emailOptIn,
           COALESCE(notifications_muted, 0) AS notificationsMuted,
           COALESCE(default_theme, 'light')  AS defaultTheme
         FROM students
         WHERE id = ?
         LIMIT 1`,
        [req.user.studentId]
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

  router.put('/settings', requireAuth(['STUDENT']), async (req, res) => {
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
      vals.push(req.user.studentId);
      await query(`UPDATE students SET ${fields.join(', ')} WHERE id = ?`, vals);
      return res.json({ ok: true, persisted: true });
    } catch (err) {
      // If columns don't exist, accept request as no-op for compatibility
      if (err && (err.code === 'ER_BAD_FIELD_ERROR' || err.errno === 1054)) {
        return res.json({ ok: true, persisted: false });
      }
      return res.status(500).json({ error: 'Failed to save settings' });
    }
  });
  // List current student's logs with optional filters and pagination
  router.get('/logs', requireAuth(['STUDENT']), async (req, res) => {
    const days = parseInt(String(req.query.days || ''), 10);
    const q = String(req.query.q || '').trim();
    const status = String(req.query.status || '').trim().toLowerCase(); // approved|pending|rejected
    const type = String(req.query.type || '').trim();
    const page = Math.max(1, parseInt(String(req.query.page || '1'), 10) || 1);
    const pageSize = Math.max(1, Math.min(50, parseInt(String(req.query.pageSize || '10'), 10) || 10));
    const sortByRaw = String(req.query.sortBy || 'date').toLowerCase();
    const sortDirRaw = String(req.query.sortDir || 'desc').toLowerCase();

    const whereParts = ['student_id = ?'];
    const params = [req.user.studentId];
    if (!Number.isNaN(days) && days > 0) {
      whereParts.push('activity_date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)');
      params.push(days);
    }
    if (q) {
      whereParts.push('(title LIKE ? OR detailed_description LIKE ? OR activity_type LIKE ?)');
      params.push(`%${q}%`, `%${q}%`, `%${q}%`);
    }
    if (status && ['approved','pending','rejected'].includes(status)) {
      whereParts.push('LOWER(status) = ?');
      params.push(status);
    }
    if (type) {
      whereParts.push('activity_type = ?');
      params.push(type);
    }
    const where = whereParts.join(' AND ');

    // Sorting whitelist
    const sortMap = {
      date: 'activity_date',
      title: 'title',
      status: 'status',
      type: 'activity_type',
      created: 'created_at',
    };
    const dir = (sortDirRaw === 'asc' ? 'ASC' : 'DESC');
    const col = sortMap[sortByRaw] || sortMap.date;
    const orderClause = `${col} ${dir}, id DESC`;

    // Total count
    const countRows = await query(`SELECT COUNT(*) AS c FROM student_logs WHERE ${where}`, params);
    const total = countRows[0]?.c || 0;

    // Pagination
    const offset = (page - 1) * pageSize;
    const items = await query(
      `SELECT id, activity_date AS activityDate, activity_type AS activityType, title,
              detailed_description AS detailedDescription, department, level_of_involvement AS levelOfInvolvement,
              patient_id AS patientId, age_gender AS AgeGender, diagnosis, status, faculty_remark AS facultyRemark,
              created_at AS createdAt, updated_at AS updatedAt
       FROM student_logs
       WHERE ${where}
       ORDER BY ${orderClause}
       LIMIT ? OFFSET ?`,
      [...params, pageSize, offset]
    );
    // Attachments: fetch for all returned logs
    if (items.length) {
      const ids = items.map((it) => it.id);
      const placeholders = ids.map(() => '?').join(',');
      const files = await query(
        `SELECT log_id AS logId, url, content_type AS contentType, size, created_at AS createdAt
         FROM student_log_files
         WHERE log_id IN (${placeholders})
         ORDER BY id ASC`,
        ids
      );
      const byLog = new Map();
      for (const f of files) {
        if (!byLog.has(f.logId)) byLog.set(f.logId, []);
        byLog.get(f.logId).push({ url: f.url, contentType: f.contentType || null, size: f.size ?? null, createdAt: f.createdAt });
      }
      for (const it of items) it.attachments = byLog.get(it.id) || [];
    }
    res.json({ items, total, page, pageSize });
  });

  // Student announcements (role/org/department scoped)
  router.get('/announcements', requireAuth(['STUDENT']), async (req, res) => {
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
       WHERE (role = 'STUDENT' OR role = 'ALL')
         AND (organization_id IS NULL OR organization_id = ?)
         AND (department_id IS NULL OR department_id = ?)
       ORDER BY created_at DESC
       LIMIT 10`,
      [req.user.orgId, req.user.departmentId]
    );
    res.json(rows);
  });

  // Dashboard metrics for current student
  router.get('/dashboard', requireAuth(['STUDENT']), async (req, res) => {
    const studentId = req.user.studentId;
    const days = parseInt(String(req.query.days || ''), 10);
    const df = (!Number.isNaN(days) && days > 0) ? ` AND activity_date >= DATE_SUB(CURDATE(), INTERVAL ${days} DAY)` : '';
    const totalRows = await query(`SELECT COUNT(*) AS c FROM student_logs WHERE student_id = ?${df}`, [studentId]);
    const pendingRows = await query(`SELECT COUNT(*) AS c FROM student_logs WHERE student_id = ? AND LOWER(status) = 'pending'${df}`, [studentId]);
    const approvedRows = await query(`SELECT COUNT(*) AS c FROM student_logs WHERE student_id = ? AND LOWER(status) = 'approved'${df}`, [studentId]);
    const rejectedRows = await query(`SELECT COUNT(*) AS c FROM student_logs WHERE student_id = ? AND LOWER(status) = 'rejected'${df}`, [studentId]);

    const recent = await query(
      `SELECT id, title, activity_type AS activityType, activity_date AS activityDate, LOWER(status) AS status
       FROM student_logs
       WHERE student_id = ?${df}
       ORDER BY activity_date DESC, id DESC
       LIMIT 5`,
      [studentId]
    );

    // Simple monthly trend for last 6 months
    const trend = await query(
      `SELECT DATE_FORMAT(activity_date, '%Y-%m') AS ym, COUNT(*) AS c
       FROM student_logs
       WHERE student_id = ? AND activity_date >= DATE_SUB(CURDATE(), INTERVAL 5 MONTH)
       GROUP BY ym
       ORDER BY ym ASC`,
      [studentId]
    );

    res.json({
      totalActivities: totalRows[0]?.c || 0,
      pendingReview: pendingRows[0]?.c || 0,
      approved: approvedRows[0]?.c || 0,
      rejected: rejectedRows[0]?.c || 0,
      recentActivities: recent,
      monthlyTrend: trend, // array of { ym: 'YYYY-MM', c }
    });
  });

  // Get a single log for current student
  router.get('/logs/:id', requireAuth(['STUDENT']), async (req, res) => {
    const logId = parseInt(req.params.id, 10);
    if (!logId) return res.status(400).json({ error: 'Invalid log id' });
    const rows = await query(
      `SELECT id, activity_date AS activityDate, activity_type AS activityType, title,
              detailed_description AS detailedDescription, department, level_of_involvement AS levelOfInvolvement,
              patient_id AS patientId, age_gender AS ageGender, diagnosis, status, faculty_remark AS facultyRemark,
              created_at AS createdAt, updated_at AS updatedAt
       FROM student_logs
       WHERE id = ? AND student_id = ?
       LIMIT 1`,
      [logId, req.user.studentId]
    );
    const row = rows[0];
    if (!row) return res.status(404).json({ error: 'Log not found' });
    const files = await query(
      `SELECT url, content_type AS contentType, size, created_at AS createdAt
       FROM student_log_files WHERE log_id = ? ORDER BY id ASC`,
      [logId]
    );
    row.attachments = files.map(f => ({ url: f.url, contentType: f.contentType || null, size: f.size ?? null, createdAt: f.createdAt }));
    res.json(row);
  });

  // Create a new log
  router.post('/logs', requireAuth(['STUDENT']), async (req, res) => {
    const parse = logCreateSchema.safeParse(req.body);
    if (!parse.success) return res.status(400).json({ error: parse.error.flatten() });

    const s = parse.data;
    const studentId = req.user.studentId;
    const staffId = req.user.staffId || null;
    const departmentId = req.user.departmentId;
    const organizationId = req.user.orgId;

    const result = await query(
      `INSERT INTO student_logs (student_id, staff_id, department_id, organization_id,
        activity_date, activity_type, title, detailed_description, department, level_of_involvement,
        patient_id, age_gender, diagnosis)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [studentId, staffId, departmentId, organizationId,
       s.activityDate, s.activityType, s.title, s.detailedDescription, s.department, s.levelOfInvolvement,
       s.patientId, s.ageGender, s.diagnosis]
    );

    // Persist attachments if provided
    if (Array.isArray(s.attachments) && s.attachments.length) {
      const values = [];
      for (const a of s.attachments) {
        const ct = a.contentType || null;
        const sz = Number.isFinite(a.size) ? a.size : null;
        values.push([result.insertId, a.url, ct, sz]);
      }
      // Bulk insert
      const placeholders = values.map(() => '(?, ?, ?, ?)').join(',');
      const flat = values.flat();
      await query(
        `INSERT INTO student_log_files (log_id, url, content_type, size) VALUES ${placeholders}`,
        flat
      );
    }

    // Notify staff that student submitted a new log
    if (staffId) {
      await query(
        'INSERT INTO notifications (role, target_id, title, body) VALUES (?, ?, ?, ?)',
        ['STAFF', staffId, 'New student log submitted', `A student submitted a new log: ${s.title}`]
      );
    }

    res.json({ id: result.insertId });
  });

  // Update an existing log (only if it belongs to student and is Pending)
  router.put('/logs/:id', requireAuth(['STUDENT']), async (req, res) => {
    const logId = parseInt(req.params.id, 10);
    if (!logId) return res.status(400).json({ error: 'Invalid log id' });

    const parse = logUpdateSchema.safeParse(req.body);
    if (!parse.success) return res.status(400).json({ error: parse.error.flatten() });

    const rows = await query('SELECT id, student_id, status FROM student_logs WHERE id = ?', [logId]);
    const log = rows[0];
    if (!log || log.student_id !== req.user.studentId) return res.status(404).json({ error: 'Log not found' });
    const statusLower = String(log.status).toLowerCase();
    if (!(statusLower === 'pending' || statusLower === 'rejected')) return res.status(400).json({ error: 'Only pending or rejected logs can be edited' });

    const fields = [];
    const values = [];
    const u = parse.data;
    if (u.activityDate !== undefined) { fields.push('activity_date = ?'); values.push(u.activityDate); }
    if (u.activityType !== undefined) { fields.push('activity_type = ?'); values.push(u.activityType); }
    if (u.title !== undefined) { fields.push('title = ?'); values.push(u.title); }
    if (u.detailedDescription !== undefined) { fields.push('detailed_description = ?'); values.push(u.detailedDescription); }
    if (u.department !== undefined) { fields.push('department = ?'); values.push(u.department); }
    if (u.levelOfInvolvement !== undefined) { fields.push('level_of_involvement = ?'); values.push(u.levelOfInvolvement); }
    if (u.patientId !== undefined) { fields.push('patient_id = ?'); values.push(u.patientId); }
    if (u.ageGender !== undefined) { fields.push('age_gender = ?'); values.push(u.ageGender); }
    if (u.diagnosis !== undefined) { fields.push('diagnosis = ?'); values.push(u.diagnosis); }
    if (fields.length) {
      values.push(logId);
      await query(`UPDATE student_logs SET ${fields.join(', ')} WHERE id = ?`, values);
    }

    // If attachments provided, replace existing set
    if (parse.data.attachments) {
      await query('DELETE FROM student_log_files WHERE log_id = ?', [logId]);
      if (parse.data.attachments.length) {
        const valuesA = [];
        for (const a of parse.data.attachments) {
          const ct = a.contentType || null;
          const sz = Number.isFinite(a.size) ? a.size : null;
          valuesA.push([logId, a.url, ct, sz]);
        }
        const placeholdersA = valuesA.map(() => '(?, ?, ?, ?)').join(',');
        const flatA = valuesA.flat();
        await query(
          `INSERT INTO student_log_files (log_id, url, content_type, size) VALUES ${placeholdersA}`,
          flatA
        );
      }
    }

    res.json({ ok: true });
  });

  // Delete a log (only if it belongs to student and is Pending)
  router.delete('/logs/:id', requireAuth(['STUDENT']), async (req, res) => {
    const logId = parseInt(req.params.id, 10);
    if (!logId) return res.status(400).json({ error: 'Invalid log id' });

    const rows = await query('SELECT id, student_id, status FROM student_logs WHERE id = ?', [logId]);
    const log = rows[0];
    if (!log || log.student_id !== req.user.studentId) return res.status(404).json({ error: 'Log not found' });
    if (String(log.status).toLowerCase() !== 'pending') return res.status(400).json({ error: 'Only pending logs can be deleted' });

    await query('DELETE FROM student_logs WHERE id = ?', [logId]);
    res.json({ ok: true });
  });

  return router;
}
