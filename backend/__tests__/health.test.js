// backend/__tests__/health.test.js
import request from 'supertest';
import app from '../app.js'; // Import the app we separated earlier

describe('GET /health', () => {
  it('should respond with a 200 status and a success message', async () => {
    const response = await request(app)
      .get('/health')
      .expect('Content-Type', /json/)
      .expect(200);

    // Check the response body
    expect(response.body).toEqual({
      status: 'OK',
      message: 'Backend is healthy!'
    });
  });
});
