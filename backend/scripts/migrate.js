require('dotenv').config();

const pool = require('../src/db/pool');

const sql = `
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role VARCHAR(10) NOT NULL CHECK (role IN ('admin', 'user')),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS domains (
  id SERIAL PRIMARY KEY,
  domain_name VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_domains (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  domain_id INTEGER NOT NULL REFERENCES domains(id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, domain_id)
);
`;

(async () => {
  try {
    await pool.query(sql);
    process.stdout.write('Migration completed.\n');
    process.exit(0);
  } catch (err) {
    process.stderr.write(`Migration failed: ${err.message}\n`);
    process.exit(1);
  }
})();
