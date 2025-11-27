import aj from '#config/arcjet.js';
import { slidingWindow } from '@arcjet/node';
import logger from '#config/logger.js';

const securityMiddleware = async (req, res, next) => {
  try {
    const role = req.user?.role || 'guest';

    let limit, message;

    switch (role) {
      case 'admin':
        limit = 20;
        message =
          'Admin request limit exceeded (20 per minute). Slow down please.';
        break;

      case 'user':
        limit = 10;
        message =
          'User request limit exceeded (10 per minute). Slow down please.';
        break;

      default:
        limit = 5;
        message =
          'Guest request limit exceeded (5 per minute). Slow down please.';
    }

    // Create ARC client dynamically based on role
    const client = aj.withRule(
      slidingWindow({
        mode: 'LIVE',
        interval: '1m',
        max: limit,
        name: `${role} rate limit`,
      })
    );

    const decision = await client.protect(req);

    /* ---------------- BOT BLOCK ---------------- */
    if (decision.isDenied() && decision.reason.isBot()) {
      logger.warn('Bot detected', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        path: req.path,
        role,
      });

      return res.status(403).json({
        error: 'Access Denied',
        message: 'Bot traffic is not allowed',
      });
    }

    /* ---------------- RATE LIMIT BLOCK ---------------- */
    if (decision.isDenied() && decision.reason.isRateLimit()) {
      logger.warn('Rate limit exceeded', {
        ip: req.ip,
        role,
        path: req.path,
      });

      return res.status(429).json({
        error: 'Too many requests',
        message,
      });
    }

    /* ---------------- SHIELD BLOCK ---------------- */
    if (decision.isDenied() && decision.reason.isShield()) {
      logger.warn('Request blocked by shield', {
        ip: req.ip,
        role,
        path: req.path,
        method: req.method,
      });

      return res.status(429).json({
        error: 'Forbidden',
        message: 'Request blocked by security policy',
      });
    }

    next(); // allow route to continue
  } catch (error) {
    console.error('Security middleware error:', error);

    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Something went wrong with security middleware',
    });
  }
};

export default securityMiddleware;
