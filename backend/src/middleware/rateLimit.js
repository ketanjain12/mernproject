const buckets = new Map();

function rateLimit({ windowMs, max, keyPrefix }) {
  const w = Number(windowMs) || 60_000;
  const m = Number(max) || 30;
  const prefix = String(keyPrefix || 'rl');

  return (req, res, next) => {
    const key = `${prefix}:${req.ip}`;
    const now = Date.now();

    const cur = buckets.get(key);
    if (!cur || cur.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + w });
      return next();
    }

    cur.count += 1;
    if (cur.count > m) {
      const retryAfter = Math.max(1, Math.ceil((cur.resetAt - now) / 1000));
      res.setHeader('Retry-After', String(retryAfter));
      return res.status(429).json({ message: 'Too many requests. Please try again later.' });
    }

    return next();
  };
}

module.exports = rateLimit;
