// backend/flags/FeatureFlags.js
// Feature Flag Service with layered sources and hot reload (Task 8)
import fs from 'fs/promises';
import path from 'path';
import { logger } from '../utils/logger.js';
import { getConfig } from '../config/index.js';

class FeatureFlags {
  constructor() {
    this.flags = new Map();
    this.sources = [];
    this.watchers = [];
    this.initialized = false;
    
    // Default flag definitions with metadata
    this.defaults = new Map([
      ['auth.enable_2fa', {
        value: false,
        description: 'Enable two-factor authentication features',
        type: 'boolean',
        category: 'authentication'
      }],
      ['jobs.enable_testing', {
        value: false,
        description: 'Enable job testing endpoints',
        type: 'boolean',
        category: 'development'
      }],
      ['ui.show_beta_features', {
        value: false,
        description: 'Show beta features in the UI',
        type: 'boolean',
        category: 'ui'
      }],
      ['api.rate_limit_strict', {
        value: false,
        description: 'Use strict rate limiting on API endpoints',
        type: 'boolean',
        category: 'security'
      }],
      ['payment.enable_test_mode', {
        value: true,
        description: 'Enable test mode for payments',
        type: 'boolean',
        category: 'payment'
      }],
      ['uploads.max_file_size_mb', {
        value: 10,
        description: 'Maximum file size for uploads in MB',
        type: 'number',
        category: 'uploads'
      }],
      ['cache.ttl_seconds', {
        value: 300,
        description: 'Default cache TTL in seconds',
        type: 'number',
        category: 'performance'
      }],
      ['maintenance.mode_enabled', {
        value: false,
        description: 'Enable maintenance mode',
        type: 'boolean',
        category: 'system'
      }]
    ]);
  }

  /**
   * Initialize feature flags with layered sources
   */
  async initialize() {
    if (this.initialized) {
      logger.warn('Feature flags already initialized');
      return;
    }

    try {
      logger.info('Initializing feature flags...');

      // Layer 1: In-memory defaults
      this.loadDefaults();

      // Layer 2: JSON file (if configured)
      await this.loadFromFile();

      // Layer 3: Environment overrides
      this.loadFromEnvironment();

      // Set up file watching for hot reload
      await this.setupFileWatcher();

      this.initialized = true;
      logger.info('Feature flags initialized successfully', {
        totalFlags: this.flags.size,
        sources: this.sources.length
      });

    } catch (error) {
      logger.error('Failed to initialize feature flags', { error: error.message });
      // Continue with defaults only
      this.initialized = true;
    }
  }

  /**
   * Load default flag values
   */
  loadDefaults() {
    for (const [key, config] of this.defaults.entries()) {
      this.flags.set(key, {
        ...config,
        source: 'default'
      });
    }
    
    this.sources.push('default');
    logger.debug('Loaded default feature flags', { count: this.defaults.size });
  }

  /**
   * Load flags from JSON file
   */
  async loadFromFile() {
    try {
      const config = getConfig();
      const filePath = config.FEATURE_FLAG_FILE || process.env.FEATURE_FLAG_FILE;
      
      if (!filePath) {
        logger.debug('No feature flag file configured');
        return;
      }

      const resolvedPath = path.resolve(filePath);
      
      try {
        const content = await fs.readFile(resolvedPath, 'utf-8');
        const fileFlags = JSON.parse(content);
        
        let loadedCount = 0;
        for (const [key, value] of Object.entries(fileFlags)) {
          if (this.isValidFlagValue(key, value)) {
            this.flags.set(key, {
              value,
              source: 'file',
              description: this.defaults.get(key)?.description || 'Loaded from file',
              type: typeof value,
              category: this.defaults.get(key)?.category || 'custom'
            });
            loadedCount++;
          } else {
            logger.warn('Invalid flag value in file', { key, value });
          }
        }
        
        this.sources.push('file');
        logger.info('Loaded feature flags from file', { 
          filePath: resolvedPath, 
          count: loadedCount 
        });
        
      } catch (error) {
        if (error.code === 'ENOENT') {
          logger.info('Feature flag file not found, will use defaults', { filePath: resolvedPath });
        } else {
          logger.error('Error reading feature flag file', { 
            error: error.message, 
            filePath: resolvedPath 
          });
        }
      }
      
    } catch (error) {
      logger.error('Error loading flags from file', { error: error.message });
    }
  }

  /**
   * Load flags from environment variables (FLAG_*)
   */
  loadFromEnvironment() {
    let loadedCount = 0;
    
    for (const [envKey, envValue] of Object.entries(process.env)) {
      if (envKey.startsWith('FLAG_')) {
        const flagKey = envKey.substring(5).toLowerCase().replace(/_/g, '.');
        const parsedValue = this.parseEnvironmentValue(envValue);
        
        if (parsedValue !== null) {
          this.flags.set(flagKey, {
            value: parsedValue,
            source: 'environment',
            description: this.defaults.get(flagKey)?.description || 'Set via environment variable',
            type: typeof parsedValue,
            category: this.defaults.get(flagKey)?.category || 'custom'
          });
          loadedCount++;
        }
      }
    }
    
    if (loadedCount > 0) {
      this.sources.push('environment');
      logger.info('Loaded feature flags from environment', { count: loadedCount });
    }
  }

