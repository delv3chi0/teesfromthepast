// backend/routes/contest.js
import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import Design from '../models/Design.js';
import User from '../models/User.js';

const router = express.Router();

// Helper function to get current month in 'YYYY-MM' format
const getCurrentMonthYYYYMM = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0'); // getMonth() is 0-indexed, ensure 2 digits
  return `${year}-${month}`;
};

// === Recipe 1: Submit a Design to the Current Month's Contest ===
// Path: POST /api/contest/submit/:designId
router.post('/submit/:designId', protect, async (req, res) => {
  const { designId } = req.params;
  const userId = req.user.id;
  const currentMonth = getCurrentMonthYYYYMM(); // This will now work correctly

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    if (user.lastContestSubmissionMonth === currentMonth) {
      return res.status(400).json({ message: 'You have already submitted a design for this month\'s contest.' });
    }

    const design = await Design.findOne({ _id: designId, user: userId });
    if (!design) {
      return res.status(404).json({ message: 'Design not found or you do not own this design.' });
    }

    if (design.isSubmittedForContest && design.contestSubmissionMonth === currentMonth) {
      return res.status(400).json({ message: 'This design is already submitted for this month\'s contest.' });
    }

    design.isSubmittedForContest = true;
    design.contestSubmissionMonth = currentMonth;
    design.votes = 0; 
    await design.save();

    user.lastContestSubmissionMonth = currentMonth;
    await user.save();

    res.status(200).json({ message: 'Design submitted to contest successfully!', design });

  } catch (error) {
    console.error("[Contest Submit] Error:", error);
    if (error.kind === 'ObjectId') {
        return res.status(400).json({ message: 'Invalid design ID format.' });
    }
    res.status(500).json({ message: 'Server error during contest submission.', error: error.message });
  }
});

// === Recipe 2: Get All Designs for the Current Month's Contest ===
// Path: GET /api/contest/designs
router.get('/designs', async (req, res) => { 
  const currentMonth = getCurrentMonthYYYYMM(); // This will now work correctly
  try {
    const contestDesigns = await Design.find({ 
      isSubmittedForContest: true, 
      contestSubmissionMonth: currentMonth 
    }).sort({ votes: -1, createdAt: -1 }); 

    res.status(200).json(contestDesigns);
  } catch (error) {
    console.error("[Contest Get Designs] Error:", error);
    res.status(500).json({ message: 'Server error fetching contest designs.', error: error.message });
  }
});

// === Recipe 3: Vote for a Design in the Current Month's Contest ===
// Path: POST /api/contest/vote/:designId
router.post('/vote/:designId', protect, async (req, res) => {
  const { designId } = req.params;
  const userId = req.user.id;
  const currentMonth = getCurrentMonthYYYYMM(); // This will now work correctly

  try {
    const designToVoteFor = await Design.findOne({
      _id: designId,
      isSubmittedForContest: true,
      contestSubmissionMonth: currentMonth
    });

    if (!designToVoteFor) {
      return res.status(404).json({ message: 'This design is not part of the current contest or does not exist.' });
    }

    if (String(designToVoteFor.user) === String(userId)) {
        return res.status(400).json({ message: 'You cannot vote for your own design.' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    let monthlyVote = user.monthlyVoteRecord.find(record => record.month === currentMonth);
    if (!monthlyVote) {
      user.monthlyVoteRecord.push({ month: currentMonth, designsVotedFor: [] });
      // Re-fetch the newly added record to work with it
      monthlyVote = user.monthlyVoteRecord.find(record => record.month === currentMonth);
    }
    
    // Ensure monthlyVote is not undefined (it shouldn't be after the push and find)
    if (!monthlyVote) {
        // This should ideally not happen if the logic above is correct
        console.error("[Contest Vote] Failed to create or find monthly vote record for user:", userId, "month:", currentMonth);
        return res.status(500).json({ message: 'Internal server error processing vote record.'});
    }

    if (monthlyVote.designsVotedFor.length >= 3) {
      return res.status(400).json({ message: 'You have already used all your 3 votes for this month.' });
    }

    if (monthlyVote.designsVotedFor.includes(designId)) {
      return res.status(400).json({ message: 'You have already voted for this design this month.' });
    }

    monthlyVote.designsVotedFor.push(designId);
    await user.save();

    designToVoteFor.votes += 1;
    await designToVoteFor.save();

    res.status(200).json({ message: 'Vote cast successfully!', design: designToVoteFor });

  } catch (error) {
    console.error("[Contest Vote] Error:", error);
    if (error.kind === 'ObjectId') {
        return res.status(400).json({ message: 'Invalid design ID format.' });
    }
    res.status(500).json({ message: 'Server error casting vote.', error: error.message });
  }
});

export default router;
