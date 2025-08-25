// backend/__tests__/jwt.improvements.test.js
import { signAccessToken } from '../middleware/authMiddleware.js';
import jwt from 'jsonwebtoken';

// Mock user object
const mockUser = {
  _id: '507f1f77bcf86cd799439011',
  isAdmin: false
};

describe('JWT Improvements', () => {
  const originalEnv = process.env;
  
  beforeEach(() => {
    process.env = { ...originalEnv };
    process.env.JWT_SECRET = 'test-secret-key';
  });
  
  afterEach(() => {
    process.env = originalEnv;
  });

  test('signAccessToken creates valid JWT without issuer/audience', () => {
    const token = signAccessToken(mockUser);
    expect(token).toBeDefined();
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    expect(decoded.id).toBe(mockUser._id);
    expect(decoded.isAdmin).toBe(false);
  });

  test('signAccessToken includes issuer when JWT_ISSUER is set', () => {
    process.env.JWT_ISSUER = 'tees-from-the-past';
    
    const token = signAccessToken(mockUser);
    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      issuer: process.env.JWT_ISSUER
    });
    
    expect(decoded.iss).toBe('tees-from-the-past');
  });

  test('signAccessToken includes audience when JWT_AUDIENCE is set', () => {
    process.env.JWT_AUDIENCE = 'tees-app-users';
    
    const token = signAccessToken(mockUser);
    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      audience: process.env.JWT_AUDIENCE
    });
    
    expect(decoded.aud).toBe('tees-app-users');
  });

  test('signAccessToken includes both issuer and audience when both are set', () => {
    process.env.JWT_ISSUER = 'tees-from-the-past';
    process.env.JWT_AUDIENCE = 'tees-app-users';
    
    const token = signAccessToken(mockUser);
    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      issuer: process.env.JWT_ISSUER,
      audience: process.env.JWT_AUDIENCE
    });
    
    expect(decoded.iss).toBe('tees-from-the-past');
    expect(decoded.aud).toBe('tees-app-users');
  });

  test('signAccessToken throws error when user is missing _id', () => {
    expect(() => {
      signAccessToken({});
    }).toThrow('signAccessToken: user missing _id');
  });
});