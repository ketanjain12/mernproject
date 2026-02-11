const pool = require('../db/pool');

async function listAuditLogs(req, res) {
  const q = String(req.query.q || '').trim().toLowerCase();
  const page = Math.max(1, Number(req.query.page || 1));
  const pageSize = Math.min(100, Math.max(5, Number(req.query.pageSize || 20)));
  const offset = (page - 1) * pageSize;

  const whereParts = [];
  const values = [];
  let idx = 1;

  if (q) {
    whereParts.push(`(
      LOWER(action) LIKE $${idx} OR
      LOWER(COALESCE(entity_type,'')) LIKE $${idx} OR
      LOWER(COALESCE(entity_id,'')) LIKE $${idx} OR
      LOWER(COALESCE(actor_email,'')) LIKE $${idx}
    )`);
    values.push(`%${q}%`);
    idx += 1;
  }

  const where = whereParts.length ? `WHERE ${whereParts.join(' AND ')}` : '';

  const totalRes = await pool.query(`SELECT COUNT(*)::int AS c FROM audit_logs ${where}`, values);
  const total = totalRes.rows[0]?.c || 0;

  values.push(pageSize);
  values.push(offset);

  const rowsRes = await pool.query(
    `SELECT id, actor_user_id, actor_email, actor_role, action, entity_type, entity_id, meta, ip, user_agent, created_at
     FROM audit_logs
     ${where}
     ORDER BY created_at DESC
     LIMIT $${idx} OFFSET $${idx + 1}`,
    values
  );

  return res.json({ page, pageSize, total, rows: rowsRes.rows });
}

module.exports = { listAuditLogs };
