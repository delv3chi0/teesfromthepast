// backend/__tests__/checkout.alias.test.js
import request from 'supertest';
import app from '../app.js';
import User from '../models/User.js';
import jwt from 'jsonwebtoken';

describe('Checkout Alias API - POST /api/checkout', () => {
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

  it('should return 400 for missing body (same as legacy route)', async () => {
    const res = await request(app)
      .post('/api/checkout')
      .set('Authorization', `Bearer ${authToken}`)
      .send({}) // Empty body
      .expect('Content-Type', /json/)
      .expect(400);

    expect(res.body).toHaveProperty('error');
    expect(res.body.error).toBe('No items provided for payment.');
  });

  it('should return 400 for missing shipping address', async () => {
    const res = await request(app)
      .post('/api/checkout')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        items: [{ productId: 'test', variantSku: 'test', designId: 'test', quantity: 1 }]
      })
      .expect('Content-Type', /json/)
      .expect(400);

    expect(res.body).toHaveProperty('error');
    expect(res.body.error).toBe('Shipping address is required.');
  });

  it('should return 401 for missing auth token', async () => {
    await request(app)
      .post('/api/checkout')
      .send({
        items: [{ productId: 'test', variantSku: 'test', designId: 'test', quantity: 1 }],
        shippingAddress: { country: 'US', city: 'Test' }
      })
      .expect(401);
  });

  it('should be reachable and respond with same validation as legacy route', async () => {
    const testPayload = {
      items: [{ 
        productId: '507f1f77bcf86cd799439011', // Valid ObjectId format
        variantSku: 'test-sku', 
        designId: '507f1f77bcf86cd799439012', // Valid ObjectId format
        quantity: 1 
      }],
      currency: 'usd',
      shippingAddress: {
        recipientName: 'Test User',
        street1: '123 Test St',
        city: 'Test City',
        state: 'TS',
        zipCode: '12345',
        country: 'US'
      }
    };

    // Test both routes return the same type of response (likely 404 due to missing products)
    const legacyRes = await request(app)
      .post('/api/checkout/create-payment-intent')
      .set('Authorization', `Bearer ${authToken}`)
      .send(testPayload);

    const aliasRes = await request(app)
      .post('/api/checkout')
      .set('Authorization', `Bearer ${authToken}`)
      .send(testPayload);

    // Both should return the same status and error structure
    expect(aliasRes.status).toBe(legacyRes.status);
    if (legacyRes.body.error) {
      expect(aliasRes.body).toHaveProperty('error');
    }
  });
});