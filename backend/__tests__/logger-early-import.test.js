// Ensures importing logger BEFORE validateConfig does not crash and uses fallback LOG_LEVEL.
import { spawnSync } from 'node:child_process';
import { writeFileSync, unlinkSync } from 'node:fs';

test('early logger import is safe', () => {
  const file = 'temp-early.mjs';
  writeFileSync(file, `
    import { logger } from './backend/utils/logger.js';
    logger.info({ msg: 'early import works' });
    import { validateConfig } from './backend/config/index.js';
    validateConfig();
    logger.info({ msg: 'post validation works' });
  `);
  const res = spawnSync(process.execPath, [file], {
    env: {
      ...process.env,
      // Minimal set of variables required to pass schema
      NODE_ENV: 'test',
      MONGO_URI: 'https://example.com', // placeholder valid URL
      JWT_SECRET: 'x'.repeat(32),
      STRIPE_SECRET_KEY: 'sk_test_placeholder',
      STRIPE_WEBHOOK_SECRET: 'whsec_placeholder',
      CLOUDINARY_CLOUD_NAME: 'demo',
      CLOUDINARY_API_KEY: 'key',
      CLOUDINARY_API_SECRET: 'secret'
    },
    encoding: 'utf-8'
  });
  unlinkSync(file);
  expect(res.status).toBe(0);
  expect(res.stderr).toBe('');
  expect(res.stdout).toMatch(/early import works/);
  expect(res.stdout).toMatch(/post validation works/);
});
