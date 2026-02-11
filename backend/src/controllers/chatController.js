const pool = require('../db/pool');

async function listChatUsers(req, res) {
  const q = String(req.query.q || '').trim().toLowerCase();

  const where = [];
  const values = [];
  let idx = 1;

  where.push(`id <> $${idx++}`);
  values.push(Number(req.user.id));

  if (req.user.role !== 'admin') {
    where.push(`role = 'admin'`);
  }

  if (q) {
    where.push(`(LOWER(name) LIKE $${idx} OR LOWER(email) LIKE $${idx})`);
    values.push(`%${q}%`);
    idx++;
  }

  const sql = `SELECT id, name, email, role FROM users ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY name LIMIT 50`;
  const result = await pool.query(sql, values);
  return res.json(result.rows);
}

async function ensureMember(roomId, userId) {
  const mem = await pool.query('SELECT 1 FROM chat_room_members WHERE room_id = $1 AND user_id = $2', [roomId, userId]);
  return mem.rowCount > 0;
}

async function getRoomSummaryForUser(roomId, userId) {
  const roomRes = await pool.query(
    `SELECT r.id, r.type, r.name, r.created_at
     FROM chat_rooms r
     JOIN chat_room_members m ON m.room_id = r.id
     WHERE r.id = $1 AND m.user_id = $2`,
    [roomId, userId]
  );
  if (roomRes.rowCount === 0) return null;
  const room = roomRes.rows[0];

  const membersRes = await pool.query(
    `SELECT u.id, u.name, u.email, u.role
     FROM chat_room_members m
     JOIN users u ON u.id = m.user_id
     WHERE m.room_id = $1
     ORDER BY u.name`,
    [roomId]
  );

  const lastMsgRes = await pool.query(
    `SELECT id, sender_id, body, created_at
     FROM chat_messages
     WHERE room_id = $1
     ORDER BY id DESC
     LIMIT 1`,
    [roomId]
  );

  const lastReadRes = await pool.query(
    'SELECT last_read_message_id FROM chat_room_reads WHERE room_id = $1 AND user_id = $2',
    [roomId, userId]
  );
  const lastReadId = Number(lastReadRes.rows[0]?.last_read_message_id || 0);

  const unreadRes = await pool.query(
    `SELECT COUNT(*)::int AS c
     FROM chat_messages
     WHERE room_id = $1 AND id > $2 AND sender_id <> $3`,
    [roomId, lastReadId, userId]
  );
  const unreadCount = unreadRes.rows[0]?.c || 0;

  return {
    ...room,
    members: membersRes.rows,
    lastMessage: lastMsgRes.rows[0] || null,
    unreadCount,
  };
}

async function listMyRooms(req, res) {
  const userId = Number(req.user.id);

  const roomsRes = await pool.query(
    `SELECT r.id, r.type, r.name, r.created_at
     FROM chat_rooms r
     JOIN chat_room_members m ON m.room_id = r.id
     WHERE m.user_id = $1
     ORDER BY r.id DESC`,
    [userId]
  );

  const rooms = [];
  for (const r of roomsRes.rows) {
    const summary = await getRoomSummaryForUser(r.id, userId);
    if (summary) rooms.push(summary);
  }

  return res.json(rooms);
}

async function createOrGetDirectRoom(req, res) {
  const userId = Number(req.user.id);
  const otherUserId = Number(req.body.userId);

  if (!Number.isFinite(otherUserId)) {
    return res.status(400).json({ message: 'userId is required' });
  }
  if (otherUserId === userId) {
    return res.status(400).json({ message: 'Cannot chat with yourself' });
  }

  const otherRes = await pool.query('SELECT id, role FROM users WHERE id = $1', [otherUserId]);
  if (otherRes.rowCount === 0) {
    return res.status(404).json({ message: 'User not found' });
  }

  if (req.user.role !== 'admin') {
    if (otherRes.rows[0].role !== 'admin') {
      return res.status(403).json({ message: 'You can only message admins' });
    }
  }

  // find existing direct room with exactly these 2 members
  const existing = await pool.query(
    `SELECT r.id
     FROM chat_rooms r
     JOIN chat_room_members m1 ON m1.room_id = r.id AND m1.user_id = $1
     JOIN chat_room_members m2 ON m2.room_id = r.id AND m2.user_id = $2
     WHERE r.type = 'direct'
     LIMIT 1`,
    [userId, otherUserId]
  );

  let roomId;
  if (existing.rowCount > 0) {
    roomId = existing.rows[0].id;
  } else {
    const created = await pool.query(
      "INSERT INTO chat_rooms (type, name, created_by) VALUES ('direct', NULL, $1) RETURNING id",
      [userId]
    );
    roomId = created.rows[0].id;

    await pool.query('INSERT INTO chat_room_members (room_id, user_id, role) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING', [
      roomId,
      userId,
      'member',
    ]);
    await pool.query('INSERT INTO chat_room_members (room_id, user_id, role) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING', [
      roomId,
      otherUserId,
      'member',
    ]);
  }

  const summary = await getRoomSummaryForUser(roomId, userId);
  return res.status(existing.rowCount > 0 ? 200 : 201).json(summary);
}

