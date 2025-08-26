#!/usr/bin/env node
// scripts/printVersion.js
// Script to print version information

import { getVersionInfo } from '../backend/version/index.js';

function printVersion() {
  try {
    const versionInfo = getVersionInfo();
    
    console.log('=== Tees From The Past - Version Information ===');
    console.log();
    console.log(`Version:    ${versionInfo.version}`);
    console.log(`Commit:     ${versionInfo.commit}`);
    console.log(`Build Time: ${versionInfo.buildTime}`);
    console.log(`Node.js:    ${versionInfo.env.node}`);
    console.log(`Mode:       ${versionInfo.env.mode}`);
    console.log();
    
    // Also output as JSON for programmatic use
    if (process.argv.includes('--json')) {
      console.log('JSON Output:');
      console.log(JSON.stringify(versionInfo, null, 2));
    }
  } catch (error) {
    console.error('Error retrieving version information:', error.message);
    process.exit(1);
  }
}

printVersion();