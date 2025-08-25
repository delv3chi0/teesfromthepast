# Configuration Initialization Order

This document explains the required initialization order and patterns for the Tees From The Past application to prevent configuration-related startup crashes.

## Overview

The application uses a strict configuration validation system that must be initialized before any modules that depend on configuration values. This ensures fail-fast behavior on misconfiguration and prevents runtime errors.

## Required Initialization Order

The correct startup sequence is:

1. **Load environment variables** (`dotenv/config`)
2. **Validate configuration** (`validateConfig()`)
3. **Initialize error monitoring** (`initializeErrorMonitoring()`)
4. **Use logger and other modules** (now safe to access config)
5. **Connect to database**
6. **Start Express server**

## Configuration API

### `validateConfig()`
- Must be called once during application startup
- Validates all environment variables against the schema
- Exits process with error code 1 if validation fails
- Returns the validated configuration object
- Safe to call multiple times (no-op after first successful call)

### `getConfig()`
- Returns the validated configuration object
- **Throws an error** if called before `validateConfig()`
- This strict behavior is intentional to enforce proper initialization order

### `isConfigReady()`
- Returns `true` if configuration has been validated
- Returns `false` if `validateConfig()` has not been called yet
- Use this for conditional configuration access in modules that may be imported early

## Logger Module

The logger module has been designed with lazy initialization to be safe for early imports:

```javascript
import { logger } from './utils/logger.js';
// This is safe even before validateConfig() is called
```

The logger will:
- Use `process.env.LOG_LEVEL` or default to 'info' if config is not ready
- Automatically upgrade to use validated config values after `validateConfig()` is called
- Fallback gracefully if configuration is not available

## Guidelines for New Modules

When creating new modules that need configuration:

1. **For modules that must access config**: Import and call `getConfig()` within functions, not at module top-level
2. **For modules that may be imported early**: Use `isConfigReady()` to check if config is available, fallback to environment variables if needed
3. **Never call `getConfig()` at module top-level** - this will crash if the module is imported before `validateConfig()`

### Good Pattern
```javascript
import { isConfigReady, getConfig } from '../config/index.js';

function someFunction() {
  if (isConfigReady()) {
    const config = getConfig();
    return config.SOME_VALUE;
  } else {
    return process.env.SOME_VALUE || 'default';
  }
}
```

### Bad Pattern
```javascript
import { getConfig } from '../config/index.js';
const config = getConfig(); // This will crash if imported before validateConfig()
```

## Entry Points

- **Root `index.js`**: Simple delegator to `backend/index.js`
- **Backend `index.js`**: Main server entry point with proper initialization order
- Both follow the required sequence to prevent early configuration access

## Testing

The application includes a regression test (`__tests__/logger-early-import.test.js`) that ensures importing the logger before `validateConfig()` does not crash the application. This test should continue to pass to guarantee safe early imports.

## Error Scenarios

If you see the error "Configuration not initialized. Call validateConfig() first", it means:

1. A module is calling `getConfig()` before `validateConfig()` has been called
2. Check the import order in your entry point
3. Ensure `validateConfig()` is called early in the startup sequence
4. Consider using `isConfigReady()` for conditional configuration access