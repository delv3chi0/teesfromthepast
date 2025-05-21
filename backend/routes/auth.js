const SchedulePost = require('../models/SchedulePost');
const SchedulePostModel = require('../models/SchedulePost');
const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

const router = express.Router();

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
    if (!user) return res.status(400).json({ error: 'Invalid credentials' });
    if (!(await bcrypt.compare(password, user.password)))
      return res.status(400).json({ error: 'Invalid credentials' });
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
    console.log('🔄 PUT /profile body:', req.body);
    const updates = {
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      instagramHandle: req.body.instagramHandle,
      tiktokHandle: req.body.tiktokHandle
    };
    const u = await User.findByIdAndUpdate(decoded.userId, updates, { new: true });
    return res.json({
      userId: u._id,
      firstName: u.firstName,
      lastName: u.lastName,
      instagramHandle: u.instagramHandle,
      tiktokHandle: u.tiktokHandle,
      email: u.email
    });
  } catch (err) {
    console.error('PUT /profile error:', err);
    return res.status(401).json({ error: 'Invalid token or server error' });
  }
});

module.exports = router;

// REFRESH – POST /api/refresh
router.post('/refresh', async (req, res) => {
  const token = req.cookies?.refreshToken || req.body.refreshToken;
  if (!token) return res.status(401).json({ error: 'No refresh token' });
  try {
    const payload = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    // Optionally check token in DB/Redis here...
    const newAccess = jwt.sign({ userId: payload.userId, firstName: payload.firstName }, process.env.JWT_SECRET, { expiresIn: '2h' });
    res.json({ token: newAccess });
  } catch {
    res.status(401).json({ error: 'Invalid refresh token' });
  }
});

// REFRESH TOKEN ENDPOINT
router.post("/refresh", (req, res) => {
  const token = req.cookies.refreshToken;
  if (!token) return res.status(401).json({ error: "No refresh token" });
  try {
    const decoded = jwt.verify(token, process.env.REFRESH_SECRET);
    const newAccessToken = jwt.sign(
      { userId: decoded.userId, firstName: decoded.firstName },
      process.env.JWT_SECRET,
      { expiresIn: "15m" }
    );
    res.json({ token: newAccessToken });
  } catch {
    res.status(401).json({ error: "Invalid refresh token" });
  }
});

// REFRESH TOKEN ENDPOINT
router.post('/refresh', (req, res) => {
  const token = req.cookies?.refreshToken;
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
// GET /api/schedule-posts – return all scheduled posts for the user
router.get('/schedule-posts', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Token missing' });
  try {
    const token  = authHeader.split(' ')[1];
    const { userId } = jwt.verify(token, process.env.JWT_SECRET);
    const posts  = await SchedulePostModel.find({ userId }).lean(); // make sure you’ve already created SchedulePostModel in models/SchedulePost.js
    return res.json(posts);
  } catch (err) {
    console.error('GET /schedule-posts error:', err);
    return res.status(401).json({ error: 'Invalid token or server error' });
  }
});
router.get('/schedule-posts', async (req, res) => {  const authHeader = req.headers.authorization;  try {    const token = authHeader.split(' ')[1];    const { userId } = jwt.verify(token, process.env.JWT_SECRET);    const posts = await SchedulePostModel.find({ userId }).lean();    res.json(posts);  } catch (err) {    console.error('GET /schedule-posts error:', err);    res.status(500).json({ error: 'Invalid token or server error' });  }});

// POST /api/schedule-post – save + queue a new scheduled post
router.post('/schedule-post', async (req, res) => {
  try {
    const tokenData = jwt.verify(req.headers.authorization.split(' ')[1], process.env.JWT_SECRET);
    const { userId } = tokenData;
    const { draftText, dateTimeUTC, timeZone, repeatRule, platform } = req.body;
    const newPost = await SchedulePost.create({ userId, draftText, dateTimeUTC, timeZone, repeatRule, platform });
    const job   = await scheduleQueue.add(
      { draftId: newPost._id, platform },
      { repeat: { cron: repeatRule } }
    );
    return res.json({ dbId: newPost._id, jobId: job.id });
  } catch (err) {
    console.error('❌ /schedule-post error:', err);
    return res.status(500).json({ error: 'Failed to schedule' });
  }
});
