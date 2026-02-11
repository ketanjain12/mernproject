const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const pool = require('../db/pool');
const { sendOtpEmail, hasSmtpConfig } = require('../utils/mailer');
const { writeAudit } = require('../utils/audit');

function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '1d' }
  );
}

function generateOtp() {
  const n = crypto.randomInt(0, 1000000);
  return String(n).padStart(6, '0');
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

  const otp = generateOtp();
  const otpHash = await bcrypt.hash(otp, 10);
  const otpToken = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  await pool.query('DELETE FROM user_otps WHERE user_id = $1', [user.id]);
  await pool.query(
    'INSERT INTO user_otps (user_id, token_id, otp_hash, expires_at) VALUES ($1, $2, $3, $4)',
    [user.id, otpToken, otpHash, expiresAt]
  );

  const emailRes = await sendOtpEmail({ to: user.email, otp });

  const allowDevOtp = String(process.env.OTP_SHOW_IN_RESPONSE || '').toLowerCase() === 'true' || !hasSmtpConfig();
  return res.json({
    otpRequired: true,
    otpToken,
    user,
    otp: allowDevOtp ? otp : undefined,
    message: emailRes.sent ? 'OTP sent to email' : 'OTP generated',
  });
}

async function verifyOtp(req, res) {
  const { otpToken, otp } = req.body;
  if (!otpToken || !otp) {
    return res.status(400).json({ message: 'otpToken and otp are required' });
  }

  const cleanOtp = String(otp).trim();

  const otpRes = await pool.query(
    'SELECT id, user_id, otp_hash, expires_at FROM user_otps WHERE token_id = $1',
    [String(otpToken)]
  );
  if (otpRes.rowCount === 0) {
    return res.status(401).json({ message: 'Invalid OTP session' });
  }

  const row = otpRes.rows[0];
  if (new Date(row.expires_at).getTime() < Date.now()) {
    await pool.query('DELETE FROM user_otps WHERE id = $1', [row.id]);
    return res.status(401).json({ message: 'OTP expired' });
  }

  const ok = await bcrypt.compare(cleanOtp, row.otp_hash);
  if (!ok) {
    return res.status(401).json({ message: 'Invalid OTP' });
  }

  await pool.query('DELETE FROM user_otps WHERE id = $1', [row.id]);

  const userRes = await pool.query('SELECT id, name, email, role FROM users WHERE id = $1', [row.user_id]);
  if (userRes.rowCount === 0) {
    return res.status(404).json({ message: 'User not found' });
  }

  const user = userRes.rows[0];
  const token = signToken(user);
  await writeAudit(req, { action: 'auth.otp_verify', entityType: 'user', entityId: user.id });
  return res.json({ token, user });
}

async function resendOtp(req, res) {
  const { otpToken } = req.body;
  if (!otpToken) {
    return res.status(400).json({ message: 'otpToken is required' });
  }

  const otpRes = await pool.query(
    'SELECT id, user_id, expires_at, created_at FROM user_otps WHERE token_id = $1',
    [String(otpToken)]
  );
  if (otpRes.rowCount === 0) {
    return res.status(401).json({ message: 'Invalid OTP session' });
  }

  const row = otpRes.rows[0];
  const createdAt = row.created_at ? new Date(row.created_at).getTime() : 0;
  const now = Date.now();
  if (createdAt && now - createdAt < 30_000) {
    const retryAfter = Math.max(1, Math.ceil((30_000 - (now - createdAt)) / 1000));
    res.setHeader('Retry-After', String(retryAfter));
    return res.status(429).json({ message: 'Please wait before resending OTP', retryAfter });
  }

  const userRes = await pool.query('SELECT id, name, email, role FROM users WHERE id = $1', [row.user_id]);
  if (userRes.rowCount === 0) {
    return res.status(404).json({ message: 'User not found' });
  }

  const user = userRes.rows[0];
  const otp = generateOtp();
  const otpHash = await bcrypt.hash(otp, 10);
  const newOtpToken = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  await pool.query('UPDATE user_otps SET token_id = $1, otp_hash = $2, expires_at = $3, created_at = NOW() WHERE id = $4', [
    newOtpToken,
    otpHash,
    expiresAt,
    row.id,
  ]);

  const emailRes = await sendOtpEmail({ to: user.email, otp });
  const allowDevOtp = String(process.env.OTP_SHOW_IN_RESPONSE || '').toLowerCase() === 'true' || !hasSmtpConfig();

  await writeAudit(req, { action: 'auth.otp_resend', entityType: 'user', entityId: user.id });

  return res.json({
    otpToken: newOtpToken,
    message: emailRes.sent ? 'OTP resent to email' : 'OTP regenerated',
    otp: allowDevOtp ? otp : undefined,
  });
}

module.exports = { signup, login, verifyOtp, resendOtp };
