const mongoose = require('mongoose');

const matchSchema = new mongoose.Schema({
  tournamentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tournament',
    required: true
  },
  round: {
    type: Number,
    required: true
  },
  whitePlayer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Player'
  },
  blackPlayer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Player'
  },
  result: {
    type: String,
    enum: ['1-0', '0-1', '1/2-1/2', '*', null],
    default: null
  },
  pgn: {
    type: String,
    default: ''
  },
  isBye: {
    type: Boolean,
    default: false
  },
  playedAt: {
    type: Date
  },
  boardNumber: {
    type: Number
  }
});

module.exports = mongoose.model('Match', matchSchema);