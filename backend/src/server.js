require('dotenv').config();

const express = require('express');
const cors = require('cors');
const http = require('http');
const jwt = require('jsonwebtoken');
const { Server } = require('socket.io');
const path = require('path');

const authRoutes = require('./routes/authRoutes');
const passwordResetRoutes = require('./routes/passwordResetRoutes');
const userRoutes = require('./routes/userRoutes');
const domainRoutes = require('./routes/domainRoutes');
const auditRoutes = require('./routes/auditRoutes');
const meRoutes = require('./routes/meRoutes');
const statsRoutes = require('./routes/statsRoutes');
const chatRoutes = require('./routes/chatRoutes');
const rateLimit = require('./middleware/rateLimit');
const { ensureDb } = require('./utils/dbInit');
const pool = require('./db/pool');

const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN || '*', credentials: true }));
app.use(express.json());

app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

app.get('/health', (req, res) => res.json({ ok: true }));

ensureDb().catch(() => {});

app.use('/api/auth', rateLimit({ windowMs: 60_000, max: 30, keyPrefix: 'auth' }), authRoutes);
app.use('/api/auth', rateLimit({ windowMs: 60_000, max: 20, keyPrefix: 'auth_reset' }), passwordResetRoutes);
app.use('/api/users', userRoutes);
app.use('/api/domains', domainRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/me', meRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/chat', chatRoutes);

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

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
  },
});

io.use((socket, next) => {
  const token = socket.handshake?.auth?.token || socket.handshake?.headers?.authorization?.replace(/^Bearer\s+/i, '');
  if (!token) {
    const err = new Error('Missing token');
    err.data = { code: 'AUTH_MISSING' };
    return next(err);
  }
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    socket.user = payload;
    return next();
  } catch (e) {
    const err = new Error('Invalid token');
    err.data = { code: 'AUTH_INVALID' };
    return next(err);
  }
});

io.on('connection', (socket) => {
  socket.on('room:join', async ({ roomId }) => {
    const rid = Number(roomId);
    if (!Number.isFinite(rid)) return;
    const userId = Number(socket.user?.id);
    try {
      const mem = await pool.query('SELECT 1 FROM chat_room_members WHERE room_id = $1 AND user_id = $2', [rid, userId]);
      if (mem.rowCount === 0) return;
      socket.join(`room:${rid}`);

      const lastMsgRes = await pool.query('SELECT id FROM chat_messages WHERE room_id = $1 ORDER BY id DESC LIMIT 1', [rid]);
      const lastId = Number(lastMsgRes.rows[0]?.id || 0);
      await pool.query(
        `INSERT INTO chat_room_reads (room_id, user_id, last_read_message_id)
         VALUES ($1, $2, $3)
         ON CONFLICT (room_id, user_id)
         DO UPDATE SET last_read_message_id = GREATEST(chat_room_reads.last_read_message_id, EXCLUDED.last_read_message_id), updated_at = NOW()`,
        [rid, userId, lastId]
      );
    } catch (_) {}
  });

  socket.on('room:leave', ({ roomId }) => {
    const rid = Number(roomId);
    if (!Number.isFinite(rid)) return;
    socket.leave(`room:${rid}`);
  });

  socket.on('room:message', async ({ roomId, body, tempId, attachment }) => {
    const rid = Number(roomId);
    const text = String(body || '').trim();
    const att = attachment && typeof attachment === 'object' ? attachment : null;
    const attUrl = att?.url ? String(att.url) : '';
    const attName = att?.name ? String(att.name) : '';
    const attMime = att?.mime ? String(att.mime) : '';
    const attSize = att?.size ? Number(att.size) : null;

    if (!Number.isFinite(rid)) return;
    if (!text && !attUrl) return;

    const userId = Number(socket.user?.id);
    try {
      const mem = await pool.query('SELECT 1 FROM chat_room_members WHERE room_id = $1 AND user_id = $2', [rid, userId]);
      if (mem.rowCount === 0) return;

      const created = await pool.query(
        `INSERT INTO chat_messages (room_id, sender_id, body, attachment_url, attachment_name, attachment_mime, attachment_size)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, room_id, sender_id, body, created_at, attachment_url, attachment_name, attachment_mime, attachment_size`,
        [rid, userId, text || '', attUrl || null, attName || null, attMime || null, Number.isFinite(attSize) ? attSize : null]
      );

      const msgId = Number(created.rows[0]?.id || 0);
      if (msgId > 0) {
        await pool.query(
          `INSERT INTO chat_room_reads (room_id, user_id, last_read_message_id)
           VALUES ($1, $2, $3)
           ON CONFLICT (room_id, user_id)
           DO UPDATE SET last_read_message_id = GREATEST(chat_room_reads.last_read_message_id, EXCLUDED.last_read_message_id), updated_at = NOW()`,
          [rid, userId, msgId]
        );
      }

      const senderRes = await pool.query('SELECT name, role FROM users WHERE id = $1', [userId]);
      const sender = senderRes.rows[0] || { name: 'Unknown', role: 'user' };

      io.to(`room:${rid}`).emit('room:message', {
        ...created.rows[0],
        sender_name: sender.name,
        sender_role: sender.role,
        tempId: tempId ? String(tempId) : undefined,
      });
    } catch (_) {}
  });
});

server.listen(port, () => {
  process.stdout.write(`Server listening on port ${port}\n`);
});

module.exports = app;
