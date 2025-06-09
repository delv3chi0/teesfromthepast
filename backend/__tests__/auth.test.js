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

  // We can add tests for Login, Profile, etc. here in the future

});

