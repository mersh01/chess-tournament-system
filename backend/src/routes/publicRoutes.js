const express = require('express');
const router = express.Router();
const Tournament = require('../models/Tournament');
const TournamentRegistration = require('../models/TournamentRegistration');
const OnlineGame = require('../models/OnlineGame');
const User = require('../models/User');

// Get all tournaments (public)
router.get('/tournaments', async (req, res) => {
  try {
    const tournaments = await Tournament.find({
      status: { $in: ['registration', 'ongoing'] }
    }).sort({ createdAt: -1 });
    
    // Get player count for each tournament
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
    console.error('Error fetching public tournaments:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get past champions
router.get('/champions', async (req, res) => {
  try {
    const completedTournaments = await Tournament.find({
      status: 'completed'
    }).sort({ completedAt: -1 }).limit(10);
    
    const champions = await Promise.all(
      completedTournaments.map(async (tournament) => {
        // Find winner from tournament registrations
        const winner = await TournamentRegistration.findOne({
          tournamentId: tournament._id,
          status: 'approved'
        }).sort({ score: -1 }).populate('userId', 'username');
        
        return {
          tournamentId: tournament._id,
          tournamentName: tournament.name,
          winnerName: winner?.userId?.username || 'Unknown',
          score: winner?.score || 0,
          date: tournament.endDate || tournament.createdAt
        };
      })
    );
    
    res.json(champions);
  } catch (error) {
    console.error('Error fetching champions:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get live games (public)
router.get('/live-games', async (req, res) => {
  try {
    const liveGames = await OnlineGame.find({
      status: 'active'
    }).populate('whitePlayer.userId', 'username')
      .populate('blackPlayer.userId', 'username');
    
    const gamesWithDetails = await Promise.all(
      liveGames.map(async (game) => {
        const tournament = await Tournament.findById(game.tournamentId);
        return {
          _id: game._id,
          whitePlayer: game.whitePlayer,
          blackPlayer: game.blackPlayer,
          tournamentName: tournament?.name || 'Unknown Tournament',
          round: game.round || 1,
          status: game.status
        };
      })
    );
    
    res.json(gamesWithDetails);
  } catch (error) {
    console.error('Error fetching live games:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get tournament details by ID (public)
router.get('/tournament/:id', async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.id);
    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }
    
    const registrations = await TournamentRegistration.find({
      tournamentId: tournament._id,
      status: 'approved'
    }).populate('userId', 'username rating');
    
    const standings = registrations
      .sort((a, b) => b.score - a.score)
      .map(reg => ({
        name: reg.userId.username,
        rating: reg.userId.rating,
        score: reg.score,
        wins: reg.wins,
        draws: reg.draws,
        losses: reg.losses
      }));
    
    res.json({
      ...tournament.toObject(),
      standings,
      players: registrations.length
    });
  } catch (error) {
    console.error('Error fetching tournament details:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;