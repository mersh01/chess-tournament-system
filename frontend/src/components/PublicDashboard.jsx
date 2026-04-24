import React, { useState, useEffect } from 'react';
import axios from 'axios';
import io from 'socket.io-client';
import { useAuth } from '../context/AuthContext';
import SpectatorGame from './SpectatorGame';

function PublicDashboard({ onPlayClick }) {
  const [tournaments, setTournaments] = useState([]);
  const [pastChampions, setPastChampions] = useState([]);
  const [liveGames, setLiveGames] = useState([]);
  const [selectedTournament, setSelectedTournament] = useState(null);
  const [loading, setLoading] = useState(true);
  const [socket, setSocket] = useState(null);
  const [spectatingGame, setSpectatingGame] = useState(null);
  const { user } = useAuth();

  // Connect to socket for live updates
  useEffect(() => {
    const newSocket = io(`${import.meta.env.VITE_API_URL}`, {
      transports: ['websocket'],
      autoConnect: true
    });
    setSocket(newSocket);
    
    newSocket.on('connect', () => {
      console.log('Socket connected for live updates');
    });
    
    newSocket.on('live-game-update', (gameUpdate) => {
      console.log('Live game update received:', gameUpdate);
      
      setLiveGames(prevGames => {
        const existingIndex = prevGames.findIndex(g => g.gameId === gameUpdate.gameId);
        
        if (gameUpdate.isGameOver) {
          return prevGames.filter(g => g.gameId !== gameUpdate.gameId);
        }
        
        const newGame = {
          gameId: gameUpdate.gameId,
          whitePlayer: gameUpdate.whitePlayer,
          blackPlayer: gameUpdate.blackPlayer,
          lastMove: gameUpdate.lastMove,
          moves: gameUpdate.moveCount,
          fen: gameUpdate.fen
        };
        
        if (existingIndex >= 0) {
          const updated = [...prevGames];
          updated[existingIndex] = newGame;
          return updated;
        } else {
          return [newGame, ...prevGames];
        }
      });
    });
    
    return () => {
      newSocket.disconnect();
    };
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      await Promise.all([
        fetchTournaments(),
        fetchChampions(),
        fetchLiveGames()
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTournaments = async () => {
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/public/tournaments`);
      console.log('Tournaments:', response.data);
      setTournaments(response.data);
    } catch (error) {
      console.error('Error fetching tournaments:', error);
    }
  };

  const fetchChampions = async () => {
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/public/champions`);
      setPastChampions(response.data);
    } catch (error) {
      console.error('Error fetching champions:', error);
    }
  };

  const fetchLiveGames = async () => {
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/public/active-games`);
      console.log('Live games:', response.data);
      setLiveGames(response.data);
    } catch (error) {
      console.error('Error fetching live games:', error);
    }
  };

  const viewTournamentDetails = async (tournament) => {
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/public/tournament/${tournament._id}`);
      setSelectedTournament(response.data);
    } catch (error) {
      console.error('Error fetching tournament details:', error);
    }
  };

  // Define spectateGame function here (outside of useEffect)
  const spectateGame = (gameId) => {
    console.log('Spectating game:', gameId);
    setSpectatingGame(gameId);
  };

  const closeSpectator = () => {
    setSpectatingGame(null);
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="public-dashboard">
      {/* Spectator Modal */}
      {spectatingGame && (
        <SpectatorGame 
          gameId={spectatingGame} 
          onClose={closeSpectator} 
        />
      )}

      {/* Hero Section */}
      <div className="hero-section">
        <h1>♟️ Online Chess Tournament Platform</h1>
        <p>Join tournaments, play with players worldwide, and become a champion!</p>
        <button onClick={onPlayClick} className="play-now-btn">
          Play Now →
        </button>
      </div>

      {/* Live Games Section */}
      <div className="section">
        <h2>🎬 Live Games {liveGames.length > 0 && `(${liveGames.length})`}</h2>
        {liveGames.length === 0 ? (
          <div className="no-data">No live games at the moment. Start a game to see it here!</div>
        ) : (
          <div className="live-games-grid">
            {liveGames.map(game => (
              <div key={game.gameId} className="live-game-card">
                <div className="game-players">
                  <span className="player white">⚪ {game.whitePlayer}</span>
                  <span className="vs">vs</span>
                  <span className="player black">⚫ {game.blackPlayer}</span>
                </div>
                <div className="game-info">
                  <span>📊 Moves: {game.moves}</span>
                  {game.lastMove && <span>🔹 Last: {game.lastMove}</span>}
                </div>
                <button 
                  onClick={() => spectateGame(game.gameId)} 
                  className="spectate-btn"
                >
                  👁️ Spectate Live
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Active Tournaments (Registration Open) */}
      <div className="section">
        <h2>🎯 Active Tournaments (Open for Registration)</h2>
        <div className="tournament-grid">
          {tournaments.filter(t => t.status === 'registration').length === 0 ? (
            <div className="no-data">No active tournaments for registration</div>
          ) : (
            tournaments.filter(t => t.status === 'registration').map(tournament => (
              <div key={tournament._id} className="tournament-card" onClick={() => viewTournamentDetails(tournament)}>
                <h3>{tournament.name}</h3>
                <p>📋 Type: {tournament.type}</p>
                <p>👥 Players: {tournament.currentPlayers || 0}/{tournament.maxPlayers}</p>
                <p>💰 Prize Pool: ${tournament.prizePool}</p>
                <p>📅 Starts: {new Date(tournament.startDate).toLocaleDateString()}</p>
                <div className="tournament-footer">
                  <span className="status-badge status-registration">Open for Registration</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Ongoing Tournaments (In Progress) */}
      <div className="section">
        <h2>⚡ Ongoing Tournaments (In Progress)</h2>
        <div className="tournament-grid">
          {tournaments.filter(t => t.status === 'ongoing').length === 0 ? (
            <div className="no-data">No ongoing tournaments</div>
          ) : (
            tournaments.filter(t => t.status === 'ongoing').map(tournament => (
              <div key={tournament._id} className="tournament-card ongoing" onClick={() => viewTournamentDetails(tournament)}>
                <h3>{tournament.name}</h3>
                <p>📋 Type: {tournament.type}</p>
                <p>👥 Players: {tournament.currentPlayers}</p>
                <div className="tournament-footer">
                  <span className="status-badge status-ongoing">In Progress</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Past Champions */}
      <div className="section">
        <h2>🏆 Past Champions</h2>
        <div className="champions-grid">
          {pastChampions.length === 0 ? (
            <div className="no-data">No past champions yet</div>
          ) : (
            pastChampions.map(champion => (
              <div key={champion.tournamentId} className="champion-card">
                <div className="trophy">🏆</div>
                <h3>{champion.tournamentName}</h3>
                <p className="champion-name">Winner: {champion.winnerName}</p>
                <p>Score: {champion.score}</p>
                <p>Date: {new Date(champion.date).toLocaleDateString()}</p>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Tournament Details Modal */}
      {selectedTournament && (
        <div className="modal" onClick={() => setSelectedTournament(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>{selectedTournament.name}</h2>
            <button className="close-btn" onClick={() => setSelectedTournament(null)}>×</button>
            <div className="tournament-details">
              <p><strong>Type:</strong> {selectedTournament.type}</p>
              <p><strong>Players:</strong> {selectedTournament.players}/{selectedTournament.maxPlayers}</p>
              <p><strong>Entry Fee:</strong> ${selectedTournament.entryFee}</p>
              <p><strong>Prize Pool:</strong> ${selectedTournament.prizePool}</p>
              <p><strong>Start Date:</strong> {new Date(selectedTournament.startDate).toLocaleDateString()}</p>
              <p><strong>Description:</strong> {selectedTournament.description}</p>
              
              {selectedTournament.standings && selectedTournament.standings.length > 0 && (
                <div className="standings">
                  <h3>Current Standings</h3>
                  <table>
                    <thead>
                      <tr>
                        <th>Rank</th>
                        <th>Player</th>
                        <th>Score</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedTournament.standings.map((player, idx) => (
                        <tr key={idx}>
                          <td>{idx+1}</td>
                          <td>{player.name}</td>
                          <td>{player.score}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PublicDashboard;