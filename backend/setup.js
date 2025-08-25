// backend/__tests__/setup.js
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

// Set required environment variables for testing
process.env.RESEND_API_KEY = 'test_key_123';
process.env.RESEND_FROM = 'test@example.com';
process.env.JWT_SECRET = 'test_jwt_secret_for_testing_only';
process.env.HCAPTCHA_SECRET = 'test_hcaptcha_secret';

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

// Optional: Clear all data before each test
beforeEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany({});
  }
});
