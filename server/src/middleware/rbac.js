import { AuthorizationError } from '../utils/errors.js';

const roleLevels = {
  user: 0,
  admin: 1,
  superadmin: 2,
};

export const rbac = (requiredRole) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return next(new AuthorizationError());
    }

    const userLevel = roleLevels[req.user.role] ?? -1;
    const requiredLevel = roleLevels[requiredRole] ?? 99;

    if (userLevel < requiredLevel) {
      return next(new AuthorizationError('Access denied. Insufficient role permissions.'));
    }

    next();
  };
};

export default rbac;
