/**
 * Request ID middleware (ESM) using nanoid.
 * Exports:
 *   - named: requestId
 *   - default: requestId
 *
 * This allows either:
 *   import { requestId } from "./middleware/requestId.js";
 *   import requestId from "./middleware/requestId.js";
 */
import { nanoid } from "nanoid";
import { REQUEST_ID_HEADER } from "../config/constants.js";

export function requestId(req, res, next) {
  const id = nanoid(10); // Compact, collision-resistant enough for request tracing
  req.id = id;
  res.setHeader(REQUEST_ID_HEADER, id);
  next();
}

export default requestId;
