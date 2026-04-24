const mongoose = require('mongoose');

const playerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  rating: {
    type: Number,
    default: 1200
  },
  club: {
    type: String,
    default: ''
  },
  federation: {
    type: String,
    uppercase: true,
    maxlength: 3
  },
  birthDate: {
    type: Date
  },
  phone: {
    type: String
  },
  tournamentsPlayed: [{
    tournamentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tournament'
    },
    score: Number,
    rank: Number
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Player', playerSchema);