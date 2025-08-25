// backend/middleware/compression.js
import compression from 'compression';

// Configure compression middleware with Brotli support
export const compressionMiddleware = compression({
  // Only compress responses >= 1024 bytes
  threshold: 1024,
  
  // Enable compression for all content types by default
  filter: (req, res) => {
    // Don't compress if the response is already compressed
    if (res.getHeader('content-encoding')) {
      return false;
    }
    
    // Use the default filter for everything else
    return compression.filter(req, res);
  },
  
  // Compression level (1-9, where 9 is best compression but slowest)
  level: 6,
  
  // Memory level for deflate (1-9)
  memLevel: 8,
  
  // Prefer Brotli if client supports it
  brotli: {
    enabled: true,
    zlib: {}
  }
});

export default compressionMiddleware;