async function createGroupRoom(req, res) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Only admin can create group rooms' });
  }

  const userId = Number(req.user.id);
  const name = String(req.body.name || '').trim();
  const memberIds = Array.isArray(req.body.memberIds) ? req.body.memberIds : [];

  const parsed = memberIds.map((n) => Number(n)).filter(Number.isFinite);
  const unique = Array.from(new Set([userId, ...parsed]));

  if (!name) {
    return res.status(400).json({ message: 'name is required' });
  }
  if (unique.length < 2) {
    return res.status(400).json({ message: 'At least 2 members required' });
  }

  const created = await pool.query(
    "INSERT INTO chat_rooms (type, name, created_by) VALUES ('group', $1, $2) RETURNING id",
    [name, userId]
  );
  const roomId = created.rows[0].id;

  for (const id of unique) {
    await pool.query('INSERT INTO chat_room_members (room_id, user_id, role) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING', [
      roomId,
      id,
      id === userId ? 'admin' : 'member',
    ]);
  }

  const summary = await getRoomSummaryForUser(roomId, userId);
  return res.status(201).json(summary);
}

async function listRoomMessages(req, res) {
  const userId = Number(req.user.id);
  const roomId = Number(req.params.roomId);

  if (!Number.isFinite(roomId)) {
    return res.status(400).json({ message: 'Invalid room id' });
  }

  const isMember = await ensureMember(roomId, userId);
  if (!isMember) {
    return res.status(403).json({ message: 'Not a member of this room' });
  }

  const limit = Math.min(100, Math.max(1, Number(req.query.limit || 30)));
  const beforeId = Number(req.query.beforeId || 0);

  let sql =
    `SELECT m.id, m.room_id, m.sender_id, u.name AS sender_name, u.role AS sender_role, m.body, m.created_at,
            m.attachment_url, m.attachment_name, m.attachment_mime, m.attachment_size
     FROM chat_messages m
     LEFT JOIN users u ON u.id = m.sender_id
     WHERE m.room_id = $1`;
  const values = [roomId];

  if (Number.isFinite(beforeId) && beforeId > 0) {
    sql += ' AND m.id < $2';
    values.push(beforeId);
  }

  sql += ' ORDER BY m.id DESC LIMIT ' + limit;

  const result = await pool.query(sql, values);
  return res.json(result.rows.reverse());
}

async function sendRoomMessage(req, res) {
  const userId = Number(req.user.id);
  const roomId = Number(req.params.roomId);
  const body = String(req.body.body || '').trim();
  const attachmentUrl = req.body.attachmentUrl ? String(req.body.attachmentUrl) : '';
  const attachmentName = req.body.attachmentName ? String(req.body.attachmentName) : '';
  const attachmentMime = req.body.attachmentMime ? String(req.body.attachmentMime) : '';
  const attachmentSize = req.body.attachmentSize ? Number(req.body.attachmentSize) : null;

  if (!Number.isFinite(roomId)) {
    return res.status(400).json({ message: 'Invalid room id' });
  }
  if (!body && !attachmentUrl) {
    return res.status(400).json({ message: 'Message body or attachment is required' });
  }

  const isMember = await ensureMember(roomId, userId);
  if (!isMember) {
    return res.status(403).json({ message: 'Not a member of this room' });
  }

  const created = await pool.query(
    `INSERT INTO chat_messages (room_id, sender_id, body, attachment_url, attachment_name, attachment_mime, attachment_size)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, room_id, sender_id, body, created_at, attachment_url, attachment_name, attachment_mime, attachment_size`,
    [roomId, userId, body || '', attachmentUrl || null, attachmentName || null, attachmentMime || null, Number.isFinite(attachmentSize) ? attachmentSize : null]
  );

  const msg = created.rows[0];
  return res.status(201).json(msg);
}

async function uploadChatAttachment(req, res) {
  if (!req.file) {
    return res.status(400).json({ message: 'file is required' });
  }

  const urlPath = `/uploads/chat/${req.file.filename}`;
  return res.status(201).json({
    url: urlPath,
    name: req.file.originalname,
    mime: req.file.mimetype,
    size: req.file.size,
  });
}

async function markRoomRead(req, res) {
  const userId = Number(req.user.id);
  const roomId = Number(req.params.roomId);
  if (!Number.isFinite(roomId)) {
    return res.status(400).json({ message: 'Invalid room id' });
  }

  const isMember = await ensureMember(roomId, userId);
  if (!isMember) {
    return res.status(403).json({ message: 'Not a member of this room' });
  }

  const lastMsgRes = await pool.query('SELECT id FROM chat_messages WHERE room_id = $1 ORDER BY id DESC LIMIT 1', [roomId]);
  const lastId = Number(lastMsgRes.rows[0]?.id || 0);

  await pool.query(
    `INSERT INTO chat_room_reads (room_id, user_id, last_read_message_id)
     VALUES ($1, $2, $3)
     ON CONFLICT (room_id, user_id)
     DO UPDATE SET last_read_message_id = GREATEST(chat_room_reads.last_read_message_id, EXCLUDED.last_read_message_id), updated_at = NOW()`,
    [roomId, userId, lastId]
  );

  return res.json({ ok: true, lastReadMessageId: lastId });
}

module.exports = {
  listChatUsers,
  listMyRooms,
  createOrGetDirectRoom,
  createGroupRoom,
  listRoomMessages,
  sendRoomMessage,
  markRoomRead,
  uploadChatAttachment,
};
