import React, { useState, useEffect, useRef } from 'react';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

function OnlineChessGame({ gameData, onGameEnd }) {
  const [game, setGame] = useState(null);
  const [myColor, setMyColor] = useState(null);
  const [opponent, setOpponent] = useState(null);
  const [selectedSquare, setSelectedSquare] = useState(null);
  const [validMoves, setValidMoves] = useState([]);
  const [isProcessingMove, setIsProcessingMove] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState(null);
  const [showGameOverModal, setShowGameOverModal] = useState(false);
  const [checkSquares, setCheckSquares] = useState([]);
  const [moveHistory, setMoveHistory] = useState([]);
  const [gameResult, setGameResult] = useState(null);
  const [currentMoveIndex, setCurrentMoveIndex] = useState(-1);
  const [isReviewMode, setIsReviewMode] = useState(false);
  
  // Timer states - synced from server
  const [whiteTime, setWhiteTime] = useState(600);
  const [blackTime, setBlackTime] = useState(600);
  const [activeTimer, setActiveTimer] = useState(null);
  const timerIntervalRef = useRef(null);
  const lastServerTimeRef = useRef(null);
  
  const { socket, user } = useAuth();
  const gameRef = useRef(null);
  const gameIdRef = useRef(null);
  const fullGameRef = useRef(null);
  const movesHistoryRef = useRef([]);

  // Timer effect - only runs locally for visual countdown, but synced with server
  useEffect(() => {
    if (gameOver || !activeTimer || isReviewMode) return;
    
    // Clear any existing interval
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }
    
    timerIntervalRef.current = setInterval(() => {
      // Request time sync from server every second
      socket.emit('sync-time', { gameId: gameIdRef.current });
    }, 1000);
    
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [activeTimer, gameOver, isReviewMode, socket]);

  // Listen for time sync from server
  useEffect(() => {
    if (!socket) return;
    
    const handleTimeSync = ({ whiteTime: serverWhiteTime, blackTime: serverBlackTime, activeTimer: serverActiveTimer }) => {
      setWhiteTime(serverWhiteTime);
      setBlackTime(serverBlackTime);
      setActiveTimer(serverActiveTimer);
      lastServerTimeRef.current = Date.now();
    };
    
    socket.on('time-sync', handleTimeSync);
    
    return () => {
      socket.off('time-sync', handleTimeSync);
    };
  }, [socket]);

  const handleTimeOut = (color) => {
    const timeOutWinner = color === 'white' ? 'black' : 'white';
    setGameOver(true);
    setWinner(timeOutWinner);
    
    const pointsEarned = timeOutWinner === myColor ? 8 : 0;
    
    if (timeOutWinner === myColor) {
      toast.success(`🎉 Opponent ran out of time! You won! +8 points! 🎉`);
    } else {
      toast.error(`You ran out of time! You lost!`);
    }
    
    setGameResult({ winner: timeOutWinner, reason: 'timeout', points: pointsEarned });
    setShowGameOverModal(true);
    
    socket.emit('game-timeout', { 
      gameId: gameIdRef.current, 
      loser: color,
      winner: timeOutWinner
    });
    
    setTimeout(() => onGameEnd(), 3000);
  };

  // Initialize game from gameData
  useEffect(() => {
    if (gameData) {
      const newGame = new Chess();
      if (gameData.fen && gameData.fen !== 'start') {
        try {
          newGame.load(gameData.fen);
        } catch(e) { console.error('Invalid FEN'); }
      }
      setGame(newGame);
      gameRef.current = newGame;
      fullGameRef.current = newGame;
      setMyColor(gameData.color);
      setOpponent(gameData.opponent);
      gameIdRef.current = gameData.gameId;
      setGameOver(false);
      setWinner(null);
      setMoveHistory(gameData.moves || []);
      movesHistoryRef.current = gameData.moves || [];
      setCurrentMoveIndex(gameData.moves?.length || 0);
      
      // Request initial time sync
      if (socket) {
        socket.emit('sync-time', { gameId: gameData.gameId });
      }
      
      toast.success(`Game started! You are ${gameData.color}`);
    }
  }, [gameData]);
// Add this to OnlineChessGame.jsx to notify parent of active game
// Save game state to sessionStorage for recovery on refresh
useEffect(() => {
  if (gameData && !gameOver && game) {
    const savedState = {
      gameId: gameData.gameId,
      color: myColor,
      opponent: opponent,
      fen: game.fen(),
      moves: moveHistory,
      timestamp: Date.now()
    };
    sessionStorage.setItem('activeGame', JSON.stringify(savedState));
    console.log('Game state saved to sessionStorage');
  }
  
  return () => {
    if (gameOver) {
      sessionStorage.removeItem('activeGame');
    }
  };
}, [gameData, gameOver, myColor, opponent, game, moveHistory]);  // Socket event listeners
  useEffect(() => {
    if (!socket) return;

    const handleOpponentMove = ({ from, to, whiteTime: oppWhiteTime, blackTime: oppBlackTime, activeTimer: oppActiveTimer }) => {
      if (gameRef.current && !gameOver && !isReviewMode) {
        try {
          gameRef.current.move({ from, to, promotion: 'q' });
          setGame(new Chess(gameRef.current.fen()));
          fullGameRef.current = gameRef.current;
          setMoveHistory(gameRef.current.history());
          movesHistoryRef.current = gameRef.current.history();
          setCurrentMoveIndex(gameRef.current.history().length);
          checkForCheck(gameRef.current);
          
          // Update timers from server
          setWhiteTime(oppWhiteTime);
          setBlackTime(oppBlackTime);
          setActiveTimer(oppActiveTimer);
          
          toast(`${opponent} moved: ${from}→${to}`);
          
          if (gameRef.current.game_over()) {
            handleGameEnd();
          }
        } catch(err) {
          console.error('Error applying opponent move:', err);
        }
      }
    };
    
    const handleMoveConfirmed = ({ from, to, whiteTime: newWhiteTime, blackTime: newBlackTime, activeTimer: newActiveTimer }) => {
      setIsProcessingMove(false);
      checkForCheck(gameRef.current);
      setMoveHistory(gameRef.current?.history() || []);
      movesHistoryRef.current = gameRef.current?.history() || [];
      setCurrentMoveIndex(gameRef.current?.history().length || 0);
      
      setWhiteTime(newWhiteTime);
      setBlackTime(newBlackTime);
      setActiveTimer(newActiveTimer);
      
      if (gameRef.current && gameRef.current.game_over()) {
        handleGameEnd();
      }
    };
    
    const handleMoveError = (error) => {
      toast.error(error);
      setIsProcessingMove(false);
    };
    
    const handleGameOverEvent = ({ winner: gameWinner, reason, result }) => {
      setGameOver(true);
      setWinner(gameWinner);
      
      let pointsEarned = 0;
      if (gameWinner === myColor) {
        pointsEarned = 8;
        toast.success(`🎉 You won by ${reason}! +${pointsEarned} points! 🎉`);
      } else if (gameWinner === 'draw') {
        pointsEarned = 4;
        toast.info(`Game ended in a draw! +${pointsEarned} points each`);
      } else {
        pointsEarned = 0;
        toast.error(`You lost by ${reason}!`);
      }
      
      setGameResult({ winner: gameWinner, reason, points: pointsEarned, result });
      setShowGameOverModal(true);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
    
    socket.on('opponent-move', handleOpponentMove);
    socket.on('move-confirmed', handleMoveConfirmed);
    socket.on('move-error', handleMoveError);
    socket.on('game-over', handleGameOverEvent);
    
    return () => {
      socket.off('opponent-move', handleOpponentMove);
      socket.off('move-confirmed', handleMoveConfirmed);
      socket.off('move-error', handleMoveError);
      socket.off('game-over', handleGameOverEvent);
    };
  }, [socket, gameOver, opponent, myColor, isReviewMode]);

  const checkForCheck = (chessGame) => {
    if (!chessGame) return;
    
    const kingColor = chessGame.turn();
    const board = chessGame.board();
    let kingPos = null;
    
    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 8; j++) {
        const piece = board[i][j];
        if (piece && piece.type === 'k' && piece.color === kingColor) {
          const file = String.fromCharCode(97 + j);
          const rank = 8 - i;
          kingPos = `${file}${rank}`;
          break;
        }
      }
    }
    
    if (chessGame.in_check()) {
      setCheckSquares([kingPos]);
    } else {
      setCheckSquares([]);
    }
  };

  // Update the handleGameEnd function to clear sessionStorage
