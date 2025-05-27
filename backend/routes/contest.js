// backend/routes/contest.js
import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import Design from '../models/Design.js';
import User from '../models/User.js'; // We need the User model to update their submission/vote status

const router = express.Router();

// Helper function to get current month in 'YYYY-MM' format
const getCurrentMonthYYYYMM = () => {
  const now = new Date();
  return `<span class="math-inline">\{now\.getFullYear\(\)\}\-</span>{String(now.getMonth() + 1).padStart(2, '0')}`;
};

// === Recipe 1: Submit a Design to the Current Month's Contest ===
// Path: POST /api/contest/submit/:designId
router.post('/submit/:designId', protect, async (req, res) => {
  const { designId } = req.params;
  const userId = req.user.id;
  const currentMonth = getCurrentMonthYYYYMM();

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    // Check if user has already submitted this month
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
    // If submitted in a previous month, it's okay to resubmit for a new month,
    // but our User.lastContestSubmissionMonth check prevents multiple submissions by user in same month.

    design.isSubmittedForContest = true;
    design.contestSubmissionMonth = currentMonth;
    // Reset votes if it's a new submission period for this design
    // For simplicity, let's assume votes are always for the current submission.
    // If a design can be re-submitted, its old votes shouldn't carry over.
    // We might need more sophisticated logic if designs can be in multiple contests.
    // For now, if it's re-submitted, this flag approach is simple.
    // A more robust system might create separate ContestEntry documents.
    design.votes = 0; // Reset votes upon submission to a new contest month
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
router.get('/designs', async (req, res) => { // Public route to view contest designs
  const currentMonth = getCurrentMonthYYYYMM();
  // We might want to add pagination later
  try {
    const contestDesigns = await Design.find({ 
      isSubmittedForContest: true, 
      contestSubmissionMonth: currentMonth 
    }).sort({ votes: -1, createdAt: -1 }); // Sort by most votes, then newest

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

    // Manage monthly vote tracking for the user
    let monthlyVote = user.monthlyVoteRecord.find(record => record.month === currentMonth);
    if (!monthlyVote) {
      // If no record for this month, create one
      user.monthlyVoteRecord.push({ month: currentMonth, designsVotedFor: [] });
      monthlyVote = user.monthlyVoteRecord.find(record => record.month === currentMonth);
    }

    if (monthlyVote.designsVotedFor.length >= 3) {
      return res.status(400).json({ message: 'You have already used all your 3 votes for this month.' });
    }

    if (monthlyVote.designsVotedFor.includes(designId)) {
      return res.status(400).json({ message: 'You have already voted for this design this month.' });
    }

    // Cast vote
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
