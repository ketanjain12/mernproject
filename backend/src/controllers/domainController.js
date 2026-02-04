const pool = require('../db/pool');

async function listDomains(req, res) {
  const result = await pool.query('SELECT id, domain_name, description, created_at FROM domains ORDER BY id');
  return res.json(result.rows);
}

async function createDomain(req, res) {
  const { domain_name, description } = req.body;
  if (!domain_name) {
    return res.status(400).json({ message: 'domain_name is required' });
  }

  const created = await pool.query(
    'INSERT INTO domains (domain_name, description) VALUES ($1, $2) RETURNING id, domain_name, description, created_at',
    [domain_name, description || null]
  );
  return res.status(201).json(created.rows[0]);
}

async function updateDomain(req, res) {
  const domainId = Number(req.params.id);
  const { domain_name, description } = req.body;

  if (!Number.isFinite(domainId)) {
    return res.status(400).json({ message: 'Invalid domain id' });
  }

  const existing = await pool.query('SELECT id FROM domains WHERE id = $1', [domainId]);
  if (existing.rowCount === 0) {
    return res.status(404).json({ message: 'Domain not found' });
  }

  const updates = [];
  const values = [];
  let idx = 1;

  if (domain_name) {
    updates.push(`domain_name = $${idx++}`);
    values.push(domain_name);
  }
  if (typeof description !== 'undefined') {
    updates.push(`description = $${idx++}`);
    values.push(description || null);
  }

  if (updates.length === 0) {
    return res.status(400).json({ message: 'Nothing to update' });
  }

  values.push(domainId);
  const result = await pool.query(
    `UPDATE domains SET ${updates.join(', ')} WHERE id = $${idx} RETURNING id, domain_name, description, created_at`,
    values
  );

  return res.json(result.rows[0]);
}

async function deleteDomain(req, res) {
  const domainId = Number(req.params.id);
  if (!Number.isFinite(domainId)) {
    return res.status(400).json({ message: 'Invalid domain id' });
  }

  const result = await pool.query('DELETE FROM domains WHERE id = $1 RETURNING id', [domainId]);
  if (result.rowCount === 0) {
    return res.status(404).json({ message: 'Domain not found' });
  }

  return res.status(204).send();
}

async function assignDomains(req, res) {
  const userId = Number(req.params.userId);
  const { domainIds } = req.body;

  if (!Number.isFinite(userId)) {
    return res.status(400).json({ message: 'Invalid user id' });
  }
  if (!Array.isArray(domainIds)) {
    return res.status(400).json({ message: 'domainIds must be an array' });
  }

  const userRes = await pool.query('SELECT id FROM users WHERE id = $1', [userId]);
  if (userRes.rowCount === 0) {
    return res.status(404).json({ message: 'User not found' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM user_domains WHERE user_id = $1', [userId]);

    for (const domainId of domainIds) {
      const dId = Number(domainId);
      if (!Number.isFinite(dId)) {
        await client.query('ROLLBACK');
        return res.status(400).json({ message: 'Invalid domain id in domainIds' });
      }
      await client.query('INSERT INTO user_domains (user_id, domain_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [
        userId,
        dId,
      ]);
    }

    await client.query('COMMIT');
    const assigned = await pool.query(
      'SELECT d.id, d.domain_name, d.description, d.created_at FROM domains d JOIN user_domains ud ON ud.domain_id = d.id WHERE ud.user_id = $1 ORDER BY d.id',
      [userId]
    );
    return res.json({ userId, domains: assigned.rows });
  } catch (err) {
    await client.query('ROLLBACK');
    return res.status(500).json({ message: 'Failed to assign domains' });
  } finally {
    client.release();
  }
}

async function getAssignedDomains(req, res) {
  const userId = Number(req.params.userId);
  if (!Number.isFinite(userId)) {
    return res.status(400).json({ message: 'Invalid user id' });
  }

  if (req.user.role !== 'admin' && req.user.id !== userId) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  const result = await pool.query(
    'SELECT d.id, d.domain_name, d.description, d.created_at FROM domains d JOIN user_domains ud ON ud.domain_id = d.id WHERE ud.user_id = $1 ORDER BY d.id',
    [userId]
  );
  return res.json(result.rows);
}

async function getMyDomains(req, res) {
  const userId = req.user.id;
  const result = await pool.query(
    'SELECT d.id, d.domain_name, d.description, d.created_at FROM domains d JOIN user_domains ud ON ud.domain_id = d.id WHERE ud.user_id = $1 ORDER BY d.id',
    [userId]
  );
  return res.json(result.rows);
}

module.exports = {
  listDomains,
  createDomain,
  updateDomain,
  deleteDomain,
  assignDomains,
  getAssignedDomains,
  getMyDomains,
};
