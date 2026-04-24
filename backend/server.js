const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const http = require('http');
const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
const { Chess } = require('chess.js');
const authRoutes = require('./src/routes/authRoutes');
const tournamentRoutes = require('./src/routes/tournamentRoutes');
const publicRoutes = require('./src/routes/publicRoutes');
const adminRoutes = require('./src/routes/adminRoutes');
const User = require('./src/models/User');
const OnlineGame = require('./src/models/OnlineGame');
const TournamentRegistration = require('./src/models/TournamentRegistration');

dotenv.config();

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;

// ============== DECLARE GAME STATE VARIABLES ==============
let waitingPlayers = [];
const activeGames = new Map();
const timerIntervals = new Map();

// Enable trust proxy for Render
app.set('trust proxy', 1);

// ============== CORS CONFIGURATION (FIXED) ==============
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://chess-tournament-ashy.vercel.app',
  process.env.FRONTEND_URL,
  'https://*.vercel.app',
  'https://*.onrender.com'
].filter(Boolean);

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);
    
    const isAllowed = allowedOrigins.some(allowed => {
      if (allowed === origin) return true;
      if (allowed && allowed.includes('*')) {
        const pattern = allowed.replace(/\*/g, '.*');
        const regex = new RegExp(`^${pattern}$`);
        return regex.test(origin);
      }
      return false;
    });
    
    if (isAllowed) {
      callback(null, true);
    } else {
      console.log('❌ Blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin']
};

// Apply CORS middleware
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ============== MONGODB CONNECTION ==============
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/chess_tournament';
console.log('📡 Connecting to MongoDB...');
mongoose.connect(MONGODB_URI)
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB connection error:', err.message));

