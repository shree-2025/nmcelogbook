import express from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { signToken, requireAuth } from '../middleware/auth.js';
import { query } from '../db.js';

const router = express.Router();

const credsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1).optional(),
});

export default function authRouter() {
  // Organization register (disabled by default)
  router.post('/org/register', async (req, res) => {
    if ((process.env.ALLOW_ORG_SELF_REGISTER || 'false').toLowerCase() !== 'true') {
      return res.status(403).json({ error: 'Organization self-registration is disabled' });
    }
    const parse = credsSchema.safeParse(req.body);
    if (!parse.success) return res.status(400).json({ error: parse.error.flatten() });
    const { email: rawEmail, password, name } = parse.data;
    const email = rawEmail.trim().toLowerCase();
    const rows = await query('SELECT id FROM organizations WHERE email = ?', [email]);
    if (rows.length) return res.status(409).json({ error: 'Email already used' });
    const passwordHash = await bcrypt.hash(password, 10);
    const result = await query('INSERT INTO organizations (name, email, password_hash) VALUES (?, ?, ?)', [name || '', email, passwordHash]);
    const id = result.insertId;
    const token = signToken({ role: 'ORG', orgId: id, sub: `org:${id}` });
    res.json({ token, user: { id, role: 'ORG', email, name: name || '' } });
  });

  // Organization login
  router.post('/org/login', async (req, res) => {
    const parse = credsSchema.pick({ email: true, password: true }).safeParse(req.body);
    if (!parse.success) return res.status(400).json({ error: parse.error.flatten() });
    const { email: rawEmail, password } = parse.data;
    const email = rawEmail.trim().toLowerCase();
    const rows = await query('SELECT id, name, email, password_hash FROM organizations WHERE email = ?', [email]);
    const org = rows[0];
    if (!org) return res.status(401).json({ error: 'Invalid credentials' });
    const ok = await bcrypt.compare(password, org.password_hash);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
    const token = signToken({ role: 'ORG', orgId: org.id, sub: `org:${org.id}` });
    res.json({ token, user: { id: org.id, role: 'ORG', email: org.email, name: org.name } });
  });

  // Department login
  router.post('/department/login', async (req, res) => {
    const parse = credsSchema.pick({ email: true, password: true }).safeParse(req.body);
    if (!parse.success) return res.status(400).json({ error: parse.error.flatten() });
    const { email: rawEmail, password } = parse.data;
    const email = rawEmail.trim().toLowerCase();
    const rows = await query('SELECT id, name, email, password_hash, organization_id, must_change_password FROM departments WHERE email = ?', [email]);
    const dep = rows[0];
    if (!dep) return res.status(401).json({ error: 'Invalid credentials' });
    const ok = await bcrypt.compare(password, dep.password_hash);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
    const token = signToken({ role: 'DEPT', departmentId: dep.id, orgId: dep.organization_id, sub: `dept:${dep.id}` });
    res.json({ token, user: { id: dep.id, role: 'DEPT', email: dep.email, name: dep.name, organizationId: dep.organization_id }, requirePasswordChange: !!dep.must_change_password });
  });

  // Department change password (first-time or later)
  router.post('/department/change-password', requireAuth(['DEPT']), async (req, res) => {
    const schema = z.object({ oldPassword: z.string().min(6), newPassword: z.string().min(6) });
    const parse = schema.safeParse(req.body);
    if (!parse.success) return res.status(400).json({ error: parse.error.flatten() });
    const { oldPassword, newPassword } = parse.data;
    const rows = await query('SELECT id, password_hash FROM departments WHERE id = ?', [req.user.departmentId]);
    const dep = rows[0];
    if (!dep) return res.status(404).json({ error: 'Department not found' });
    const ok = await bcrypt.compare(oldPassword, dep.password_hash);
    if (!ok) return res.status(401).json({ error: 'Invalid current password' });
    const newHash = await bcrypt.hash(newPassword, 10);
    await query('UPDATE departments SET password_hash = ?, must_change_password = 0 WHERE id = ?', [newHash, req.user.departmentId]);
    return res.json({ ok: true });
  });

  // Staff login
  router.post('/staff/login', async (req, res) => {
    const parse = credsSchema.pick({ email: true, password: true }).safeParse(req.body);
    if (!parse.success) return res.status(400).json({ error: parse.error.flatten() });
    const { email: rawEmail, password } = parse.data;
    const email = rawEmail.trim().toLowerCase();
    const rows = await query('SELECT id, name, email, password_hash, department_id, organization_id, must_change_password FROM staff WHERE email = ?', [email]);
    const staff = rows[0];
    if (!staff) return res.status(401).json({ error: 'Invalid credentials' });
    const ok = await bcrypt.compare(password, staff.password_hash);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
    const token = signToken({ role: 'STAFF', staffId: staff.id, departmentId: staff.department_id, orgId: staff.organization_id, sub: `staff:${staff.id}` });
    res.json({ token, user: { id: staff.id, role: 'STAFF', email: staff.email, name: staff.name, departmentId: staff.department_id }, requirePasswordChange: !!staff.must_change_password });
  });

  // Staff change password (first-time or later)
  router.post('/staff/change-password', requireAuth(['STAFF']), async (req, res) => {
    const schema = z.object({ oldPassword: z.string().min(6), newPassword: z.string().min(6) });
    const parse = schema.safeParse(req.body);
    if (!parse.success) return res.status(400).json({ error: parse.error.flatten() });
    const { oldPassword, newPassword } = parse.data;
    const rows = await query('SELECT id, password_hash FROM staff WHERE id = ?', [req.user.staffId]);
    const staff = rows[0];
    if (!staff) return res.status(404).json({ error: 'Staff not found' });
    const ok = await bcrypt.compare(oldPassword, staff.password_hash);
    if (!ok) return res.status(401).json({ error: 'Invalid current password' });
    const newHash = await bcrypt.hash(newPassword, 10);
    await query('UPDATE staff SET password_hash = ?, must_change_password = 0 WHERE id = ?', [newHash, req.user.staffId]);
    return res.json({ ok: true });
  });

  // Student login
  router.post('/student/login', async (req, res) => {
    const parse = credsSchema.pick({ email: true, password: true }).safeParse(req.body);
    if (!parse.success) return res.status(400).json({ error: parse.error.flatten() });
    const { email: rawEmail, password } = parse.data;
    const email = rawEmail.trim().toLowerCase();
    const rows = await query('SELECT id, name, email, password_hash, staff_id, department_id, organization_id, must_change_password FROM students WHERE email = ?', [email]);
    const student = rows[0];
    if (!student) return res.status(401).json({ error: 'Invalid credentials' });
    const ok = await bcrypt.compare(password, student.password_hash);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
    const token = signToken({ role: 'STUDENT', studentId: student.id, staffId: student.staff_id, departmentId: student.department_id, orgId: student.organization_id, sub: `student:${student.id}` });
    res.json({ token, user: { id: student.id, role: 'STUDENT', email: student.email, name: student.name, departmentId: student.department_id, staffId: student.staff_id }, requirePasswordChange: !!student.must_change_password });
  });

  // Student change password
  router.post('/student/change-password', requireAuth(['STUDENT']), async (req, res) => {
    const schema = z.object({ oldPassword: z.string().min(6), newPassword: z.string().min(6) });
    const parse = schema.safeParse(req.body);
    if (!parse.success) return res.status(400).json({ error: parse.error.flatten() });
    const { oldPassword, newPassword } = parse.data;
    const rows = await query('SELECT id, password_hash FROM students WHERE id = ?', [req.user.studentId]);
    const student = rows[0];
    if (!student) return res.status(404).json({ error: 'Student not found' });
    const ok = await bcrypt.compare(oldPassword, student.password_hash);
    if (!ok) return res.status(401).json({ error: 'Invalid current password' });
    const newHash = await bcrypt.hash(newPassword, 10);
    await query('UPDATE students SET password_hash = ?, must_change_password = 0 WHERE id = ?', [newHash, req.user.studentId]);
    return res.json({ ok: true });
  });

  return router;
}
