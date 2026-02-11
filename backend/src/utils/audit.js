const pool = require('../db/pool');

async function ensureAuditTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id BIGSERIAL PRIMARY KEY,
      actor_user_id INTEGER,
      actor_email TEXT,
      actor_role TEXT,
      action TEXT NOT NULL,
      entity_type TEXT,
      entity_id TEXT,
      meta JSONB,
      ip TEXT,
      user_agent TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query('CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);');
  await pool.query('CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);');
  await pool.query('CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);');
}

async function writeAudit(req, { action, entityType, entityId, meta }) {
  try {
    const actor = req && req.user ? req.user : null;
    await pool.query(
      `INSERT INTO audit_logs (actor_user_id, actor_email, actor_role, action, entity_type, entity_id, meta, ip, user_agent)
       VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8,$9)`,
      [
        actor ? actor.id : null,
        actor ? actor.email : null,
        actor ? actor.role : null,
        String(action),
        entityType ? String(entityType) : null,
        typeof entityId === 'undefined' || entityId === null ? null : String(entityId),
        meta ? meta : null,
        req ? req.ip : null,
        req ? req.get('user-agent') : null,
      ]
    );
  } catch (err) {
    return;
  }
}

module.exports = { ensureAuditTable, writeAudit };
