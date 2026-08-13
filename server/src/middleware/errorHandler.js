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
