#!/usr/bin/env node
// backend/bin/check-indexes.js
// Database index audit and optimization recommendations

import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import { getConfig } from '../config/index.js';
import { logger } from '../utils/logger.js';

// Import all models to analyze their schemas
import User from '../models/User.js';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import Design from '../models/Design.js';
import RefreshToken from '../models/RefreshToken.js';
import WebhookEvent from '../models/WebhookEvent.js';

// Colors for terminal output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m'
};

class IndexAuditor {
  constructor() {
    this.config = getConfig();
    this.models = {
      User,
      Order,
      Product,
      Design,
      RefreshToken,
      WebhookEvent
    };
    this.issues = [];
    this.recommendations = [];
  }

  async connectDatabase() {
    try {
      await mongoose.connect(this.config.MONGO_URI);
      logger.info('Database connected for index audit');
    } catch (error) {
      logger.error('Database connection failed', { error: error.message });
      throw error;
    }
  }

  async getCollectionIndexes(collectionName) {
    try {
      const collection = mongoose.connection.db.collection(collectionName);
      const indexes = await collection.indexes();
      return indexes;
    } catch (error) {
      logger.error(`Failed to get indexes for ${collectionName}`, { error: error.message });
      return [];
    }
  }

  async getCollectionStats(collectionName) {
    try {
      const collection = mongoose.connection.db.collection(collectionName);
      const stats = await collection.stats();
      return {
        count: stats.count || 0,
        size: stats.size || 0,
        avgObjSize: stats.avgObjSize || 0,
        totalIndexSize: stats.totalIndexSize || 0,
        indexSizes: stats.indexSizes || {}
      };
    } catch (error) {
      logger.warn(`Failed to get stats for ${collectionName}`, { error: error.message });
      return { count: 0, size: 0, avgObjSize: 0, totalIndexSize: 0, indexSizes: {} };
    }
  }

  getSchemaIndexes(schema) {
    const indexes = [];
    
    // Get single field indexes
    schema.eachPath((path, schemaType) => {
      if (schemaType._index || schemaType.options.index) {
        indexes.push({
          key: { [path]: 1 },
          name: `${path}_1`,
          type: 'single',
          declared: true
        });
      }
      
      if (schemaType.options.unique) {
        indexes.push({
          key: { [path]: 1 },
          name: `${path}_1`,
          type: 'unique',
          declared: true
        });
      }
    });
    
    // Get compound indexes
    if (schema._indexes) {
      for (const index of schema._indexes) {
        indexes.push({
          key: index[0],
          options: index[1] || {},
          name: this.generateIndexName(index[0]),
          type: 'compound',
          declared: true
        });
      }
    }
    
    return indexes;
  }

  generateIndexName(key) {
    return Object.entries(key)
      .map(([field, direction]) => `${field}_${direction}`)
      .join('_');
  }

  analyzeQueryPatterns() {
    // Define common query patterns for each model
    const patterns = {
      User: [
        { fields: ['email'], frequency: 'high', description: 'Login and authentication' },
        { fields: ['username'], frequency: 'medium', description: 'User lookup' },
        { fields: ['emailVerifiedAt'], frequency: 'low', description: 'Verified users query' },
        { fields: ['isAdmin'], frequency: 'low', description: 'Admin users query' }
      ],
      Order: [
        { fields: ['user'], frequency: 'high', description: 'User orders lookup' },
        { fields: ['paymentIntentId'], frequency: 'high', description: 'Payment reconciliation' },
        { fields: ['paymentStatus'], frequency: 'medium', description: 'Payment status filtering' },
        { fields: ['orderStatus'], frequency: 'medium', description: 'Order status filtering' },
        { fields: ['createdAt'], frequency: 'high', description: 'Recent orders and pagination' },
        { fields: ['user', 'createdAt'], frequency: 'high', description: 'User order history with sorting' }
      ],
      Product: [
        { fields: ['slug'], frequency: 'high', description: 'Product page lookup' },
        { fields: ['category'], frequency: 'medium', description: 'Category filtering' },
        { fields: ['tags'], frequency: 'medium', description: 'Tag-based search' },
        { fields: ['isActive'], frequency: 'high', description: 'Active products filtering' },
        { fields: ['createdAt'], frequency: 'medium', description: 'Recently added products' },
        { fields: ['variants.sku'], frequency: 'high', description: 'SKU-based inventory lookup' }
      ],
      Design: [
        { fields: ['user'], frequency: 'high', description: 'User designs lookup' },
        { fields: ['isPublic'], frequency: 'medium', description: 'Public designs filtering' },
        { fields: ['createdAt'], frequency: 'high', description: 'Recent designs and pagination' },
        { fields: ['user', 'createdAt'], frequency: 'high', description: 'User design history with sorting' }
      ],
      RefreshToken: [
        { fields: ['jti'], frequency: 'high', description: 'Session validation' },
        { fields: ['user'], frequency: 'high', description: 'User sessions lookup' },
        { fields: ['revokedAt'], frequency: 'high', description: 'Active tokens filtering' },
        { fields: ['expiresAt'], frequency: 'high', description: 'Token expiration checks' },
        { fields: ['user', 'revokedAt'], frequency: 'high', description: 'Active user sessions' },
        { fields: ['user', 'createdAt'], frequency: 'medium', description: 'Recent user sessions' }
      ],
      WebhookEvent: [
        { fields: ['type'], frequency: 'medium', description: 'Webhook type filtering' },
        { fields: ['status'], frequency: 'medium', description: 'Processing status filtering' },
        { fields: ['createdAt'], frequency: 'medium', description: 'Recent webhooks' }
      ]
    };

    return patterns;
  }

