const express = require('express');
const Tournament = require('../models/Tournament');
const TournamentRegistration = require('../models/TournamentRegistration');
const auth = require('../middleware/auth');
const router = express.Router();

// Create tournament (admin only)
router.post('/create', auth, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can create tournaments' });
    }
    
    const tournament = new Tournament({
      ...req.body,
      createdBy: req.user._id,
      status: 'registration'
    });
    await tournament.save();
    
    res.status(201).json({
      message: 'Tournament created successfully',
      tournament
    });
  } catch (error) {
    console.error('Create tournament error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Join tournament (requires approval)
router.post('/:tournamentId/join', auth, async (req, res) => {
  try {
    // Check if user is approved
    if (!req.user.isApproved) {
      return res.status(403).json({ error: 'Your account is pending admin approval' });
    }
    
    const tournament = await Tournament.findById(req.params.tournamentId);
    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }
    
    if (tournament.status !== 'registration') {
      return res.status(400).json({ error: 'Tournament is not open for registration' });
    }
    
    const existingRegistration = await TournamentRegistration.findOne({
      tournamentId: tournament._id,
      userId: req.user._id
    });
    
    if (existingRegistration) {
      return res.status(400).json({ error: 'Already registered' });
    }
    
    const registeredCount = await TournamentRegistration.countDocuments({
      tournamentId: tournament._id,
      status: 'approved'
    });
    
    if (registeredCount >= tournament.maxPlayers) {
      return res.status(400).json({ error: 'Tournament is full' });
    }
    
    const registration = new TournamentRegistration({
      tournamentId: tournament._id,
      userId: req.user._id,
      paymentAmount: tournament.entryFee,
      status: 'approved', // Auto-approve for now
      paymentStatus: 'pending'
    });
    
    await registration.save();
    
    res.json({
      message: 'Successfully joined tournament',
      registration
    });
  } catch (error) {
    console.error('Join tournament error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get tournament participants
router.get('/:tournamentId/participants', auth, async (req, res) => {
  try {
    const registrations = await TournamentRegistration.find({
      tournamentId: req.params.tournamentId,
      status: 'approved'
    }).populate('userId', 'username rating online');
    
    res.json(registrations);
  } catch (error) {
    console.error('Get participants error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get available tournaments for logged-in users
router.get('/available', auth, async (req, res) => {
  try {
    const tournaments = await Tournament.find({
      status: 'registration',
      startDate: { $gt: new Date() }
    });
    
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
    console.error('Get tournaments error:', error);
    res.status(500).json({ error: error.message });
  }
});
// Get active game for player in tournament
router.get('/active/:tournamentId/:userId', auth, async (req, res) => {
  try {
    const game = await OnlineGame.findOne({
      tournamentId: req.params.tournamentId,
      $or: [
        { 'whitePlayer.userId': req.params.userId },
        { 'blackPlayer.userId': req.params.userId }
      ],
      status: 'active'
    });
    
    if (game) {
      const isWhite = game.whitePlayer.userId.toString() === req.params.userId;
      res.json({
        game: {
          gameId: game._id,
          color: isWhite ? 'white' : 'black',
          opponent: isWhite ? game.blackPlayer.username : game.whitePlayer.username,
          opponentRating: isWhite ? game.blackPlayer.rating : game.whitePlayer.rating
        }
      });
    } else {
      res.json({ game: null });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get active game for player
router.get('/active/:tournamentId/:userId', auth, async (req, res) => {
  try {
    const game = await OnlineGame.findOne({
      tournamentId: req.params.tournamentId,
      $or: [
        { 'whitePlayer.userId': req.params.userId },
        { 'blackPlayer.userId': req.params.userId }
      ],
      status: 'active'
    });
    
    if (game) {
      const isWhite = game.whitePlayer.userId.toString() === req.params.userId;
      res.json({
        game: {
          gameId: game._id,
          color: isWhite ? 'white' : 'black',
          opponent: isWhite ? game.blackPlayer.username : game.whitePlayer.username,
          opponentRating: isWhite ? game.blackPlayer.rating : game.whitePlayer.rating,
          fen: game.currentFEN || 'start',
          moves: game.moves || []
        }
      });
    } else {
      res.json({ game: null });
    }
  } catch (error) {
    console.error('Error checking active game:', error);
    res.status(500).json({ error: error.message });
  }
});
// Get my tournaments
router.get('/my-tournaments', auth, async (req, res) => {
  try {
    const registrations = await TournamentRegistration.find({
      userId: req.user._id
    }).populate('tournamentId');
    
    res.json(registrations);
  } catch (error) {
    console.error('Get my tournaments error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;