const handleGameEnd = () => {
  const chessGame = gameRef.current;
  if (!chessGame) return;
  
  let gameWinner = null;
  let reason = '';
  
  if (chessGame.in_checkmate()) {
    const loserColor = chessGame.turn();
    gameWinner = loserColor === 'w' ? 'black' : 'white';
    reason = 'checkmate';
  } else if (chessGame.in_stalemate()) {
    gameWinner = 'draw';
    reason = 'stalemate';
  } else if (chessGame.in_threefold_repetition()) {
    gameWinner = 'draw';
    reason = 'threefold repetition';
  }
  
  setGameOver(true);
  setWinner(gameWinner);
  setShowGameOverModal(true);
  if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
  
  // Clear sessionStorage when game ends
  sessionStorage.removeItem('activeGame');
  
  socket.emit('game-ended', { 
    gameId: gameIdRef.current, 
    winner: gameWinner, 
    reason 
  });
};

  const onSquareClick = (square) => {
    if (isReviewMode) {
      toast.error("Exit review mode to continue playing");
      return;
    }
    
    if (gameOver || isProcessingMove) {
      if (gameOver) toast.error('Game is over!');
      else toast.error('Please wait...');
      return;
    }
    
    if (!gameRef.current) return;
    
    const turn = gameRef.current.turn();
    const isMyTurn = (turn === 'w' && myColor === 'white') || (turn === 'b' && myColor === 'black');
    
    if (!isMyTurn) {
      toast.error("Not your turn!");
      return;
    }
    
    if (selectedSquare === null) {
      const piece = gameRef.current.get(square);
      if (piece && ((piece.color === 'w' && myColor === 'white') || 
                    (piece.color === 'b' && myColor === 'black'))) {
        setSelectedSquare(square);
        const moves = gameRef.current.moves({ square, verbose: true });
        setValidMoves(moves.map(m => m.to));
        toast(`Selected ${piece.type} at ${square}`);
      }
      return;
    }
    
    if (validMoves.includes(square)) {
      setIsProcessingMove(true);
      
      const move = gameRef.current.move({ 
        from: selectedSquare, 
        to: square, 
        promotion: 'q' 
      });
      
      if (move) {
        setGame(new Chess(gameRef.current.fen()));
        fullGameRef.current = gameRef.current;
        setMoveHistory(gameRef.current.history());
        movesHistoryRef.current = gameRef.current.history();
        setCurrentMoveIndex(gameRef.current.history().length);
        
        socket.emit('make-move', {
          gameId: gameIdRef.current,
          from: selectedSquare,
          to: square,
          fen: gameRef.current.fen(),
          whiteTime: whiteTime,
          blackTime: blackTime,
          activeTimer: activeTimer
        });
        
        toast.success(`You moved: ${selectedSquare}→${square}`);
        
        if (gameRef.current.game_over()) {
          handleGameEnd();
        } else {
          checkForCheck(gameRef.current);
        }
      } else {
        setIsProcessingMove(false);
        toast.error('Invalid move');
      }
    } else {
      toast.error('Not a valid move');
    }
    
    setSelectedSquare(null);
    setValidMoves([]);
  };

  // Navigation functions
  const goToMove = (moveIndex) => {
    if (!fullGameRef.current) return;
    
    setIsReviewMode(true);
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    
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
    checkForCheck(replayGame);
  };

  const goToPreviousMove = () => {
    if (currentMoveIndex > 0) {
      goToMove(currentMoveIndex - 1);
    }
  };

  const goToNextMove = () => {
    if (currentMoveIndex < movesHistoryRef.current.length) {
      goToMove(currentMoveIndex + 1);
    }
  };

  const exitReviewMode = () => {
    setIsReviewMode(false);
    if (fullGameRef.current) {
      setGame(fullGameRef.current);
      gameRef.current = fullGameRef.current;
      setCurrentMoveIndex(movesHistoryRef.current.length);
      checkForCheck(fullGameRef.current);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const customSquareStyles = () => {
    const styles = {};
    
    if (selectedSquare) {
      styles[selectedSquare] = {
        backgroundColor: 'rgba(255, 255, 0, 0.4)',
        boxShadow: 'inset 0 0 0 3px gold',
        borderRadius: '4px'
      };
    }
    
    checkSquares.forEach(square => {
      styles[square] = {
        backgroundColor: 'rgba(255, 0, 0, 0.5)',
        boxShadow: 'inset 0 0 0 3px red',
        borderRadius: '4px',
        animation: 'pulse 0.5s ease-in-out infinite alternate'
      };
    });
    
    validMoves.forEach(square => {
      const pieceAtSquare = gameRef.current?.get(square);
      if (pieceAtSquare && pieceAtSquare.color !== (myColor === 'white' ? 'w' : 'b')) {
        styles[square] = {
          backgroundColor: 'rgba(255, 0, 0, 0.3)',
          borderRadius: '50%',
          boxShadow: 'inset 0 0 0 2px red'
        };
      } else if (!pieceAtSquare) {
        styles[square] = {
          background: 'radial-gradient(circle, rgba(0,255,0,0.4) 25%, transparent 25%)',
          backgroundSize: '100% 100%'
        };
      }
    });
    
    return styles;
  };

  const getStatusText = () => {
    if (gameOver) {
      if (winner === 'draw') return "Game ended in a draw!";
      const iWon = (winner === 'white' && myColor === 'white') || (winner === 'black' && myColor === 'black');
      return iWon ? "🎉 You won! 🎉" : "😢 You lost! 😢";
    }
    if (isReviewMode) return "📹 Review Mode - Not playing";
    if (!gameRef.current) return 'Loading...';
    if (gameRef.current.in_checkmate()) return 'Checkmate! Game over!';
    if (gameRef.current.in_check()) return '⚠️ CHECK! ⚠️';
    const isMyTurn = (gameRef.current.turn() === 'w' && myColor === 'white') || 
                     (gameRef.current.turn() === 'b' && myColor === 'black');
    return isMyTurn ? "✨ Your turn - Click a piece" : `⏳ Waiting for ${opponent}...`;
  };

  const resignGame = () => {
    if (window.confirm('Are you sure you want to resign?')) {
      socket.emit('resign-game', { gameId: gameIdRef.current });
      toast('You resigned the game');
      setGameOver(true);
      setShowGameOverModal(true);
      setWinner(myColor === 'white' ? 'black' : 'white');
      setGameResult({ winner: myColor === 'white' ? 'black' : 'white', reason: 'resignation', points: 0 });
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      setTimeout(() => onGameEnd(), 3000);
    }
  };

  const closeGameOverModal = () => {
    setShowGameOverModal(false);
    onGameEnd();
  };

  if (!game) return <div className="loading">Loading game...</div>;

  const myTime = myColor === 'white' ? whiteTime : blackTime;
  const opponentTime = myColor === 'white' ? blackTime : whiteTime;
  const isMyTimerActive = activeTimer === myColor && !gameOver && !isReviewMode;
  const totalMoves = movesHistoryRef.current.length;

  return (
    <div className="online-game-container">
      {showGameOverModal && (
        <div className="game-over-modal">
          <div className="game-over-content">
            {winner === 'draw' ? (
              <>
                <div className="game-over-icon">🤝</div>
                <h2>Game Drawn!</h2>
                <p>The game ended in a draw</p>
                <p className="points-earned">+4 points each!</p>
              </>
            ) : (
              <>
                <div className="game-over-icon">{winner === myColor ? '🏆' : '😢'}</div>
                <h2>{winner === myColor ? 'You Won!' : 'You Lost!'}</h2>
                <p>{winner === myColor ? 'Congratulations!' : 'Better luck next time!'}</p>
                <p className="points-earned">
                  {winner === myColor ? '+8 points earned!' : '0 points earned'}
                </p>
              </>
            )}
            <button onClick={closeGameOverModal} className="modal-close-btn">
              Return to Lobby
            </button>
          </div>
        </div>
      )}
      
      {/* Opponent Section */}
      <div className="player-section opponent">
        <div className="player-avatar">
          <div className="avatar-icon">👤</div>
          <div className="player-details">
            <span className="player-name">{opponent}</span>
            <span className="player-rating">Rating: {user?.rating || 1200}</span>
          </div>
        </div>
        <div className={`timer ${activeTimer !== myColor && !gameOver && !isReviewMode ? 'active-timer' : ''}`}>
          <div className={`timer-bar ${opponentTime < 60 ? 'low-time' : ''}`} style={{ width: `${(opponentTime / 600) * 100}%` }}></div>
          <span className={`timer-time ${opponentTime < 60 ? 'time-warning' : ''}`}>{formatTime(opponentTime)}</span>
        </div>
      </div>
      
      {/* Chess Board */}
      <div className="board-wrapper">
        <Chessboard 
          position={game.fen()} 
          onSquareClick={onSquareClick}
          boardWidth={550}
          boardOrientation={myColor === 'white' ? 'white' : 'black'}
          customSquareStyles={customSquareStyles()}
        />
      </div>
      
      {/* Move Navigation Arrows */}
      <div className="move-navigation">
        <button 
          onClick={goToPreviousMove} 
          disabled={currentMoveIndex <= 0}
          className="nav-arrow"
          title="Previous Move"
        >
          ◀
        </button>
        <div className="move-info">
          {isReviewMode ? (
            <span className="review-badge">Reviewing Move {currentMoveIndex}/{totalMoves}</span>
          ) : (
            <span className="move-count">Move {totalMoves}</span>
          )}
        </div>
        <button 
          onClick={goToNextMove} 
          disabled={currentMoveIndex >= totalMoves}
          className="nav-arrow"
          title="Next Move"
        >
          ▶
        </button>
        {isReviewMode && (
          <button onClick={exitReviewMode} className="exit-review-btn" title="Exit Review Mode">
            Exit Review
          </button>
        )}
      </div>
      
      {/* Player Section (You) */}
      <div className="player-section you">
        <div className="player-avatar">
          <div className="avatar-icon">👤</div>
          <div className="player-details">
            <span className="player-name">{user?.username} (You)</span>
            <span className="player-rating">Rating: {user?.rating}</span>
          </div>
        </div>
        <div className={`timer ${activeTimer === myColor && !gameOver && !isReviewMode ? 'active-timer' : ''}`}>
          <div className={`timer-bar ${myTime < 60 ? 'low-time' : ''}`} style={{ width: `${(myTime / 600) * 100}%` }}></div>
          <span className={`timer-time ${myTime < 60 ? 'time-warning' : ''}`}>{formatTime(myTime)}</span>
        </div>
      </div>
      
      <div className="game-status">
        <h3 className={gameRef.current?.in_check() ? 'check-status' : ''}>
          {getStatusText()}
        </h3>
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
      
      {!gameOver && !isReviewMode && (
        <button onClick={resignGame} className="resign-button">
          Resign Game
        </button>
      )}
    </div>
  );
}

export default OnlineChessGame;