  compareIndexes(declaredIndexes, actualIndexes) {
    const issues = [];
    const missing = [];
    const unused = [];

    // Find missing indexes
    for (const declared of declaredIndexes) {
      const found = actualIndexes.find(actual => 
        this.indexKeysMatch(declared.key, actual.key)
      );
      
      if (!found) {
        missing.push(declared);
      }
    }

    // Find potentially unused indexes (excluding _id)
    for (const actual of actualIndexes) {
      if (actual.name === '_id_') continue;
      
      const declared = declaredIndexes.find(decl => 
        this.indexKeysMatch(decl.key, actual.key)
      );
      
      if (!declared) {
        unused.push(actual);
      }
    }

    return { missing, unused };
  }

  indexKeysMatch(key1, key2) {
    const keys1 = Object.keys(key1).sort();
    const keys2 = Object.keys(key2).sort();
    
    if (keys1.length !== keys2.length) return false;
    
    for (let i = 0; i < keys1.length; i++) {
      if (keys1[i] !== keys2[i] || key1[keys1[i]] !== key2[keys2[i]]) {
        return false;
      }
    }
    
    return true;
  }

  generateRecommendations(modelName, queryPatterns, existingIndexes) {
    const recommendations = [];
    
    for (const pattern of queryPatterns) {
      const hasIndex = existingIndexes.some(index => {
        if (pattern.fields.length === 1) {
          return index.key[pattern.fields[0]] !== undefined;
        } else {
          // For compound indexes, check if all fields are covered
          return pattern.fields.every(field => index.key[field] !== undefined);
        }
      });
      
      if (!hasIndex) {
        const indexKey = {};
        pattern.fields.forEach(field => {
          // Use -1 for createdAt (descending) for recency queries
          indexKey[field] = field === 'createdAt' ? -1 : 1;
        });
        
        recommendations.push({
          collection: modelName.toLowerCase() + 's',
          index: indexKey,
          reason: pattern.description,
          frequency: pattern.frequency,
          impact: this.calculateImpact(pattern.frequency, pattern.fields.length)
        });
      }
    }
    
    return recommendations;
  }

