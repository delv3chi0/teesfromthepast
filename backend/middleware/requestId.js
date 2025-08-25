// backend/middleware/requestId.js
// Generate unique request ID for tracking

import { nanoid } from 'nanoid';
import { REQUEST_ID_HEADER } from '../config/constants.js';

/**
 * Middleware to generate and attach request ID
 */
export function requestId(req, res, next) {
  // Generate short nanoid (10 characters)
  req.id = nanoid(10);
  
  // Set response header
  res.setHeader(REQUEST_ID_HEADER, req.id);
  
  next();
}