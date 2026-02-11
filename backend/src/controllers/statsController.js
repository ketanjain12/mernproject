const pool = require('../db/pool');

async function getStats(req, res) {
  const usersRes = await pool.query('SELECT COUNT(*)::int AS c FROM users');
  const domainsRes = await pool.query('SELECT COUNT(*)::int AS c FROM domains');
  const assignmentsRes = await pool.query('SELECT COUNT(*)::int AS c FROM user_domains');

  return res.json({
    users: usersRes.rows[0]?.c || 0,
    domains: domainsRes.rows[0]?.c || 0,
    assignments: assignmentsRes.rows[0]?.c || 0,
  });
}

module.exports = { getStats };
