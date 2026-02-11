const bcrypt = require('bcrypt');
const pool = require('../db/pool');
const { writeAudit } = require('../utils/audit');

async function getMe(req, res) {
  const meRes = await pool.query('SELECT id, name, email, role, created_at FROM users WHERE id = $1', [req.user.id]);
  if (meRes.rowCount === 0) return res.status(404).json({ message: 'User not found' });
  return res.json(meRes.rows[0]);
}

async function updateMe(req, res) {
  const { name } = req.body;
  if (!name) return res.status(400).json({ message: 'name is required' });

  const result = await pool.query('UPDATE users SET name = $1 WHERE id = $2 RETURNING id, name, email, role, created_at', [
    name,
    req.user.id,
  ]);
  await writeAudit(req, { action: 'me.update', entityType: 'user', entityId: req.user.id });
  return res.json(result.rows[0]);
}

async function changePassword(req, res) {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ message: 'currentPassword and newPassword are required' });
  }

  const userRes = await pool.query('SELECT id, password_hash FROM users WHERE id = $1', [req.user.id]);
  if (userRes.rowCount === 0) return res.status(404).json({ message: 'User not found' });

  const ok = await bcrypt.compare(String(currentPassword), userRes.rows[0].password_hash);
  if (!ok) return res.status(401).json({ message: 'Current password is incorrect' });

  const passwordHash = await bcrypt.hash(String(newPassword), 10);
  await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [passwordHash, req.user.id]);
  await writeAudit(req, { action: 'me.change_password', entityType: 'user', entityId: req.user.id });
  return res.json({ message: 'Password updated' });
}

module.exports = { getMe, updateMe, changePassword };
