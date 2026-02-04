const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../db/pool');

function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '1d' }
  );
}

async function signup(req, res) {
  const { name, email, password, role, adminKey } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: 'name, email, password are required' });
  }

  let finalRole = 'user';
  if (role) {
    if (!['admin', 'user'].includes(role)) {
      return res.status(400).json({ message: 'role must be admin or user' });
    }
    if (role === 'admin') {
      const envKey = (process.env.ADMIN_SIGNUP_KEY || '').trim();
      const providedKey = (adminKey || '').trim();
      if (!envKey || providedKey !== envKey) {
        return res.status(403).json({ message: 'Admin signup is disabled' });
      }
      finalRole = 'admin';
    } else {
      finalRole = 'user';
    }
  }

  const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
  if (existing.rowCount > 0) {
    return res.status(409).json({ message: 'Email already exists' });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const created = await pool.query(
    'INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role',
    [name, email.toLowerCase(), passwordHash, finalRole]
  );

  const user = created.rows[0];
  const token = signToken(user);
  return res.status(201).json({ token, user });
}

async function login(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'email and password are required' });
  }

  const result = await pool.query('SELECT id, name, email, role, password_hash FROM users WHERE email = $1', [
    email.toLowerCase(),
  ]);
  if (result.rowCount === 0) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  const userRow = result.rows[0];
  const ok = await bcrypt.compare(password, userRow.password_hash);
  if (!ok) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  const user = { id: userRow.id, name: userRow.name, email: userRow.email, role: userRow.role };
  const token = signToken(user);
  return res.json({ token, user });
}

module.exports = { signup, login };
