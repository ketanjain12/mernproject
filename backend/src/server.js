require('dotenv').config();

const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/authRoutes');
const passwordResetRoutes = require('./routes/passwordResetRoutes');
const userRoutes = require('./routes/userRoutes');
const domainRoutes = require('./routes/domainRoutes');
const auditRoutes = require('./routes/auditRoutes');
const meRoutes = require('./routes/meRoutes');
const statsRoutes = require('./routes/statsRoutes');
const rateLimit = require('./middleware/rateLimit');
const { ensureDb } = require('./utils/dbInit');

const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN || '*', credentials: true }));
app.use(express.json());

app.get('/health', (req, res) => res.json({ ok: true }));

ensureDb().catch(() => {});

app.use('/api/auth', rateLimit({ windowMs: 60_000, max: 30, keyPrefix: 'auth' }), authRoutes);
app.use('/api/auth', rateLimit({ windowMs: 60_000, max: 20, keyPrefix: 'auth_reset' }), passwordResetRoutes);
app.use('/api/users', userRoutes);
app.use('/api/domains', domainRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/me', meRoutes);
app.use('/api/stats', statsRoutes);

app.use((req, res) => {
  res.status(404).json({ message: 'Not found' });
});

app.use((err, req, res, next) => {
  const status = err.statusCode || err.status || 500;
  const message = err.message || 'Server error';
  if (process.env.NODE_ENV !== 'production') {
    return res.status(status).json({ message, stack: err.stack });
  }
  return res.status(status).json({ message });
});

const port = Number(process.env.PORT || 5000);
app.listen(port, () => {
  process.stdout.write(`Server listening on port ${port}\n`);
});

module.exports = app;