  calculateImpact(frequency, fieldCount) {
    const frequencyScore = { high: 3, medium: 2, low: 1 }[frequency] || 1;
    const complexityScore = fieldCount;
    return frequencyScore * complexityScore;
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  async auditCollection(modelName, model) {
    console.log(`${colors.blue}📊 Auditing ${modelName}${colors.reset}`);
    
    const collectionName = model.collection.name;
    const schema = model.schema;
    
    // Get current state
    const [actualIndexes, stats] = await Promise.all([
      this.getCollectionIndexes(collectionName),
      this.getCollectionStats(collectionName)
    ]);
    
    // Get declared indexes
    const declaredIndexes = this.getSchemaIndexes(schema);
    
    // Compare indexes
    const { missing, unused } = this.compareIndexes(declaredIndexes, actualIndexes);
    
    // Analyze query patterns
    const queryPatterns = this.analyzeQueryPatterns()[modelName] || [];
    const recommendations = this.generateRecommendations(modelName, queryPatterns, actualIndexes);
    
    // Report findings
    console.log(`  Collection: ${collectionName}`);
    console.log(`  Documents: ${colors.yellow}${stats.count.toLocaleString()}${colors.reset}`);
    console.log(`  Size: ${colors.yellow}${this.formatBytes(stats.size)}${colors.reset}`);
    console.log(`  Avg Doc Size: ${colors.yellow}${this.formatBytes(stats.avgObjSize)}${colors.reset}`);
    console.log(`  Index Size: ${colors.yellow}${this.formatBytes(stats.totalIndexSize)}${colors.reset}`);
    console.log(`  Indexes: ${colors.yellow}${actualIndexes.length}${colors.reset}`);
    
    if (missing.length > 0) {
      console.log(`  ${colors.red}Missing Indexes: ${missing.length}${colors.reset}`);
      this.issues.push(...missing.map(idx => ({ collection: collectionName, type: 'missing', index: idx })));
    }
    
    if (unused.length > 0) {
      console.log(`  ${colors.yellow}Potentially Unused: ${unused.length}${colors.reset}`);
      this.issues.push(...unused.map(idx => ({ collection: collectionName, type: 'unused', index: idx })));
    }
    
    if (recommendations.length > 0) {
      console.log(`  ${colors.cyan}Recommendations: ${recommendations.length}${colors.reset}`);
      this.recommendations.push(...recommendations);
    }
    
    console.log('');
  }

  async audit() {
    console.log(`${colors.blue}🔍 Starting database index audit...${colors.reset}\n`);

    for (const [modelName, model] of Object.entries(this.models)) {
      try {
        await this.auditCollection(modelName, model);
      } catch (error) {
        console.log(`${colors.red}❌ Failed to audit ${modelName}: ${error.message}${colors.reset}\n`);
      }
    }
  }

  printSummary() {
    console.log(`${colors.blue}📋 AUDIT SUMMARY${colors.reset}`);
    console.log(`${'='.repeat(50)}`);
    
    const missingCount = this.issues.filter(i => i.type === 'missing').length;
    const unusedCount = this.issues.filter(i => i.type === 'unused').length;
    
    console.log(`Missing indexes: ${colors.red}${missingCount}${colors.reset}`);
    console.log(`Potentially unused indexes: ${colors.yellow}${unusedCount}${colors.reset}`);
    console.log(`Performance recommendations: ${colors.cyan}${this.recommendations.length}${colors.reset}\n`);
  }

  printRecommendations() {
    if (this.recommendations.length === 0) {
      console.log(`${colors.green}✅ No additional indexes recommended${colors.reset}\n`);
      return;
    }

    console.log(`${colors.cyan}💡 INDEX RECOMMENDATIONS${colors.reset}`);
    console.log(`${'='.repeat(50)}\n`);

    // Sort by impact (high to low)
    const sorted = this.recommendations.sort((a, b) => b.impact - a.impact);

    for (const rec of sorted) {
      const priority = rec.impact >= 6 ? '🔴 HIGH' : rec.impact >= 4 ? '🟡 MEDIUM' : '🟢 LOW';
      console.log(`${priority} - ${rec.collection}`);
      console.log(`  Index: ${JSON.stringify(rec.index)}`);
      console.log(`  Reason: ${rec.reason}`);
      console.log(`  Frequency: ${rec.frequency}`);
      console.log(`  MongoDB Command: db.${rec.collection}.createIndex(${JSON.stringify(rec.index)})`);
      console.log('');
    }
  }

  async generateScript(outputFile = null) {
    if (this.recommendations.length === 0) {
      return null;
    }

    const commands = this.recommendations.map(rec => {
      return `db.${rec.collection}.createIndex(${JSON.stringify(rec.index)});`;
    });

    const script = [
      '// Generated index creation script',
      '// Run this in MongoDB shell or via mongosh',
      '',
      `use ${mongoose.connection.db.databaseName};`,
      '',
      ...commands,
      '',
      '// Verify indexes were created:',
      ...Object.keys(this.models).map(name => 
        `db.${name.toLowerCase()}s.getIndexes();`
      )
    ].join('\n');

    if (outputFile) {
      const fs = await import('fs');
      fs.writeFileSync(outputFile, script);
      console.log(`${colors.green}📄 Index script saved to: ${outputFile}${colors.reset}`);
    }

    return script;
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const outputFile = args[0];

  try {
    const auditor = new IndexAuditor();
    await auditor.connectDatabase();
    await auditor.audit();
    
    auditor.printSummary();
    auditor.printRecommendations();
    
    if (outputFile) {
      await auditor.generateScript(outputFile);
    }

    await mongoose.disconnect();
    
    // Exit with non-zero code if issues found
    const hasIssues = auditor.issues.length > 0 || auditor.recommendations.length > 0;
    process.exit(hasIssues ? 1 : 0);
    
  } catch (error) {
    logger.error('Index audit failed', { error: error.message });
    console.error(`${colors.red}❌ Index audit failed: ${error.message}${colors.reset}`);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { IndexAuditor };
export default main;