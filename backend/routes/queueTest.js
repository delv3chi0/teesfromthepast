// backend/routes/queueTest.js
import express from 'express';
import { addEmailJob, addThumbnailJob, addSitemapJob, getQueueStats } from '../queues/index.js';

const router = express.Router();

// Test endpoint to add jobs to queues
router.post('/test-email', async (req, res) => {
  try {
    const { type = 'welcome', email = 'test@example.com', username = 'Test User' } = req.body;
    
    const job = await addEmailJob(type, { email, username });
    
    if (!job) {
      return res.json({ message: 'Email job skipped (Redis not available)', simulated: true });
    }
    
    res.json({ 
      message: 'Email job added successfully', 
      jobId: job.id,
      type,
      data: { email, username }
    });
  } catch (error) {
    console.error('Failed to add email job:', error.message);
    res.status(500).json({ error: error.message });
  }
});

router.post('/test-thumbnail', async (req, res) => {
  try {
    const { 
      designId = 'test-design-123',
      originalImageUrl = 'https://via.placeholder.com/1024x1024.jpg',
      sizes = [150, 300, 600]
    } = req.body;
    
    const job = await addThumbnailJob({ designId, originalImageUrl, sizes });
    
    if (!job) {
      return res.json({ message: 'Thumbnail job skipped (Redis not available)', simulated: true });
    }
    
    res.json({ 
      message: 'Thumbnail job added successfully', 
      jobId: job.id,
      data: { designId, originalImageUrl, sizes }
    });
  } catch (error) {
    console.error('Failed to add thumbnail job:', error.message);
    res.status(500).json({ error: error.message });
  }
});

router.post('/test-sitemap', async (req, res) => {
  try {
    const job = await addSitemapJob();
    
    if (!job) {
      return res.json({ message: 'Sitemap job skipped (Redis not available)', simulated: true });
    }
    
    res.json({ 
      message: 'Sitemap job added successfully', 
      jobId: job.id
    });
  } catch (error) {
    console.error('Failed to add sitemap job:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Get queue statistics
router.get('/stats', async (req, res) => {
  try {
    const stats = await getQueueStats();
    res.json(stats);
  } catch (error) {
    console.error('Failed to get queue stats:', error.message);
    res.status(500).json({ error: error.message });
  }
});

export default router;