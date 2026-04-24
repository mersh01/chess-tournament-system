const mongoose = require('mongoose');

const onlineGameSchema = new mongoose.Schema({
  gameId: {
    type: String,
    required: true,
    unique: true
  },
  tournamentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tournament'
  },
  round: Number,
  whitePlayer: {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    username: String,
    rating: Number
  },
  blackPlayer: {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    username: String,
    rating: Number
  },
  status: {
    type: String,
    enum: ['waiting', 'active', 'completed', 'abandoned'],
    default: 'waiting'
  },
  currentFEN: {
    type: String,
    default: 'start'
  },
  moves: [String],
  result: {
    type: String,
    enum: ['1-0', '0-1', '1/2-1/2', null],
    default: null
  },
  winner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  startedAt: Date,
  completedAt: Date,
  lastActivity: Date,
  timeControl: {
    initial: Number,
    increment: Number
  }
});

module.exports = mongoose.model('OnlineGame', onlineGameSchema);