  /**
   * Parse environment variable value to appropriate type
   */
  parseEnvironmentValue(value) {
    if (value === 'true') return true;
    if (value === 'false') return false;
    if (/^\d+$/.test(value)) return parseInt(value);
    if (/^\d+\.\d+$/.test(value)) return parseFloat(value);
    return value;
  }

  /**
   * Validate flag value against defaults
   */
  isValidFlagValue(key, value) {
    const defaultConfig = this.defaults.get(key);
    if (!defaultConfig) return true; // Allow custom flags
    
    const expectedType = defaultConfig.type;
    const actualType = typeof value;
    
    return actualType === expectedType;
  }

  /**
   * Set up file watcher for hot reload
   */
  async setupFileWatcher() {
    try {
      const config = getConfig();
      const filePath = config.FEATURE_FLAG_FILE || process.env.FEATURE_FLAG_FILE;
      
      if (!filePath) return;

      const resolvedPath = path.resolve(filePath);
      
      // Note: Using fs.watch in production requires careful consideration
      // TODO: Task 8 - Implement more robust file watching for production
      if (process.env.NODE_ENV === 'development') {
        const { watch } = await import('fs');
        
        const watcher = watch(resolvedPath, async (eventType) => {
          if (eventType === 'change') {
            logger.info('Feature flag file changed, reloading...');
            await this.reloadFromFile();
          }
        });
        
        this.watchers.push(watcher);
        logger.debug('File watcher set up for feature flags', { filePath: resolvedPath });
      }
      
    } catch (error) {
      logger.warn('Could not set up file watcher for feature flags', { error: error.message });
    }
  }

  /**
   * Reload flags from file (hot reload)
   */
  async reloadFromFile() {
    try {
      // Clear file-sourced flags
      for (const [key, config] of this.flags.entries()) {
        if (config.source === 'file') {
          this.flags.delete(key);
        }
      }
      
      // Reload from file
      await this.loadFromFile();
      
      logger.info('Feature flags reloaded from file');
      
    } catch (error) {
      logger.error('Error reloading feature flags from file', { error: error.message });
    }
  }

  /**
   * Get a feature flag value
   */
  get(key, defaultValue = null) {
    const flag = this.flags.get(key);
    return flag ? flag.value : defaultValue;
  }

  /**
   * Check if a boolean feature flag is enabled
   */
  isEnabled(key) {
    return this.get(key, false) === true;
  }

  /**
   * Get all feature flags
   */
  getAll() {
    const result = {};
    for (const [key, config] of this.flags.entries()) {
      result[key] = {
        value: config.value,
        source: config.source,
        type: config.type,
        category: config.category,
        description: config.description
      };
    }
    return result;
  }

  /**
   * Get feature flags by category
   */
  getByCategory(category) {
    const result = {};
    for (const [key, config] of this.flags.entries()) {
      if (config.category === category) {
        result[key] = {
          value: config.value,
          source: config.source,
          type: config.type,
          description: config.description
        };
      }
    }
    return result;
  }

  /**
   * Set a feature flag value (runtime only, not persisted)
   */
  set(key, value, source = 'runtime') {
    this.flags.set(key, {
      value,
      source,
      type: typeof value,
      category: this.defaults.get(key)?.category || 'runtime',
      description: this.defaults.get(key)?.description || 'Set at runtime'
    });
    
    logger.debug('Feature flag set at runtime', { key, value, source });
  }

  /**
   * Clean up watchers
   */
  cleanup() {
    for (const watcher of this.watchers) {
      try {
        watcher.close();
      } catch (error) {
        logger.error('Error closing file watcher', { error: error.message });
      }
    }
    this.watchers = [];
    logger.debug('Feature flag watchers cleaned up');
  }
}

// Singleton instance
const featureFlags = new FeatureFlags();

// Convenience exports
export const getFlag = (key, defaultValue) => featureFlags.get(key, defaultValue);
export const isEnabled = (key) => featureFlags.isEnabled(key);
export const getAllFlags = () => featureFlags.getAll();
export const getFlagsByCategory = (category) => featureFlags.getByCategory(category);
export const setFlag = (key, value, source) => featureFlags.set(key, value, source);

export default featureFlags;

// TODO: Task 8 - Advanced feature flag features to implement later:
// TODO: - User/session-specific flag overrides
// TODO: - A/B testing integration with user segmentation  
// TODO: - Flag rollout strategies (percentage-based, user-based)
// TODO: - Flag dependency resolution (flags that depend on other flags)
// TODO: - Flag usage analytics and reporting
// TODO: - Web UI for flag management and monitoring
// TODO: - Flag validation and type checking schemas
// TODO: - Integration with external flag services (LaunchDarkly, etc.)