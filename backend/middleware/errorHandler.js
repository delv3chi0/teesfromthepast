// backend/middleware/errorHandler.js
import logger from "../utils/logger.js";

export const errorHandler = (err, req, res, next) => {
  const rid = req.headers["x-request-id"] || "unknown";
  
  let status = err.status || err.statusCode || 500;
  let message = err.message || "Internal Server Error";
  let code = err.code;

  // Handle specific error types
  if (err.name === "ValidationError") {
    status = 400;
    message = "Validation Error";
    code = "VALIDATION_ERROR";
  } else if (err.name === "CastError") {
    status = 400;
    message = "Invalid ID format";
    code = "INVALID_ID";
  } else if (err.code === 11000) {
    status = 409;
    message = "Duplicate key error";
    code = "DUPLICATE_KEY";
  }

  // Add NOT_FOUND code for 404s
  if (status === 404 && !code) {
    code = "NOT_FOUND";
  }

  // Log the error
  logger.error(`Error ${status} - ${message}`, {
    status,
    message,
    code,
    rid,
    stack: err.stack,
    url: req.url,
    method: req.method,
  });

  // Build response object
  const errorResponse = {
    error: {
      message,
      status,
      rid,
    },
  };

  // Add code field if present
  if (code) {
    errorResponse.error.code = code;
  }

  res.status(status).json(errorResponse);
};

export default errorHandler;