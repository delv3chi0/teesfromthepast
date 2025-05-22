const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

const router = express.Router();

// CORS Preflight handler for /login
router.options('/login', (req, res) => {
  res.set({
    'Access-Control-Allow-Origin': 'https://teesfromthepast.vercel.app',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Credentials': 'true'
  });
  res.sendStatus(200);
});

// SIGNUP
router.post('/signup', async (req, res) => {
  try {
    const { email, password, firstName, lastName } = req.body;
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ error: 'Email already registered' });
    const hash = await bcrypt.hash(password, 10);
    const user = new User({ email, password: hash, firstName, lastName });
    await user.save();
    const token = jwt.sign(
      { userId: user._id, firstName: user.firstName, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '2h' }
    );
    console.log('✅ POST /signup issued token for', user._id);
    return res.status(201).json({ token });
  } catch (err) {
    console.error('POST /signup error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// LOGIN
router.post('/login', async (req, res) => {
  console.log('📝 POST /login body:', req.body);
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }
    const token = jwt.sign(
      { userId: user._id, firstName: user.firstName, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '2h' }
    );
    console.log('🔐 POST /login success for', user._id);
    return res.json({ token });
  } catch (err) {
    console.error('POST /login error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// GET PROFILE
router.get('/profile', async (req, res) => {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: 'Token missing' });
  try {
    const token = auth.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).lean();
    if (!user) return res.status(404).json({ error: 'User not found' });
    return res.json({
      userId: user._id,
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      instagramHandle: user.instagramHandle || '',
      tiktokHandle: user.tiktokHandle || '',
      email: user.email
    });
  } catch (err) {
    console.error('GET /profile error:', err);
    return res.status(401).json({ error: 'Invalid token or server error' });
  }
});

// UPDATE PROFILE
router.put('/profile', async (req, res) => {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: 'Token missing' });
  try {
    const token = auth.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const updates = {
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      instagramHandle: req.body.instagramHandle,
      tiktokHandle: req.body.tiktokHandle
    };
    const updatedUser = await User.findByIdAndUpdate(decoded.userId, updates, { new: true });
    return res.json({
      userId: updatedUser._id,
      firstName: updatedUser.firstName,
      lastName: updatedUser.lastName,
      instagramHandle: updatedUser.instagramHandle,
      tiktokHandle: updatedUser.tiktokHandle,
      email: updatedUser.email
    });
  } catch (err) {
    console.error('PUT /profile error:', err);
    return res.status(401).json({ error: 'Invalid token or server error' });
  }
});

// REFRESH
router.post('/refresh', async (req, res) => {
  const token = req.cookies?.refreshToken || req.body.refreshToken;
  if (!token) return res.status(401).json({ error: 'No refresh token' });
  try {
    const decoded = jwt.verify(token, process.env.REFRESH_SECRET);
    const newAccessToken = jwt.sign(
      { userId: decoded.userId, firstName: decoded.firstName },
      process.env.JWT_SECRET,
      { expiresIn: '15m' }
    );
    res.json({ token: newAccessToken });
  } catch {
    res.status(401).json({ error: 'Invalid refresh token' });
  }
});

module.exports = router;
