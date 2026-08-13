import jwt from 'jsonwebtoken';
import env from '../config/env.js';
import { AuthenticationError } from '../utils/errors.js';

const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new AuthenticationError('Authentication required. Format: Bearer <token>', 'AUTH_UNAUTHORIZED'));
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, env.JWT_SECRET);
    req.user = {
      userId: payload.sub,
      role: payload.role,
    };
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return next(new AuthenticationError('Token has expired.', 'AUTH_TOKEN_EXPIRED'));
    }
    return next(new AuthenticationError('Invalid token.', 'AUTH_TOKEN_INVALID'));
  }
};

export default authenticate;
