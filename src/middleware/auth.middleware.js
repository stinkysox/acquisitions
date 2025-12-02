import logger from '#config/logger.js';
import { jwttoken } from '#utils/jwt.js';

/**
 * Authentication middleware
 * Verifies JWT token from Authorization header and attaches user data to req.user
 */
export const authenticate = async (req, res, next) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      logger.warn('No authorization header provided');
      return res.status(401).json({
        error: 'Authentication required',
        message: 'No authorization token provided',
      });
    }

    // Check if token follows Bearer schema
    if (!authHeader.startsWith('Bearer ')) {
      logger.warn('Invalid authorization header format');
      return res.status(401).json({
        error: 'Authentication required',
        message: 'Invalid authorization header format. Use: Bearer <token>',
      });
    }

    // Extract token
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    if (!token) {
      logger.warn('Empty token provided');
      return res.status(401).json({
        error: 'Authentication required',
        message: 'Empty token provided',
      });
    }

    // Verify token
    const decoded = jwttoken.verify(token);

    // Attach user data to request object
    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
    };

    logger.info('User authenticated successfully', { userId: decoded.id });

    next();
  } catch (error) {
    // Handle specific JWT errors
    if (error.name === 'JsonWebTokenError') {
      logger.warn('Invalid JWT token', { error: error.message });
      return res.status(401).json({
        error: 'Authentication failed',
        message: 'Invalid token',
      });
    }

    if (error.name === 'TokenExpiredError') {
      logger.warn('JWT token expired', { expiredAt: error.expiredAt });
      return res.status(401).json({
        error: 'Authentication failed',
        message: 'Token has expired',
      });
    }

    logger.error('Error in authentication middleware:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'An error occurred during authentication',
    });
  }
};
export default authenticate;
