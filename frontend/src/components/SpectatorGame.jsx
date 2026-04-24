import React, { useState, useEffect, useRef } from 'react';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';
import io from 'socket.io-client';
import toast from 'react-hot-toast';

function SpectatorGame({ gameId, onClose }) {
  const [game, setGame] = useState(null);
  const [whitePlayer, setWhitePlayer] = useState('');
  const [blackPlayer, setBlackPlayer] = useState('');
  const [moveHistory, setMoveHistory] = useState([]);
  const [currentMoveIndex, setCurrentMoveIndex] = useState(-1);
  const [isLiveMode, setIsLiveMode] = useState(true);
  const [gameOver, setGameOver] = useState(false);
  const [gameWinner, setGameWinner] = useState(null);
  const [gameResult, setGameResult] = useState(null);
  
  // Timer states
  const [whiteTime, setWhiteTime] = useState(600);
  const [blackTime, setBlackTime] = useState(600);
  const [activeTimer, setActiveTimer] = useState(null);
  
  const socketRef = useRef(null);
  const gameRef = useRef(null);
  const fullGameRef = useRef(null);
  const movesHistoryRef = useRef([]);

  useEffect(() => {
    let isMounted = true;

    const newSocket = io(`${import.meta.env.VITE_API_URL}`, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      auth: {}
    });
    socketRef.current = newSocket;

    newSocket.on('connect', () => {
      console.log('✅ Spectator socket connected');
      setTimeout(() => {
        if (isMounted && socketRef.current) {
          socketRef.current.emit('join-spectator', gameId);
          console.log(`📡 Joined spectator room for game: ${gameId}`);
        }
      }, 500);
    });

    newSocket.on('spectator-update', (data) => {
      console.log('📡 Spectator update received:', data);
      
      if (data.gameId === gameId && isMounted) {
        if (isLiveMode) {
          const newGame = new Chess();
          if (data.fen !== 'start') {
            newGame.load(data.fen);
          }
          fullGameRef.current = newGame;
          movesHistoryRef.current = data.moves || [];
          setMoveHistory(data.moves || []);
          goToMove(data.moves?.length || 0);
        }
      }
    });

    // Listen for time sync updates
    newSocket.on('time-sync', (data) => {
      console.log('⏰ Time sync received:', data);
      setWhiteTime(data.whiteTime);
      setBlackTime(data.blackTime);
      setActiveTimer(data.activeTimer);
    });

    newSocket.on('game-over', (data) => {
      console.log('🏆 Game over received:', data);
      if (data.gameId === gameId && isMounted) {
        setGameOver(true);
        setGameWinner(data.winner);
        setGameResult(data);
        
        if (data.winner === 'draw') {
          toast.info(`Game ended in a draw! (${data.reason}) - 4 points each`);
        } else {
          const winner = data.winner === 'white' ? data.whitePlayer : data.blackPlayer;
          toast.success(`${winner} won by ${data.reason}! (+8 points)`);
        }
      }
    });

    newSocket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });

    fetchGameState();

    return () => {
      isMounted = false;
      if (socketRef.current) {
        socketRef.current.emit('leave-spectator', gameId);
        socketRef.current.disconnect();
      }
    };
  }, [gameId]);

  const fetchGameState = async () => {
    try {
      console.log('🔍 Fetching game state for:', gameId);
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/games/spectate/${gameId}`);
      const data = await response.json();
      
      console.log('📦 Game state received:', data);
      
      if (data.game) {
        const newGame = new Chess();
        if (data.game.fen && data.game.fen !== 'start') {
          newGame.load(data.game.fen);
        }
        fullGameRef.current = newGame;
        movesHistoryRef.current = data.game.moves || [];
        
        setWhitePlayer(data.game.whitePlayer);
        setBlackPlayer(data.game.blackPlayer);
        setMoveHistory(data.game.moves || []);
        
        goToMove(data.game.moves?.length || 0);
        
        toast.success(`Now spectating: ${data.game.whitePlayer} vs ${data.game.blackPlayer}`);
      } else {
        toast.error('Game not found');
        setTimeout(() => onClose(), 2000);
      }
    } catch (error) {
      console.error('Error fetching game:', error);
      toast.error('Failed to load game');
    }
  };

  const goToMove = (moveIndex) => {
    if (!fullGameRef.current) return;
    
    const replayGame = new Chess();
    const moves = movesHistoryRef.current;
    
    for (let i = 0; i < moveIndex && i < moves.length; i++) {
      const move = moves[i];
      try {
        replayGame.move(move);
      } catch(e) {
        console.error('Error replaying move:', e);
      }
    }
    
    setGame(replayGame);
    gameRef.current = replayGame;
    setCurrentMoveIndex(moveIndex);
    setIsLiveMode(moveIndex === moves.length);
  };

  const goToPreviousMove = () => {
    if (currentMoveIndex > 0) {
      goToMove(currentMoveIndex - 1);
    } else {
      toast('Already at first move');
    }
  };

  const goToNextMove = () => {
    if (currentMoveIndex < movesHistoryRef.current.length) {
      goToMove(currentMoveIndex + 1);
    } else {
      toast('Already at latest move');
    }
  };

  const goToFirstMove = () => {
    goToMove(0);
  };

  const goToLastMove = () => {
    goToMove(movesHistoryRef.current.length);
  };

  const toggleLiveMode = () => {
    if (!isLiveMode) {
      goToLastMove();
    }
    setIsLiveMode(!isLiveMode);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!game) {
    return (
      <div className="spectator-modal">
        <div className="spectator-content">
          <div className="loading">Loading game...</div>
        </div>
      </div>
    );
  }

  const totalMoves = movesHistoryRef.current.length;
  const isAtStart = currentMoveIndex === 0;
  const isAtEnd = currentMoveIndex === totalMoves;
  const isWhiteTurn = game.turn() === 'w';

  return (
    <div className="spectator-modal">
      <div className="spectator-content">
        <div className="spectator-header">
          <h2>👁️ Spectating: {whitePlayer} vs {blackPlayer}</h2>
          <button onClick={onClose} className="close-btn">×</button>
        </div>
        
        {/* Timer Display - Chess.com Style */}
        <div className="spectator-timers">
          <div className={`spectator-timer white-timer ${activeTimer === 'white' && !gameOver ? 'active-timer' : ''}`}>
            <div className="timer-label">⚪ {whitePlayer}</div>
            <div className={`timer-value ${whiteTime < 60 ? 'time-warning' : ''}`}>
              {formatTime(whiteTime)}
            </div>
            <div className="timer-bar-container">
              <div 
                className={`timer-bar-fill ${whiteTime < 60 ? 'low-time' : ''}`}
                style={{ width: `${(whiteTime / 600) * 100}%` }}
              ></div>
            </div>
          </div>
          
          <div className="vs-divider">VS</div>
          
          <div className={`spectator-timer black-timer ${activeTimer === 'black' && !gameOver ? 'active-timer' : ''}`}>
            <div className="timer-label">⚫ {blackPlayer}</div>
            <div className={`timer-value ${blackTime < 60 ? 'time-warning' : ''}`}>
              {formatTime(blackTime)}
            </div>
            <div className="timer-bar-container">
              <div 
                className={`timer-bar-fill ${blackTime < 60 ? 'low-time' : ''}`}
                style={{ width: `${(blackTime / 600) * 100}%` }}
              ></div>
            </div>
          </div>
        </div>
        
        {/* Turn Indicator */}
        <div className="turn-indicator">
          <span className={`turn-badge ${isWhiteTurn ? 'white-turn' : 'black-turn'}`}>
            {isWhiteTurn ? `${whitePlayer}'s turn` : `${blackPlayer}'s turn`}
          </span>
        </div>
        
        <div className="spectator-board">
          <Chessboard 
            position={game.fen()} 
            boardWidth={550}
            arePiecesDraggable={false}
          />
        </div>
        
        {/* Game Over Notice */}
        {gameOver && (
          <div className="game-over-notice">
            <div className={`game-over-badge ${gameWinner === 'draw' ? 'draw' : (gameWinner === 'white' ? 'white-win' : 'black-win')}`}>
              {gameWinner === 'draw' ? (
                <>🤝 Game Drawn! ({gameResult?.reason})<br/>4 points each</>
              ) : (
                <>🏆 {gameWinner === 'white' ? whitePlayer : blackPlayer} won by {gameResult?.reason}! 🏆<br/>+8 points</>
              )}
            </div>
          </div>
        )}
        
        {/* Move Navigation Controls */}
        <div className="navigation-controls">
          <div className="nav-buttons">
            <button onClick={goToFirstMove} disabled={isAtStart} className="nav-btn" title="First Move">
              ⏮️
            </button>
            <button onClick={goToPreviousMove} disabled={isAtStart} className="nav-btn" title="Previous Move">
              ◀️
            </button>
            <button onClick={goToNextMove} disabled={isAtEnd} className="nav-btn" title="Next Move">
              ▶️
            </button>
            <button onClick={goToLastMove} disabled={isAtEnd} className="nav-btn" title="Last Move">
              ⏭️
            </button>
            <button 
              onClick={toggleLiveMode} 
              className={`live-btn ${isLiveMode ? 'active' : ''}`}
              title={isLiveMode ? 'Live Mode: Auto-updating' : 'Manual Mode: Click to go live'}
            >
              {isLiveMode ? '🔴 Live' : '⚫ Manual'}
            </button>
          </div>
          
          <div className="move-indicator">
            Move: {currentMoveIndex} / {totalMoves}
            {isLiveMode && <span className="live-badge"> Auto-updating...</span>}
          </div>
        </div>
        
        <div className="spectator-info">
          <div className="game-status">
            <strong>Status:</strong> {game.game_over() ? 'Game Over' : 'In Progress'}
            {game.in_check() && !game.game_over() && <span className="check-warning"> ⚠️ CHECK! ⚠️</span>}
          </div>
          
          <div className="move-history">
            <h4>Move History:</h4>
            <div className="move-list">
              {moveHistory.length === 0 ? (
                <p>No moves yet</p>
              ) : (
                moveHistory.map((move, idx) => (
                  <div 
                    key={idx} 
                    className={`move-item ${idx === currentMoveIndex - 1 ? 'current-move' : ''}`}
                    onClick={() => goToMove(idx + 1)}
                  >
                    {Math.floor(idx / 2) + 1}. {move}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SpectatorGame;