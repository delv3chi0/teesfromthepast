import { nanoid } from "nanoid";
import { isConfigReady, getConfig } from "../config/index.js";
import { getTracingConfig, pushRequestId } from "../config/dynamicConfig.js";

export function requestId(req, res, next) {
  // Get header name from dynamic config first, then static config
  let headerName;
  try {
    const tracingConfig = getTracingConfig();
    headerName = tracingConfig.requestIdHeader;
  } catch {
    // Fallback to static configuration
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
  
  // Push request ID into tracing ring buffer
  try {
    pushRequestId(id);
  } catch (error) {
    // Don't fail request if tracing push fails
    console.warn('[requestId] Failed to push to tracing buffer:', error.message);
  }
  
  // Add request ID to logger context for this request
  if (req.log) {
    req.log = req.log.child({ requestId: id });
  }
  
  next();
}

export default requestId;
