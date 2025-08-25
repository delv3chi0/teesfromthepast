// backend/__tests__/upload.size.test.js
import request from 'supertest';
import app from '../app.js';
import User from '../models/User.js';
import jwt from 'jsonwebtoken';
import { MAX_PRINTFILE_DECODED_MB } from '../config/constants.js';

// Mock Cloudinary to avoid actual uploads during testing
jest.mock('cloudinary', () => ({
  v2: {
    config: jest.fn(),
    uploader: {
      upload: jest.fn().mockResolvedValue({
        secure_url: 'https://res.cloudinary.com/test/test.png',
        public_id: 'test_id'
      })
    },
    url: jest.fn().mockReturnValue('https://res.cloudinary.com/test/test_thumb.png')
  }
}));

describe('Upload Size Limits API - POST /api/upload/printfile', () => {
  let authToken;
  let testUser;

  beforeEach(async () => {
    // Create a test user
    testUser = await User.create({
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123',
      firstName: 'Test',
      lastName: 'User'
    });

    // Generate a JWT token
    authToken = jwt.sign({ id: testUser._id }, process.env.JWT_SECRET || 'test_secret', {
      expiresIn: '1h'
    });
  });

  // Helper to create base64 data of specific size
  const createBase64Data = (targetMB) => {
    // Base64 encoding adds ~33% overhead, so to get targetMB decoded,
    // we need roughly targetMB * 1.33 encoded characters
    const targetBytes = targetMB * 1024 * 1024;
    const base64Length = Math.ceil(targetBytes * 4 / 3);
    
    // Create a base64 string of the target length
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    let result = '';
    for (let i = 0; i < base64Length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  it('should accept uploads within size limit', async () => {
    const smallImageData = createBase64Data(1); // 1MB, well within limit
    
    const res = await request(app)
      .post('/api/upload/printfile')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        imageData: smallImageData,
        productSlug: 'test-product',
        side: 'front',
        designName: 'test-design'
      })
      .expect('Content-Type', /json/)
      .expect(200);

    expect(res.body).toHaveProperty('message', 'Image uploaded successfully!');
    expect(res.body).toHaveProperty('publicUrl');
    expect(res.body).toHaveProperty('thumbUrl');
  });

  it('should accept dataUrl format', async () => {
    const smallImageData = createBase64Data(1);
    const dataUrl = `data:image/png;base64,${smallImageData}`;
    
    const res = await request(app)
      .post('/api/upload/printfile')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        dataUrl: dataUrl,
        productSlug: 'test-product',
        side: 'front',
        designName: 'test-design'
      })
      .expect('Content-Type', /json/)
      .expect(200);

    expect(res.body).toHaveProperty('message', 'Image uploaded successfully!');
  });

  it('should return 413 with structured error for oversized uploads', async () => {
    const largeImageData = createBase64Data(MAX_PRINTFILE_DECODED_MB + 1); // Exceed limit
    
    const res = await request(app)
      .post('/api/upload/printfile')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        imageData: largeImageData,
        productSlug: 'test-product',
        side: 'front',
        designName: 'test-design'
      })
      .expect('Content-Type', /json/)
      .expect(413);

    // Verify structured error response
    expect(res.body).toHaveProperty('ok', false);
    expect(res.body).toHaveProperty('error');
    expect(res.body.error).toHaveProperty('code', 'UPLOAD_TOO_LARGE');
    expect(res.body.error).toHaveProperty('message');
    expect(res.body.error.message).toContain(`max of ${MAX_PRINTFILE_DECODED_MB} MB`);
    
    // Verify details object
    expect(res.body.error).toHaveProperty('details');
    expect(res.body.error.details).toHaveProperty('maxMB', MAX_PRINTFILE_DECODED_MB);
    expect(res.body.error.details).toHaveProperty('estimatedMB');
    expect(res.body.error.details).toHaveProperty('recommendation');
    expect(res.body.error.details.estimatedMB).toBeGreaterThan(MAX_PRINTFILE_DECODED_MB);
  });

  it('should return 400 for missing image data', async () => {
    const res = await request(app)
      .post('/api/upload/printfile')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        productSlug: 'test-product',
        side: 'front',
        designName: 'test-design'
      })
      .expect('Content-Type', /json/)
      .expect(400);

    expect(res.body).toHaveProperty('message', 'No image data provided.');
  });

  it('should return 401 for missing auth token', async () => {
    const smallImageData = createBase64Data(1);
    
    await request(app)
      .post('/api/upload/printfile')
      .send({
        imageData: smallImageData,
        productSlug: 'test-product'
      })
      .expect(401);
  });
});