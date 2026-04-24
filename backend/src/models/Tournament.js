const mongoose = require('mongoose');

const tournamentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['swiss', 'round_robin', 'knockout'],
    default: 'swiss'
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: Date,
  rounds: {
    type: Number,
    default: 5
  },
  maxPlayers: {
    type: Number,
    default: 32
  },
  entryFee: {
    type: Number,
    default: 50
  },
  prizePool: {
    type: Number,
    default: 2500
  },
  description: String,
  status: {
    type: String,
    enum: ['registration', 'ongoing', 'completed', 'cancelled'],
    default: 'registration'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  players: [{
    playerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    score: {
      type: Number,
      default: 0
    }
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Tournament', tournamentSchema);