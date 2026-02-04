require('dotenv').config();

const bcrypt = require('bcrypt');
const pool = require('../src/db/pool');

(async () => {
  const adminEmail = process.env.SEED_ADMIN_EMAIL || 'admin@example.com';
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'Admin@123';
  const userEmail = process.env.SEED_USER_EMAIL || 'user@example.com';
  const userPassword = process.env.SEED_USER_PASSWORD || 'User@123';

  try {
    const adminHash = await bcrypt.hash(adminPassword, 10);
    const userHash = await bcrypt.hash(userPassword, 10);

    const adminRes = await pool.query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, 'admin')
       ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name, password_hash = EXCLUDED.password_hash, role='admin'
       RETURNING id`,
      ['Admin', adminEmail.toLowerCase(), adminHash]
    );

    const userRes = await pool.query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, 'user')
       ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name, password_hash = EXCLUDED.password_hash, role='user'
       RETURNING id`,
      ['User', userEmail.toLowerCase(), userHash]
    );

    const domain1 = await pool.query(
      `INSERT INTO domains (domain_name, description)
       VALUES ($1, $2)
       ON CONFLICT (domain_name) DO UPDATE SET description = EXCLUDED.description
       RETURNING id`,
      ['example.com', 'Example domain']
    );

    const domain2 = await pool.query(
      `INSERT INTO domains (domain_name, description)
       VALUES ($1, $2)
       ON CONFLICT (domain_name) DO UPDATE SET description = EXCLUDED.description
       RETURNING id`,
      ['myapp.com', 'My App domain']
    );

    await pool.query(
      'INSERT INTO user_domains (user_id, domain_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [userRes.rows[0].id, domain1.rows[0].id]
    );

    process.stdout.write('Seed completed.\n');
    process.stdout.write(`Admin: ${adminEmail} / ${adminPassword}\n`);
    process.stdout.write(`User: ${userEmail} / ${userPassword}\n`);
    process.exit(0);
  } catch (err) {
    process.stderr.write(`Seed failed: ${err.message}\n`);
    process.exit(1);
  }
})();
