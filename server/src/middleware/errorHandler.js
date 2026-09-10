import logger from '../utils/logger.js';
import { AppError } from '../utils/errors.js';

// Centralized Express Error Handler
const errorHandler = (err, req, res, next) => {
  const reqId = req.id || 'N/A';
  
  if (err instanceof AppError) {
    logger.warn(`Operational Error [ReqId: ${reqId}] - Code: ${err.errorCode} - Status: ${err.statusCode} - Msg: ${err.message}`);
    return res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.errorCode,
        message: err.message,
        details: err.details
      }
    });
  }

  // Handle Mongoose Validation Errors
  if (err.name === 'ValidationError') {
    const details = {};
    if (err.errors) {
      for (const field in err.errors) {
        details[field] = err.errors[field].message;
      }
    }
    const firstMsg = Object.values(details)[0] || err.message || 'Validation failed.';
    logger.warn(`Mongoose Validation Error [ReqId: ${reqId}] - Msg: ${firstMsg}`);
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: firstMsg,
        details
      }
    });
  }

  // Handle MongoDB Duplicate Key Error (E11000)
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || err.keyValue || {})[0] || 'field';
    const message = field === 'email' ? 'This email is already registered.' : `${field} already exists.`;
    logger.warn(`MongoDB Duplicate Key [ReqId: ${reqId}] - Field: ${field}`);
    return res.status(409).json({
      success: false,
      error: {
        code: 'CONFLICT',
        message,
        details: { [field]: message }
      }
    });
  }

  // Programmer errors or unhandled system exceptions
  logger.error(`Unhandled Exception [ReqId: ${reqId}] - Msg: ${err.message}`, err);

  // Return generic error payload to client (never expose details / stack traces)
  return res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred. Please try again later.'
    }
  });
};

export default errorHandler;
