const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Tournament = require('../models/Tournament');
const TournamentRegistration = require('../models/TournamentRegistration');
const auth = require('../middleware/auth');

// Middleware to check if user is admin
const isAdmin = async (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// Get pending users for approval
router.get('/pending-users', auth, isAdmin, async (req, res) => {
  try {
    const pendingUsers = await User.find({
      isApproved: false,
      role: 'user'
    }).select('-password');
    
    res.json(pendingUsers);
  } catch (error) {
    console.error('Error fetching pending users:', error);
    res.status(500).json({ error: error.message });
  }
});

// Approve user
router.post('/approve-user/:userId', auth, isAdmin, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.userId,
      { isApproved: true },
      { new: true }
    ).select('-password');
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ message: 'User approved successfully', user });
  } catch (error) {
    console.error('Error approving user:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all tournaments for admin
router.get('/tournaments', auth, isAdmin, async (req, res) => {
  try {
    const tournaments = await Tournament.find().sort({ createdAt: -1 });
    
    const tournamentsWithCount = await Promise.all(
      tournaments.map(async (tournament) => {
        const playerCount = await TournamentRegistration.countDocuments({
          tournamentId: tournament._id,
          status: 'approved'
        });
        return {
          ...tournament.toObject(),
          currentPlayers: playerCount
        };
      })
    );
    
    res.json(tournamentsWithCount);
  } catch (error) {
    console.error('Error fetching tournaments:', error);
    res.status(500).json({ error: error.message });
  }
});

// Start tournament (change status from registration to ongoing)
router.post('/start-tournament/:tournamentId', auth, isAdmin, async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.tournamentId);
    
    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }
    
    tournament.status = 'ongoing';
    tournament.startedAt = new Date();
    await tournament.save();
    
    res.json({ message: 'Tournament started successfully', tournament });
  } catch (error) {
    console.error('Error starting tournament:', error);
    res.status(500).json({ error: error.message });
  }
});

// Complete tournament
router.post('/complete-tournament/:tournamentId', auth, isAdmin, async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.tournamentId);
    
    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }
    
    tournament.status = 'completed';
    tournament.completedAt = new Date();
    await tournament.save();
    
    res.json({ message: 'Tournament completed successfully', tournament });
  } catch (error) {
    console.error('Error completing tournament:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all registered users (admin)
router.get('/users', auth, isAdmin, async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;