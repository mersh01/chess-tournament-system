import React, { useState } from 'react';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';
import toast from 'react-hot-toast';

function ChessBoard() {
  const [game, setGame] = useState(new Chess());
  const [moveHistory, setMoveHistory] = useState([]);
  const [gameStatus, setGameStatus] = useState('active');
  const [selectedSquare, setSelectedSquare] = useState(null);
  const [validMoves, setValidMoves] = useState([]);

  // Handle square click
  const onSquareClick = (square) => {
    // If no square is selected, try to select a piece
    if (selectedSquare === null) {
      const piece = game.get(square);
      
      // Check if there's a piece and it's the current player's turn
      if (piece && piece.color === game.turn()) {
        setSelectedSquare(square);
        
        // Calculate valid moves for this piece
        const moves = game.moves({
          square: square,
          verbose: true
        });
        setValidMoves(moves.map(m => m.to));
      }
    } 
    // If a square is selected, try to move to the clicked square
    else {
      // Check if the clicked square is a valid move
      if (validMoves.includes(square)) {
        // Make the move
        try {
          const move = game.move({
            from: selectedSquare,
            to: square,
            promotion: 'q' // Always promote to queen
          });
          
          if (move) {
            // Update move history
            setMoveHistory(prev => [...prev, move]);
            
            // Check game status after move
            if (game.game_over()) {
              if (game.in_checkmate()) {
                const loser = game.turn() === 'w' ? 'Black' : 'White';
                toast.success(`${loser} is checkmated! Game Over! 🎉`);
                setGameStatus('checkmate');
              } else if (game.in_stalemate()) {
                toast.info('Stalemate! Game drawn.');
                setGameStatus('stalemate');
              } else if (game.in_threefold_repetition()) {
                toast.info('Threefold repetition! Game drawn.');
                setGameStatus('draw');
              }
            } else if (game.in_check()) {
              toast(`${game.turn() === 'w' ? 'White' : 'Black'} is in check!`, {
                icon: '⚠️'
              });
            }
          }
        } catch (error) {
          console.error('Invalid move:', error);
        }
      }
      
      // Clear selection regardless of valid move or not
      setSelectedSquare(null);
      setValidMoves([]);
    }
  };

  // Custom square styling to show selected piece and valid moves
  const customSquareStyles = () => {
    const styles = {};
    
    // Highlight selected square
    if (selectedSquare) {
      styles[selectedSquare] = {
        backgroundColor: 'rgba(255, 255, 0, 0.4)',
        boxShadow: 'inset 0 0 0 2px gold',
        borderRadius: '4px'
      };
    }
    
    // Highlight valid move squares
    validMoves.forEach(square => {
      const pieceAtSquare = game.get(square);
      
      // If square has an opponent piece, show as capture move
      if (pieceAtSquare && pieceAtSquare.color !== game.turn()) {
        styles[square] = {
          backgroundColor: 'rgba(255, 0, 0, 0.3)',
          borderRadius: '50%',
          position: 'relative',
          boxShadow: 'inset 0 0 0 2px red'
        };
      } 
      // Empty square - show as green dot
      else {
        styles[square] = {
          background: 'radial-gradient(circle, rgba(0,255,0,0.3) 25%, transparent 25%)',
          backgroundSize: '100% 100%'
        };
      }
    });
    
    return styles;
  };

  const resetGame = () => {
    setGame(new Chess());
    setMoveHistory([]);
    setGameStatus('active');
    setSelectedSquare(null);
    setValidMoves([]);
    toast.success('New game started!');
  };

  const undoMove = () => {
    if (moveHistory.length > 0) {
      game.undo();
      setMoveHistory(moveHistory.slice(0, -1));
      setGameStatus('active');
      setSelectedSquare(null);
      setValidMoves([]);
      toast('Move undone', { icon: '↩️' });
    } else {
      toast.error('No moves to undo!');
    }
  };

  const getStatusText = () => {
    if (game.in_checkmate()) {
      return `Checkmate! ${game.turn() === 'w' ? 'Black' : 'White'} wins!`;
    }
    if (game.in_check()) {
      return `${game.turn() === 'w' ? 'White' : 'Black'} is in check!`;
    }
    if (game.in_stalemate()) {
      return 'Stalemate! Game drawn.';
    }
    if (gameStatus === 'draw') {
      return 'Game drawn!';
    }
    return `${game.turn() === 'w' ? 'White' : 'Black'} to move`;
  };

  return (
    <div className="chess-container">
      <h2>♟️ Play Chess</h2>
      <p style={{ marginBottom: '1rem', color: '#666', fontSize: '0.9rem' }}>
        💡 Tip: Click on a piece to see valid moves, then click on a highlighted square to move
      </p>
      
      <div className="board-wrapper">
        <Chessboard 
          position={game.fen()} 
          onSquareClick={onSquareClick}
          boardWidth={550}
          customSquareStyles={customSquareStyles()}
          customDarkSquareStyle={{ backgroundColor: '#b58863' }}
          customLightSquareStyle={{ backgroundColor: '#f0d9b5' }}
        />
      </div>
      
      <div className="game-info">
        <h3>Game Status: <span style={{ color: '#667eea' }}>{getStatusText()}</span></h3>
        
        <div style={{ display: 'flex', gap: '1rem', margin: '1rem 0', justifyContent: 'center' }}>
          <button 
            onClick={resetGame} 
            style={{
              background: '#10b981',
              color: 'white',
              border: 'none',
              padding: '0.75rem 1.5rem',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '1rem'
            }}
          >
            New Game
          </button>
          <button 
            onClick={undoMove} 
            style={{
              background: '#6b7280',
              color: 'white',
              border: 'none',
              padding: '0.75rem 1.5rem',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '1rem'
            }}
          >
            Undo Move
          </button>
        </div>
        
        <div className="move-history">
          <h4>Move History:</h4>
          <div className="move-list">
            {moveHistory.length === 0 ? (
              <p style={{ color: '#999', textAlign: 'center' }}>No moves yet</p>
            ) : (
              moveHistory.map((move, idx) => (
                <div key={idx} className="move-item">
                  {Math.floor(idx / 2) + 1}. {move.san}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ChessBoard;