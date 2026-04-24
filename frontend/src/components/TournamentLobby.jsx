import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

function TournamentLobby({ tournamentId, onStartGame }) {
  const [players, setPlayers] = useState([]);
  const [waiting, setWaiting] = useState(false);
  const [tournament, setTournament] = useState(null);
  const [checkingGame, setCheckingGame] = useState(true);
  const { socket, user } = useAuth();

  // Check for existing active game when component mounts
  useEffect(() => {
    const checkExistingGame = async () => {
      if (!user?.id) {
        setCheckingGame(false);
        return;
      }
      
      try {
        const token = localStorage.getItem('token');
        console.log('Checking for existing game...');
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/games/active/${user.id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await response.json();
        
        if (data.game) {
          console.log('Found existing game:', data.game);
          toast.success(`Reconnecting to your game against ${data.game.opponent}`);
          onStartGame(data.game);
          return;
        }
      } catch (error) {
        console.error('Error checking existing game:', error);
      } finally {
        setCheckingGame(false);
      }
    };
    
    checkExistingGame();
  }, [user?.id]);

  // Also check via socket
  useEffect(() => {
    if (socket && !checkingGame) {
      socket.emit('check-existing-game');
      
      socket.on('game-restore', (gameData) => {
        console.log('Game restore received:', gameData);
        toast.success(`Reconnecting to game against ${gameData.opponent}`);
        onStartGame(gameData);
      });
      
      return () => {
        socket.off('game-restore');
      };
    }
  }, [socket, checkingGame]);

  useEffect(() => {
    if (socket && tournamentId && !checkingGame) {
      socket.emit('join-lobby', tournamentId);
      
      socket.on('waiting', (data) => {
        toast(data.message);
      });
      
      socket.on('game-start', (gameData) => {
        console.log('Game start received:', gameData);
        setWaiting(false);
        toast.success(`Game starting! You are playing against ${gameData.opponent}`);
        onStartGame(gameData);
      });
      
      fetchPlayers();
      fetchTournament();
    }
    
    return () => {
      if (socket) {
        socket.off('game-start');
        socket.off('waiting');
      }
    };
  }, [socket, tournamentId, checkingGame]);

  const fetchTournament = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/public/tournament/${tournamentId}`);
      const data = await res.json();
      setTournament(data);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const fetchPlayers = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/tournaments/${tournamentId}/participants`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      setPlayers(data);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const findMatch = () => {
    setWaiting(true);
    socket.emit('find-match');
    toast.success('Searching for opponent...');
  };

  const cancelSearch = () => {
    setWaiting(false);
    socket.emit('cancel-search');
    toast('Search cancelled');
  };

  if (checkingGame) {
    return <div className="loading">Checking for active game...</div>;
  }

  return (
    <div className="tournament-lobby">
      <h2>🎮 Tournament Lobby</h2>
      
      {tournament && (
        <div className="tournament-info-box">
          <h3>{tournament.name}</h3>
          <p>Status: {tournament.status}</p>
        </div>
      )}
      
      <div className="players-section">
        <h3>Players in Tournament ({players.length})</h3>
        <div className="players-grid">
          {players.map(p => (
            <div key={p.userId._id} className={`player-card ${p.userId._id === user?.id ? 'current-user' : ''}`}>
              <strong>{p.userId.username}</strong>
              <span>Rating: {p.userId.rating}</span>
              <span>{p.userId.online ? '🟢 Online' : '⚫ Offline'}</span>
              {p.userId._id === user?.id && <span className="you-badge">You</span>}
            </div>
          ))}
        </div>
      </div>
      
      <div className="matchmaking-section">
        {waiting ? (
          <div className="waiting-container">
            <div className="spinner"></div>
            <p>Looking for opponent...</p>
            <button onClick={cancelSearch} className="cancel-btn">Cancel</button>
          </div>
        ) : (
          <button onClick={findMatch} className="find-match-btn">Find Match</button>
        )}
      </div>
      
      <div className="lobby-info">
        <h4>How to Play:</h4>
        <ol>
          <li>Click "Find Match" to search for an opponent</li>
          <li>When another player also clicks, you'll be paired</li>
          <li>The game starts automatically for both players</li>
          <li>Click on your pieces to see valid moves (green dots)</li>
          <li>Click on a highlighted square to move</li>
          <li>White moves first!</li>
        </ol>
      </div>
    </div>
  );
}

export default TournamentLobby;