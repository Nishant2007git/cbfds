import { ValidationError } from '../utils/errors.js';

// Express validation helper using Zod schemas
export const validate = (schema, target = 'body') => {
  return (req, res, next) => {
    const parsed = schema.safeParse(req[target]);
    if (!parsed.success) {
      const fieldErrors = {};
      parsed.error.errors.forEach((err) => {
        const fieldName = err.path.join('.');
        fieldErrors[fieldName] = err.message;
      });
      return next(new ValidationError('Input validation failed.', fieldErrors));
    }
    // Replace target with parsed/cleaned values (handles defaults/transforms)
    req[target] = parsed.data;
    next();
  };
};

export default validate;
