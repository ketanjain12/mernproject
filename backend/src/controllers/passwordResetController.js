const bcrypt = require('bcrypt');
const crypto = require('crypto');
const pool = require('../db/pool');
const {
  sendPasswordResetLinkEmail,
  sendPasswordResetOtpEmail,
  hasSmtpConfig,
} = require('../utils/mailer');
const { writeAudit } = require('../utils/audit');

function allowDevSecret() {
  return String(process.env.OTP_SHOW_IN_RESPONSE || '').toLowerCase() === 'true' || !hasSmtpConfig();
}

async function requestResetLink(req, res) {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: 'email is required' });

  const userRes = await pool.query('SELECT id, email FROM users WHERE email = $1', [String(email).toLowerCase()]);
  if (userRes.rowCount === 0) {
    return res.json({ message: 'If the email exists, a reset link will be sent.' });
  }

  const user = userRes.rows[0];
  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = await bcrypt.hash(token, 10);
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

  await pool.query('DELETE FROM password_reset_tokens WHERE user_id = $1', [user.id]);
  await pool.query(
    'INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES ($1,$2,$3)',
    [user.id, tokenHash, expiresAt]
  );

  const base = String(process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');
  const url = `${base}/reset-password?token=${encodeURIComponent(token)}&email=${encodeURIComponent(user.email)}`;

  const emailRes = await sendPasswordResetLinkEmail({ to: user.email, url });

  await writeAudit(req, { action: 'auth.password_reset_link_request', entityType: 'user', entityId: user.id });

  return res.json({
    message: emailRes.sent ? 'Password reset link sent' : 'Password reset link generated',
    resetUrl: allowDevSecret() ? url : undefined,
  });
}

async function resetPasswordWithLink(req, res) {
  const { email, token, newPassword } = req.body;
  if (!email || !token || !newPassword) {
    return res.status(400).json({ message: 'email, token and newPassword are required' });
  }

  const userRes = await pool.query('SELECT id, email FROM users WHERE email = $1', [String(email).toLowerCase()]);
  if (userRes.rowCount === 0) return res.status(400).json({ message: 'Invalid reset token' });
  const user = userRes.rows[0];

  const tRes = await pool.query(
    'SELECT id, token_hash, expires_at FROM password_reset_tokens WHERE user_id = $1 ORDER BY id DESC LIMIT 1',
    [user.id]
  );
  if (tRes.rowCount === 0) return res.status(400).json({ message: 'Invalid reset token' });

  const row = tRes.rows[0];
  if (new Date(row.expires_at).getTime() < Date.now()) {
    await pool.query('DELETE FROM password_reset_tokens WHERE id = $1', [row.id]);
    return res.status(400).json({ message: 'Reset token expired' });
  }

  const ok = await bcrypt.compare(String(token).trim(), row.token_hash);
  if (!ok) return res.status(400).json({ message: 'Invalid reset token' });

  const passwordHash = await bcrypt.hash(String(newPassword), 10);
  await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [passwordHash, user.id]);
  await pool.query('DELETE FROM password_reset_tokens WHERE user_id = $1', [user.id]);

  await writeAudit(req, { action: 'auth.password_reset_link_complete', entityType: 'user', entityId: user.id });
  return res.json({ message: 'Password updated' });
}

async function requestResetOtp(req, res) {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: 'email is required' });

  const userRes = await pool.query('SELECT id, email FROM users WHERE email = $1', [String(email).toLowerCase()]);
  if (userRes.rowCount === 0) {
    return res.json({ message: 'If the email exists, an OTP will be sent.' });
  }

  const user = userRes.rows[0];
  const otp = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
  const otpHash = await bcrypt.hash(otp, 10);
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  await pool.query('DELETE FROM password_reset_otps WHERE user_id = $1', [user.id]);
  await pool.query(
    'INSERT INTO password_reset_otps (user_id, otp_hash, expires_at) VALUES ($1,$2,$3)',
    [user.id, otpHash, expiresAt]
  );

  const emailRes = await sendPasswordResetOtpEmail({ to: user.email, otp });

  await writeAudit(req, { action: 'auth.password_reset_otp_request', entityType: 'user', entityId: user.id });

  return res.json({
    message: emailRes.sent ? 'Password reset OTP sent' : 'Password reset OTP generated',
    otp: allowDevSecret() ? otp : undefined,
  });
}

async function resetPasswordWithOtp(req, res) {
  const { email, otp, newPassword } = req.body;
  if (!email || !otp || !newPassword) {
    return res.status(400).json({ message: 'email, otp and newPassword are required' });
  }

  const userRes = await pool.query('SELECT id, email FROM users WHERE email = $1', [String(email).toLowerCase()]);
  if (userRes.rowCount === 0) return res.status(400).json({ message: 'Invalid OTP' });
  const user = userRes.rows[0];

  const oRes = await pool.query(
    'SELECT id, otp_hash, expires_at FROM password_reset_otps WHERE user_id = $1 ORDER BY id DESC LIMIT 1',
    [user.id]
  );
  if (oRes.rowCount === 0) return res.status(400).json({ message: 'Invalid OTP' });

  const row = oRes.rows[0];
  if (new Date(row.expires_at).getTime() < Date.now()) {
    await pool.query('DELETE FROM password_reset_otps WHERE id = $1', [row.id]);
    return res.status(400).json({ message: 'OTP expired' });
  }

  const ok = await bcrypt.compare(String(otp).trim(), row.otp_hash);
  if (!ok) return res.status(400).json({ message: 'Invalid OTP' });

  const passwordHash = await bcrypt.hash(String(newPassword), 10);
  await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [passwordHash, user.id]);
  await pool.query('DELETE FROM password_reset_otps WHERE user_id = $1', [user.id]);

  await writeAudit(req, { action: 'auth.password_reset_otp_complete', entityType: 'user', entityId: user.id });
  return res.json({ message: 'Password updated' });
}

module.exports = {
  requestResetLink,
  resetPasswordWithLink,
  requestResetOtp,
  resetPasswordWithOtp,
};
