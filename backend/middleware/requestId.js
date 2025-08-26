import { nanoid } from "nanoid";
import { isConfigReady, getConfig } from "../config/index.js";
import { getTracingConfig, pushRecentRequestId } from "../config/dynamicConfig.js";

export function requestId(req, res, next) {
  // Get header name from dynamic config first, then static config/env
  const tracingConfig = getTracingConfig();
  let headerName = tracingConfig.requestIdHeader;
  
  if (!headerName) {
    if (isConfigReady()) {
      const config = getConfig();
      headerName = config.REQUEST_ID_HEADER || 'X-Request-Id';
    } else {
      headerName = process.env.REQUEST_ID_HEADER || 'X-Request-Id';
    }
  }
  
  // Use existing request ID from header if present, otherwise generate new one
  let id = req.headers[headerName.toLowerCase()];
  if (!id) {
    // Generate UUIDv4-like ID or use nanoid for shorter IDs
    id = nanoid(10);
  }
  
  req.id = id;
  res.setHeader(headerName, id);
  
  // Push to recent request IDs for tracing (dynamic config ring buffer)
  pushRecentRequestId(id);
  
  // Add request ID to logger context for this request
  if (req.log) {
    req.log = req.log.child({ requestId: id });
  }
  
  next();
}

export default requestId;
