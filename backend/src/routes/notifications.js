import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { query } from '../db.js';

const router = express.Router();

function mapRoleForDB(role) {
  // Backend notifications table expects: ORG, DEPT, STAFF, STUDENT
  // We already issue tokens with these exact roles.
  return role;
}

export default function notificationsRouter() {
  // List notifications for current user
  router.get('/', requireAuth(['ORG', 'DEPT', 'STAFF', 'STUDENT']), async (req, res) => {
    const role = mapRoleForDB(req.user.role);
    const targetId =
      role === 'ORG' ? req.user.orgId :
      role === 'DEPT' ? req.user.departmentId :
      role === 'STAFF' ? req.user.staffId :
      req.user.studentId;

    const rows = await query(
      `SELECT id, role, target_id AS targetId, title, body, read_at AS readAt, created_at AS createdAt
       FROM notifications
       WHERE role = ? AND target_id = ?
       ORDER BY id DESC
       LIMIT 50`,
      [role, targetId]
    );
    res.json(rows);
  });

  // Mark as read
  router.put('/:id/read', requireAuth(['ORG', 'DEPT', 'STAFF', 'STUDENT']), async (req, res) => {
    const notifId = parseInt(req.params.id, 10);
    if (!notifId) return res.status(400).json({ error: 'Invalid notification id' });

    const role = mapRoleForDB(req.user.role);
    const targetId =
      role === 'ORG' ? req.user.orgId :
      role === 'DEPT' ? req.user.departmentId :
      role === 'STAFF' ? req.user.staffId :
      req.user.studentId;

    // Ensure ownership
    const rows = await query('SELECT id FROM notifications WHERE id = ? AND role = ? AND target_id = ?', [notifId, role, targetId]);
    if (!rows.length) return res.status(404).json({ error: 'Notification not found' });

    await query('UPDATE notifications SET read_at = NOW() WHERE id = ?', [notifId]);
    res.json({ ok: true });
  });

  return router;
}
