const mongoose = require('mongoose');

const tournamentRegistrationSchema = new mongoose.Schema({
  tournamentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tournament',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'completed', 'refunded'],
    default: 'pending'
  },
  paymentAmount: Number,
  score: {
    type: Number,
    default: 0
  },
  wins: {
    type: Number,
    default: 0
  },
  draws: {
    type: Number,
    default: 0
  },
  losses: {
    type: Number,
    default: 0
  },
  points: {
    type: Number,
    default: 0
  },
  gamesPlayed: {
    type: Number,
    default: 0
  },
  registeredAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('TournamentRegistration', tournamentRegistrationSchema);