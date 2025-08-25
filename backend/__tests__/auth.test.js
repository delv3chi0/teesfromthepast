// backend/__tests__/auth.test.js
import request from 'supertest';
import app from '../app.js';
import User from '../models/User.js';

describe('Auth API - /api/auth', () => {

  // ---- Test the Registration Endpoint ----
  describe('POST /register', () => {
    
    it('should register a new user successfully with valid data', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'testuser',
          email: 'test@example.com',
          password: 'password123',
          firstName: 'Test',
          lastName: 'User'
        })
        .expect('Content-Type', /json/)
        .expect(201); // Expect a 201 "Created" status

      // Check that the response body has the correct properties
      expect(res.body).toHaveProperty('token');
      expect(res.body.email).toBe('test@example.com');

      // Check that the user was actually created in the test database
      const userInDb = await User.findById(res.body._id);
      expect(userInDb).not.toBeNull();
      expect(userInDb.email).toBe('test@example.com');
    });

    it('should fail to register a user with an email that is already taken', async () => {
      // First, create a user directly in the database
      await User.create({
        username: 'existinguser',
        email: 'exists@example.com',
        password: 'password123'
      });

      // Now, try to register a new user with the SAME email
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'newuser',
          email: 'exists@example.com',
          password: 'password456'
        })
        .expect('Content-Type', /json/)
        .expect(400); // Expect a 400 "Bad Request" status

      // Check for the specific error message from our controller
      expect(res.body.message).toBe('User with this email already exists');
    });

    it('should fail to register if password is less than 6 characters', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'shortpass',
          email: 'short@example.com',
          password: '123' // Invalid password
        })
        .expect('Content-Type', /json/)
        .expect(400);

      // Check that the `express-validator` errors array is sent back
      expect(res.body).toHaveProperty('errors');
      // Check that the specific error message is present in the array
      expect(res.body.errors[0].msg).toBe('Password must be 6 or more characters');
    });

    it('should fail to register if email is invalid', async () => {
        const res = await request(app)
          .post('/api/auth/register')
          .send({
            username: 'bademail',
            email: 'not-an-email', // Invalid email
            password: 'password123'
          })
          .expect('Content-Type', /json/)
          .expect(400);
  
        expect(res.body).toHaveProperty('errors');
        expect(res.body.errors[0].msg).toBe('Please include a valid email');
      });

  });

  // ---- Test hCaptcha Error Handling ----
  describe('hCaptcha Error Response Format', () => {
    
    beforeEach(async () => {
      // Create a test user for login attempts
      await User.create({
        username: 'captchatest',
        email: 'captcha@example.com',
        password: 'password123',
        firstName: 'Captcha',
        lastName: 'Test'
      });
    });

    it('should return captchaFailed flag when captcha verification fails', async () => {
      // Set environment to enable captcha (disable bypass)
      const originalDisableCaptcha = process.env.DISABLE_CAPTCHA;
      delete process.env.DISABLE_CAPTCHA;

      try {
        // First, trigger multiple failed login attempts to require captcha
        for (let i = 0; i < 3; i++) {
          await request(app)
            .post('/api/auth/login')
            .send({
              email: 'captcha@example.com',
              password: 'wrongpassword'
            });
        }

        // Now attempt login with invalid captcha token
        const res = await request(app)
          .post('/api/auth/login')
          .send({
            email: 'captcha@example.com',
            password: 'password123',
            hcaptchaToken: 'invalid_token'
          })
          .expect('Content-Type', /json/)
          .expect(428);

        // Check that the response includes the captchaFailed flag
        expect(res.body).toHaveProperty('needCaptcha', true);
        expect(res.body).toHaveProperty('captchaFailed', true);
        expect(res.body).toHaveProperty('reason');
        expect(res.body.message).toBe('Captcha required');
      } finally {
        // Restore original environment
        if (originalDisableCaptcha) {
          process.env.DISABLE_CAPTCHA = originalDisableCaptcha;
        }
      }
    });

    it('should not include captchaFailed flag for credential errors when captcha disabled', async () => {
      // Enable captcha bypass
      process.env.DISABLE_CAPTCHA = '1';

      try {
        // Attempt login with wrong credentials
        const res = await request(app)
          .post('/api/auth/login')
          .send({
            email: 'captcha@example.com',
            password: 'wrongpassword'
          })
          .expect('Content-Type', /json/)
          .expect(401);

        // Should not have captcha-related properties
        expect(res.body).not.toHaveProperty('captchaFailed');
        expect(res.body).not.toHaveProperty('needCaptcha');
      } finally {
        delete process.env.DISABLE_CAPTCHA;
      }
    });

  });

});

