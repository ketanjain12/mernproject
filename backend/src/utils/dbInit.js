const pool = require('../db/pool');
const { ensureAuditTable } = require('./audit');

async function ensureOtpTableExtras() {
  await pool.query('ALTER TABLE IF EXISTS user_otps ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()');
}

async function ensureUserDomainsTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_domains (
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      domain_id INTEGER NOT NULL REFERENCES domains(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (user_id, domain_id)
    );
  `);
}

async function ensurePasswordResetTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id BIGSERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await pool.query('CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user ON password_reset_tokens(user_id);');
  await pool.query('CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires ON password_reset_tokens(expires_at);');

  await pool.query(`
    CREATE TABLE IF NOT EXISTS password_reset_otps (
      id BIGSERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      otp_hash TEXT NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await pool.query('CREATE INDEX IF NOT EXISTS idx_password_reset_otps_user ON password_reset_otps(user_id);');
  await pool.query('CREATE INDEX IF NOT EXISTS idx_password_reset_otps_expires ON password_reset_otps(expires_at);');
}

async function ensureChatTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS chat_rooms (
      id BIGSERIAL PRIMARY KEY,
      type TEXT NOT NULL CHECK (type IN ('direct', 'group')),
      name TEXT,
      created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await pool.query('CREATE INDEX IF NOT EXISTS idx_chat_rooms_type ON chat_rooms(type);');

  await pool.query(`
    CREATE TABLE IF NOT EXISTS chat_room_members (
      room_id BIGINT NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role TEXT NOT NULL DEFAULT 'member',
      joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (room_id, user_id)
    );
  `);
  await pool.query('CREATE INDEX IF NOT EXISTS idx_chat_room_members_user ON chat_room_members(user_id);');

  await pool.query(`
    CREATE TABLE IF NOT EXISTS chat_messages (
      id BIGSERIAL PRIMARY KEY,
      room_id BIGINT NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
      sender_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      body TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await pool.query('ALTER TABLE IF EXISTS chat_messages ADD COLUMN IF NOT EXISTS attachment_url TEXT');
  await pool.query('ALTER TABLE IF EXISTS chat_messages ADD COLUMN IF NOT EXISTS attachment_name TEXT');
  await pool.query('ALTER TABLE IF EXISTS chat_messages ADD COLUMN IF NOT EXISTS attachment_mime TEXT');
  await pool.query('ALTER TABLE IF EXISTS chat_messages ADD COLUMN IF NOT EXISTS attachment_size BIGINT');
  await pool.query('CREATE INDEX IF NOT EXISTS idx_chat_messages_room_created ON chat_messages(room_id, created_at DESC);');

  await pool.query(`
    CREATE TABLE IF NOT EXISTS chat_room_reads (
      room_id BIGINT NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      last_read_message_id BIGINT NOT NULL DEFAULT 0,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (room_id, user_id)
    );
  `);
  await pool.query('CREATE INDEX IF NOT EXISTS idx_chat_room_reads_user ON chat_room_reads(user_id);');
}

async function ensureDb() {
  await ensureAuditTable();
  await ensureOtpTableExtras();
  await ensurePasswordResetTables();
  await ensureUserDomainsTable();
  await ensureChatTables();
}

module.exports = { ensureDb };
