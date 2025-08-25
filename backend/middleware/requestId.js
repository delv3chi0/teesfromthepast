/**
 * Request ID middleware (ESM version using nanoid).
 * Generates a short, collision-resistant ID per request.
 *
 * Usage (in app.js before other middlewares that log):
 *   import requestId from './middleware/requestId.js';
 *   app.use(requestId);
 */
import { nanoid } from 'nanoid';
import { REQUEST_ID_HEADER } from '../config/constants.js';

export default function requestId(req, res, next) {
  const id = nanoid(10); // 10-char ID keeps logs compact
  req.id = id;
  res.setHeader(REQUEST_ID_HEADER, id);
  next();
}
