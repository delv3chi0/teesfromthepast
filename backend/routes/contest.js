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
  const month = String(now.getMonth() + 1).padStart(2, '0'); 
  return `${year}-${month}`;
};

// ... (POST /submit/:designId route remains the same) ...
router.post('/submit/:designId', protect, async (req, res) => {
  const { designId } = req.params;
  const userId = req.user.id;
  const currentMonth = getCurrentMonthYYYYMM(); 

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
  const currentMonth = getCurrentMonthYYYYMM();
  try {
    const contestDesigns = await Design.find({ 
      isSubmittedForContest: true, 
      contestSubmissionMonth: currentMonth 
    })
    .populate('user', 'username') // <-- MODIFICATION: Populate user field, select only username
    .sort({ votes: -1, createdAt: -1 }); 

    res.status(200).json(contestDesigns);
  } catch (error) {
    console.error("[Contest Get Designs] Error:", error);
    res.status(500).json({ message: 'Server error fetching contest designs.', error: error.message });
  }
});

// ... (POST /vote/:designId route remains the same) ...
router.post('/vote/:designId', protect, async (req, res) => {
  const { designId } = req.params;
  const userId = req.user.id;
  const currentMonth = getCurrentMonthYYYYMM(); 

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
      monthlyVote = user.monthlyVoteRecord.find(record => record.month === currentMonth);
    }
    
    if (!monthlyVote) {
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
