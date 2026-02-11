const bcrypt = require('bcrypt');
const pool = require('../db/pool');
const { writeAudit } = require('../utils/audit');

async function assertNotLastAdmin(userIds) {
  const ids = (Array.isArray(userIds) ? userIds : []).map((n) => Number(n)).filter(Number.isFinite);
  if (ids.length === 0) return;

  const adminCountRes = await pool.query("SELECT COUNT(*)::int AS c FROM users WHERE role = 'admin'");
  const adminCount = adminCountRes.rows[0]?.c || 0;
  if (adminCount <= 1) {
    const deletingAdminRes = await pool.query("SELECT id FROM users WHERE id = ANY($1::int[]) AND role = 'admin'", [ids]);
    if (deletingAdminRes.rowCount > 0) {
      const err = new Error('Cannot remove the last admin');
      err.statusCode = 400;
      throw err;
    }
  }
}

async function listUsers(req, res) {
  const result = await pool.query(
    'SELECT id, name, email, role, created_at FROM users WHERE id <> $1 ORDER BY id',
    [req.user.id]
  );
  return res.json(result.rows);
}

async function createUser(req, res) {
  const { name, email, password, role } = req.body;
  if (!name || !email || !password || !role) {
    return res.status(400).json({ message: 'name, email, password, role are required' });
  }
  if (!['admin', 'user'].includes(role)) {
    return res.status(400).json({ message: 'role must be admin or user' });
  }

  const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
  if (existing.rowCount > 0) {
    return res.status(409).json({ message: 'Email already exists' });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const created = await pool.query(
    'INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role, created_at',
    [name, email.toLowerCase(), passwordHash, role]
  );
  await writeAudit(req, {
    action: 'user.create',
    entityType: 'user',
    entityId: created.rows[0].id,
    meta: { email: created.rows[0].email, role: created.rows[0].role },
  });
  return res.status(201).json(created.rows[0]);
}

async function updateUser(req, res) {
  const userId = Number(req.params.id);
  const { name, email, role, password } = req.body;

  if (!Number.isFinite(userId)) {
    return res.status(400).json({ message: 'Invalid user id' });
  }

  const existing = await pool.query('SELECT id FROM users WHERE id = $1', [userId]);
  if (existing.rowCount === 0) {
    return res.status(404).json({ message: 'User not found' });
  }

  if (role && !['admin', 'user'].includes(role)) {
    return res.status(400).json({ message: 'role must be admin or user' });
  }

  if (role === 'user') {
    const adminCountRes = await pool.query("SELECT COUNT(*)::int AS c FROM users WHERE role = 'admin'");
    const adminCount = adminCountRes.rows[0]?.c || 0;
    if (adminCount <= 1) {
      const isAdminRes = await pool.query("SELECT id FROM users WHERE id = $1 AND role = 'admin'", [userId]);
      if (isAdminRes.rowCount > 0) {
        return res.status(400).json({ message: 'Cannot demote the last admin' });
      }
    }
  }

  const updates = [];
  const values = [];
  let idx = 1;

  if (name) {
    updates.push(`name = $${idx++}`);
    values.push(name);
  }
  if (email) {
    updates.push(`email = $${idx++}`);
    values.push(email.toLowerCase());
  }
  if (role) {
    updates.push(`role = $${idx++}`);
    values.push(role);
  }
  if (password) {
    const passwordHash = await bcrypt.hash(password, 10);
    updates.push(`password_hash = $${idx++}`);
    values.push(passwordHash);
  }

  if (updates.length === 0) {
    return res.status(400).json({ message: 'Nothing to update' });
  }

  values.push(userId);
  const result = await pool.query(
    `UPDATE users SET ${updates.join(', ')} WHERE id = $${idx} RETURNING id, name, email, role, created_at`,
    values
  );
  await writeAudit(req, {
    action: 'user.update',
    entityType: 'user',
    entityId: result.rows[0].id,
    meta: { email: result.rows[0].email, role: result.rows[0].role },
  });
  return res.json(result.rows[0]);
}

async function deleteUser(req, res) {
  const userId = Number(req.params.id);
  if (!Number.isFinite(userId)) {
    return res.status(400).json({ message: 'Invalid user id' });
  }

  try {
    await assertNotLastAdmin([userId]);
  } catch (err) {
    return res.status(err.statusCode || 400).json({ message: err.message || 'Cannot delete user' });
  }

  const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING id', [userId]);
  if (result.rowCount === 0) {
    return res.status(404).json({ message: 'User not found' });
  }
  await writeAudit(req, { action: 'user.delete', entityType: 'user', entityId: userId });
  return res.status(204).send();
}

async function bulkDeleteUsers(req, res) {
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ message: 'ids must be a non-empty array' });
  }

  const parsed = ids.map((n) => Number(n)).filter(Number.isFinite);
  if (parsed.length === 0) {
    return res.status(400).json({ message: 'ids must contain valid numbers' });
  }

  if (parsed.includes(Number(req.user.id))) {
    return res.status(400).json({ message: 'Cannot delete your own account' });
  }

  try {
    await assertNotLastAdmin(parsed);
  } catch (err) {
    return res.status(err.statusCode || 400).json({ message: err.message || 'Cannot delete users' });
  }

  const result = await pool.query('DELETE FROM users WHERE id = ANY($1::int[]) RETURNING id', [parsed]);
  await writeAudit(req, { action: 'user.bulk_delete', entityType: 'user', meta: { ids: result.rows.map((r) => r.id) } });
  return res.json({ deleted: result.rows.map((r) => r.id) });
}

module.exports = { listUsers, createUser, updateUser, deleteUser, bulkDeleteUsers };