// ============== ROUTES ==============
app.use('/api/auth', authRoutes);
app.use('/api/tournaments', tournamentRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/admin', adminRoutes);

// ============== SOCKET.IO (FIXED CORS) ==============
const io = socketIo(server, {
  cors: {
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      const isAllowed = allowedOrigins.some(allowed => {
        if (allowed === origin) return true;
        if (allowed && allowed.includes('*')) {
          const pattern = allowed.replace(/\*/g, '.*');
          const regex = new RegExp(`^${pattern}$`);
          return regex.test(origin);
        }
        return false;
      });
      if (isAllowed) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ["GET", "POST"],
    transports: ['websocket', 'polling']
  },
  allowEIO3: true
});

// ============== HELPER FUNCTIONS ==============
async function saveGameToDatabase(gameId, gameData) {
  try {
    let game = await OnlineGame.findOne({ gameId: gameId });
    
    if (game) {
      game.currentFEN = gameData.game.fen();
      game.moves = gameData.moves || [];
      game.status = 'active';
      game.lastActivity = new Date();
      await game.save();
    } else {
      game = new OnlineGame({
        gameId: gameId,
        whitePlayer: {
          userId: gameData.whiteUser,
          username: gameData.whiteUsername,
          rating: 1200
        },
        blackPlayer: {
          userId: gameData.blackUser,
          username: gameData.blackUsername,
          rating: 1200
        },
        status: 'active',
        currentFEN: gameData.game.fen(),
        moves: gameData.moves || [],
        startedAt: new Date()
      });
      await game.save();
    }
    console.log(`💾 Game ${gameId} saved`);
    return game;
  } catch (error) {
    console.error('Error saving game:', error);
    return null;
  }
}

async function updateTournamentStandings(tournamentId, whiteUserId, blackUserId, whitePoints, blackPoints, result) {
  try {
    const whiteRegistration = await TournamentRegistration.findOne({
      tournamentId: tournamentId,
      userId: whiteUserId
    });
    
    if (whiteRegistration) {
      whiteRegistration.gamesPlayed += 1;
      whiteRegistration.points += whitePoints;
      if (result === 'win') {
        if (whitePoints === 8) {
          whiteRegistration.wins += 1;
          whiteRegistration.score += 1;
        } else {
          whiteRegistration.losses += 1;
        }
      } else if (result === 'draw') {
        whiteRegistration.draws += 1;
        whiteRegistration.score += 0.5;
      }
      await whiteRegistration.save();
    }
    
    const blackRegistration = await TournamentRegistration.findOne({
      tournamentId: tournamentId,
      userId: blackUserId
    });
    
    if (blackRegistration) {
      blackRegistration.gamesPlayed += 1;
      blackRegistration.points += blackPoints;
      if (result === 'win') {
        if (blackPoints === 8) {
          blackRegistration.wins += 1;
          blackRegistration.score += 1;
        } else {
          blackRegistration.losses += 1;
        }
      } else if (result === 'draw') {
        blackRegistration.draws += 1;
        blackRegistration.score += 0.5;
      }
      await blackRegistration.save();
    }
    
    console.log(`✅ Updated standings: +${whitePoints}pts, +${blackPoints}pts`);
  } catch (error) {
    console.error('Error updating tournament standings:', error);
  }
}

function broadcastTimeUpdate(gameId, game) {
  const timeData = {
    whiteTime: game.whiteTime,
    blackTime: game.blackTime,
    activeTimer: game.activeTimer
  };
  io.to(game.whiteSocket).emit('time-sync', timeData);
  io.to(game.blackSocket).emit('time-sync', timeData);
  io.to(`spectator_${gameId}`).emit('time-sync', timeData);
}

function handleTimeOut(gameId, loserColor) {
  const game = activeGames.get(gameId);
  if (!game || game.gameOver) return;
  
  game.gameOver = true;
  const winner = loserColor === 'white' ? 'black' : 'white';
  const result = winner === 'white' ? '1-0' : '0-1';
  
  console.log(`⏰ Timeout! ${loserColor} ran out of time. Winner: ${winner}`);
  
  const whitePoints = winner === 'white' ? 8 : 0;
  const blackPoints = winner === 'black' ? 8 : 0;
  updateTournamentStandings(game.tournamentId, game.whiteUser, game.blackUser, whitePoints, blackPoints, 'win');
  
  io.to(game.whiteSocket).emit('game-over', { winner, reason: 'timeout', result });
  io.to(game.blackSocket).emit('game-over', { winner, reason: 'timeout', result });
  io.to(`spectator_${gameId}`).emit('game-over', {
    winner, reason: 'timeout', result,
    whitePlayer: game.whiteUsername,
    blackPlayer: game.blackUsername
  });
  
  io.emit('live-game-update', {
    gameId: gameId,
    whitePlayer: game.whiteUsername,
    blackPlayer: game.blackUsername,
    isGameOver: true,
    winner: winner,
    reason: 'timeout',
    result: result
  });
  
  OnlineGame.findOneAndUpdate({ gameId }, { status: 'completed', result }).catch(console.error);
  activeGames.delete(gameId);
  timerIntervals.delete(gameId);
}

function startGameTimer(gameId) {
  if (timerIntervals.has(gameId)) {
    clearInterval(timerIntervals.get(gameId));
  }
  
  console.log(`⏰ Starting timer for game ${gameId}`);
  
  const interval = setInterval(() => {
    const game = activeGames.get(gameId);
    if (!game || game.gameOver) {
      clearInterval(interval);
      timerIntervals.delete(gameId);
      return;
    }
    
    if (game.activeTimer && !game.paused) {
      if (game.activeTimer === 'white') {
        if (game.whiteTime <= 0) {
          clearInterval(interval);
          timerIntervals.delete(gameId);
          handleTimeOut(gameId, 'white');
        } else {
          game.whiteTime--;
          broadcastTimeUpdate(gameId, game);
        }
      } else {
        if (game.blackTime <= 0) {
          clearInterval(interval);
          timerIntervals.delete(gameId);
          handleTimeOut(gameId, 'black');
        } else {
          game.blackTime--;
          broadcastTimeUpdate(gameId, game);
        }
      }
    }
  }, 1000);
  
  timerIntervals.set(gameId, interval);
}

// ============= API ENDPOINTS =============
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/public/active-games', async (req, res) => {
  try {
    const activeGamesList = [];
    for (const [gameId, game] of activeGames) {
      if (game && game.game && !game.gameOver) {
        activeGamesList.push({
          gameId: gameId,
          whitePlayer: game.whiteUsername || 'White Player',
          blackPlayer: game.blackUsername || 'Black Player',
          moves: game.moves?.length || 0,
          lastMove: game.moves?.slice(-1)[0] || null
        });
      }
    }
    res.json(activeGamesList);
  } catch (error) {
    console.error('Error getting active games:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/games/spectate/:gameId', async (req, res) => {
  try {
    const gameId = req.params.gameId;
    let gameData = null;
    
    if (activeGames.has(gameId)) {
      const game = activeGames.get(gameId);
      gameData = {
        gameId: gameId,
        whitePlayer: game.whiteUsername,
        blackPlayer: game.blackUsername,
        fen: game.game.fen(),
        moves: game.moves || [],
        isGameOver: game.gameOver || false
      };
    } else {
      const dbGame = await OnlineGame.findOne({ gameId: gameId });
      if (dbGame) {
        gameData = {
          gameId: gameId,
          whitePlayer: dbGame.whitePlayer?.username || 'Unknown',
          blackPlayer: dbGame.blackPlayer?.username || 'Unknown',
          fen: dbGame.currentFEN || 'start',
          moves: dbGame.moves || [],
          isGameOver: dbGame.status !== 'active'
        };
      }
    }
    
    if (gameData) {
      res.json({ game: gameData });
    } else {
      res.status(404).json({ error: 'Game not found' });
    }
  } catch (error) {
    console.error('Error fetching game for spectator:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/games/active/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;
    for (const [gameId, game] of activeGames) {
      if (!game.gameOver && (game.whiteUser === userId || game.blackUser === userId)) {
        return res.json({
          game: {
            gameId: gameId,
            color: game.whiteUser === userId ? 'white' : 'black',
            opponent: game.whiteUser === userId ? game.blackUsername : game.whiteUsername,
            fen: game.game.fen(),
            moves: game.moves || [],
            tournamentId: game.tournamentId,
            isActive: true
          }
        });
      }
    }
    res.json({ game: null });
  } catch (error) {
    console.error('Error getting active game:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/', (req, res) => {
  res.json({ message: 'Chess Tournament API running!' });
});

// ============= SOCKET.IO HANDLERS =============
io.use(async (socket, next) => {
  const token = socket.handshake.auth.token;
  
  if (!token) {
    socket.isSpectator = true;
    socket.user = { username: 'Spectator', _id: 'spectator', isSpectator: true };
    return next();
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);
    if (!user) return next(new Error('User not found'));
    socket.user = user;
    next();
  } catch (error) {
    next(new Error('Invalid token'));
  }
});

io.on('connection', (socket) => {
  console.log(`✅ ${socket.user.username} connected (ID: ${socket.id})`);
  
  if (socket.user._id !== 'spectator') {
    User.findByIdAndUpdate(socket.user._id, { online: true, socketId: socket.id }).catch(console.error);
  }
  
  socket.on('join-spectator', (gameId) => {
    socket.join(`spectator_${gameId}`);
    console.log(`👁️ Spectator joined room: spectator_${gameId}`);
    const game = activeGames.get(gameId);
    if (game) {
      socket.emit('spectator-update', { gameId, fen: game.game.fen(), moves: game.moves, lastMove: null });
      socket.emit('time-sync', { whiteTime: game.whiteTime, blackTime: game.blackTime, activeTimer: game.activeTimer });
    }
  });
  
  socket.on('leave-spectator', (gameId) => {
    socket.leave(`spectator_${gameId}`);
    console.log(`👁️ Spectator left room: spectator_${gameId}`);
  });
  
  socket.on('sync-time', ({ gameId }) => {
    const game = activeGames.get(gameId);
    if (game) {
      socket.emit('time-sync', { whiteTime: game.whiteTime, blackTime: game.blackTime, activeTimer: game.activeTimer });
    }
  });
  
  socket.on('check-existing-game', async () => {
    if (socket.user._id === 'spectator') return;
    const userId = socket.user._id.toString();
    for (const [gameId, game] of activeGames) {
      if (game.whiteUser === userId || game.blackUser === userId) {
        const isWhite = game.whiteUser === userId;
        socket.emit('game-restore', {
          gameId, color: isWhite ? 'white' : 'black',
          opponent: isWhite ? game.blackUsername : game.whiteUsername,
          fen: game.game.fen(), moves: game.moves,
          whiteTime: game.whiteTime, blackTime: game.blackTime,
          activeTimer: game.activeTimer
        });
        return;
      }
    }
  });
  
  socket.on('join-lobby', (tournamentId) => {
    socket.tournamentId = tournamentId;
    console.log(`${socket.user.username} joined lobby`);
  });
  
  socket.on('find-match', async () => {
    if (socket.user._id === 'spectator') return;
    const userId = socket.user._id.toString();
    console.log(`🔍 ${socket.user.username} looking for match`);
    
    waitingPlayers = waitingPlayers.filter(p => p.userId !== userId);
    waitingPlayers.push({ socketId: socket.id, userId, username: socket.user.username, tournamentId: socket.tournamentId });
    socket.emit('waiting', { message: 'Looking for opponent...' });
    
    if (waitingPlayers.length >= 2) {
      const p1 = waitingPlayers.shift();
      const p2 = waitingPlayers.shift();
      console.log(`🎮 MATCH CREATED: ${p1.username} (white) vs ${p2.username} (black)`);
      
      const gameId = `game_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
      const chessGame = new Chess();
      const gameData = {
        game: chessGame, gameId, whiteUser: p1.userId, whiteUsername: p1.username, whiteSocket: p1.socketId,
        blackUser: p2.userId, blackUsername: p2.username, blackSocket: p2.socketId, moves: [],
        tournamentId: p1.tournamentId, createdAt: new Date(), whiteTime: 600, blackTime: 600,
        activeTimer: 'white', lastMoveTime: Date.now(), gameOver: false, paused: false
      };
      activeGames.set(gameId, gameData);
      
      try {
        const newGameRecord = new OnlineGame({
          gameId, whitePlayer: { userId: p1.userId, username: p1.username, rating: 1200 },
          blackPlayer: { userId: p2.userId, username: p2.username, rating: 1200 },
          status: 'active', currentFEN: chessGame.fen(), moves: [], startedAt: new Date(), lastActivity: new Date()
        });
        await newGameRecord.save();
      } catch (err) { console.error('Error saving game to DB:', err); }
      
      startGameTimer(gameId);
      io.to(p1.socketId).emit('game-start', { gameId, color: 'white', opponent: p2.username, fen: chessGame.fen(), moves: [] });
      io.to(p2.socketId).emit('game-start', { gameId, color: 'black', opponent: p1.username, fen: chessGame.fen(), moves: [] });
      io.emit('live-game-update', { gameId, whitePlayer: p1.username, blackPlayer: p2.username, lastMove: null, moveCount: 0, fen: chessGame.fen(), isGameOver: false });
    }
  });
  
  socket.on('make-move', async ({ gameId, from, to }) => {
    const game = activeGames.get(gameId);
    if (!game) { socket.emit('move-error', 'Game not found'); return; }
    
    const isWhitePlayer = game.whiteSocket === socket.id;
    const isWhiteTurn = game.game.turn() === 'w';
    if ((isWhitePlayer && !isWhiteTurn) || (!isWhitePlayer && isWhiteTurn)) {
      socket.emit('move-error', 'Not your turn'); return;
    }
    
    try {
      const move = game.game.move({ from, to, promotion: 'q' });
      if (move) {
        game.moves.push(move.san);
        const opponentSocket = isWhitePlayer ? game.blackSocket : game.whiteSocket;
        const fen = game.game.fen();
        game.activeTimer = isWhitePlayer ? 'black' : 'white';
        broadcastTimeUpdate(gameId, game);
        io.to(opponentSocket).emit('opponent-move', { from, to, fen, whiteTime: game.whiteTime, blackTime: game.blackTime, activeTimer: game.activeTimer });
        socket.emit('move-confirmed', { from, to, whiteTime: game.whiteTime, blackTime: game.blackTime, activeTimer: game.activeTimer });
        await saveGameToDatabase(gameId, game);
        io.emit('live-game-update', { gameId, whitePlayer: game.whiteUsername, blackPlayer: game.blackUsername, fen, lastMove: `${from}→${to}`, moveCount: game.moves.length, isGameOver: false });
        io.to(`spectator_${gameId}`).emit('spectator-update', { gameId, fen, moves: game.moves, lastMove: `${from}→${to}` });
        
        if (game.game.game_over()) {
          game.gameOver = true;
          let result = '', winner = null, reason = '';
          if (game.game.in_checkmate()) {
            winner = game.game.turn() === 'w' ? 'black' : 'white';
            result = winner === 'white' ? '1-0' : '0-1'; reason = 'checkmate';
            const whitePoints = winner === 'white' ? 8 : 0, blackPoints = winner === 'black' ? 8 : 0;
            await updateTournamentStandings(game.tournamentId, game.whiteUser, game.blackUser, whitePoints, blackPoints, 'win');
          } else if (game.game.in_stalemate()) {
            result = '1/2-1/2'; reason = 'stalemate'; winner = 'draw';
            await updateTournamentStandings(game.tournamentId, game.whiteUser, game.blackUser, 4, 4, 'draw');
          }
          if (timerIntervals.has(gameId)) { clearInterval(timerIntervals.get(gameId)); timerIntervals.delete(gameId); }
          io.to(game.whiteSocket).emit('game-over', { winner, reason, result });
          io.to(game.blackSocket).emit('game-over', { winner, reason, result });
          io.to(`spectator_${gameId}`).emit('game-over', { winner, reason, result, whitePlayer: game.whiteUsername, blackPlayer: game.blackUsername });
          io.emit('live-game-update', { gameId, whitePlayer: game.whiteUsername, blackPlayer: game.blackUsername, isGameOver: true, winner, reason, result });
          await OnlineGame.findOneAndUpdate({ gameId }, { status: 'completed', result });
          activeGames.delete(gameId);
        }
      } else { socket.emit('move-error', 'Invalid move'); }
    } catch (err) { console.error('Move error:', err); socket.emit('move-error', 'Invalid move'); }
  });
  
  socket.on('rejoin-game', async ({ gameId }) => {
    const game = activeGames.get(gameId);
    if (game) {
      const isWhite = game.whiteSocket === socket.id;
      socket.emit('game-start', { gameId, color: isWhite ? 'white' : 'black', opponent: isWhite ? game.blackUsername : game.whiteUsername, fen: game.game.fen(), moves: game.moves, whiteTime: game.whiteTime, blackTime: game.blackTime, activeTimer: game.activeTimer });
    }
  });
  
  socket.on('resign-game', ({ gameId }) => {
    const game = activeGames.get(gameId);
    if (!game) return;
    const isWhite = game.whiteSocket === socket.id;
    const winner = isWhite ? 'black' : 'white';
    if (timerIntervals.has(gameId)) { clearInterval(timerIntervals.get(gameId)); timerIntervals.delete(gameId); }
    io.to(game.whiteSocket).emit('game-over', { winner, reason: 'resignation' });
    io.to(game.blackSocket).emit('game-over', { winner, reason: 'resignation' });
    const whitePoints = winner === 'white' ? 8 : 0, blackPoints = winner === 'black' ? 8 : 0;
    updateTournamentStandings(game.tournamentId, game.whiteUser, game.blackUser, whitePoints, blackPoints, 'win');
    OnlineGame.findOneAndUpdate({ gameId }, { status: 'completed', result: winner === 'white' ? '1-0' : '0-1' }).catch(console.error);
    activeGames.delete(gameId);
  });
  
  socket.on('cancel-search', () => {
    waitingPlayers = waitingPlayers.filter(p => p.socketId !== socket.id);
    socket.emit('search-cancelled');
  });
  
  socket.on('disconnect', () => {
    console.log(`❌ ${socket.user.username} disconnected`);
    if (socket.user._id !== 'spectator') User.findByIdAndUpdate(socket.user._id, { online: false }).catch(console.error);
    waitingPlayers = waitingPlayers.filter(p => p.socketId !== socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`✅ CORS enabled for:`, allowedOrigins);
});