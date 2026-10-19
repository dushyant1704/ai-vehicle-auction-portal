/**
 * ═══════════════════════════════════════════════════════════════════
 * SECURITY MIDDLEWARE
 * 
 * Includes rate limiting, input sanitization, and query injection prevention.
 * ═══════════════════════════════════════════════════════════════════
 */

// Simple in-memory rate limiter for production stability without external Redis dependency
const requestCounts = new Map();

/**
 * Rate Limiting Middleware
 * @param {number} maxRequests - Max allowed requests per window
 * @param {number} windowMs - Window duration in milliseconds
 */
exports.rateLimiter = (maxRequests = 100, windowMs = 15 * 60 * 1000) => {
  return (req, res, next) => {
    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
    const key = `${req.path}:${ip}`;
    const now = Date.now();

    if (!requestCounts.has(key)) {
      requestCounts.set(key, { count: 1, resetTime: now + windowMs });
      return next();
    }

    const record = requestCounts.get(key);

    if (now > record.resetTime) {
      record.count = 1;
      record.resetTime = now + windowMs;
      return next();
    }

    record.count += 1;

    if (record.count > maxRequests) {
      return res.status(429).json({
        error: 'Too Many Requests',
        message: 'Rate limit exceeded. Please try again later.',
        retryAfterMs: record.resetTime - now
      });
    }

    next();
  };
};

/**
 * Clean & sanitize query parameters to prevent NoSQL injection ($gt, $ne, etc.)
 */
exports.sanitizeQueryParams = (req, res, next) => {
  if (req.query) {
    for (const key in req.query) {
      if (typeof req.query[key] === 'string' && req.query[key].startsWith('$')) {
        delete req.query[key];
      }
    }
  }
  if (req.body && typeof req.body === 'object') {
    for (const key in req.body) {
      if (key.startsWith('$')) {
        delete req.body[key];
      }
    }
  }
  next();
};
