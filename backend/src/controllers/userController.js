const bcrypt = require('bcrypt');
const pool = require('../db/pool');

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
  return res.json(result.rows[0]);
}

async function deleteUser(req, res) {
  const userId = Number(req.params.id);
  if (!Number.isFinite(userId)) {
    return res.status(400).json({ message: 'Invalid user id' });
  }

  const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING id', [userId]);
  if (result.rowCount === 0) {
    return res.status(404).json({ message: 'User not found' });
  }
  return res.status(204).send();
}

module.exports = { listUsers, createUser, updateUser, deleteUser };
