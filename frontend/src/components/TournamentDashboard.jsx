import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

const API_URL = `${import.meta.env.VITE_API_URL}`;

function TournamentDashboard() {
  const [tournament, setTournament] = useState(null);
  const [players, setPlayers] = useState([]);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTournamentData();
  }, []);

  const fetchTournamentData = async () => {
    try {
      // In a real app, these would be actual API calls
      // For now, using mock data
      const mockTournament = {
        id: 1,
        name: "Chess Championship 2026",
        type: "Swiss System",
        status: "ongoing",
        currentRound: 3,
        totalRounds: 5,
        totalPlayers: 24,
        startDate: "2026-05-20",
        prizePool: "$2,500"
      };
      
      const mockPlayers = [
        { id: 1, name: "Magnus Carlsen", rating: 2856, score: 3.0, club: "Norway Chess" },
        { id: 2, name: "Hikaru Nakamura", rating: 2789, score: 2.5, club: "USA" },
        { id: 3, name: "Ian Nepomniachtchi", rating: 2778, score: 2.5, club: "Russia" },
        { id: 4, name: "Wesley So", rating: 2760, score: 2.0, club: "USA" },
        { id: 5, name: "Anish Giri", rating: 2754, score: 2.0, club: "Netherlands" },
        { id: 6, name: "Levon Aronian", rating: 2745, score: 1.5, club: "USA" }
      ];
      
      const mockMatches = [
        { id: 1, white: "Magnus Carlsen", black: "Hikaru Nakamura", result: "1-0", round: 3 },
        { id: 2, white: "Ian Nepomniachtchi", black: "Wesley So", result: "1/2-1/2", round: 3 },
        { id: 3, white: "Anish Giri", black: "Levon Aronian", result: "1-0", round: 3 }
      ];
      
      setTournament(mockTournament);
      setPlayers(mockPlayers);
      setMatches(mockMatches);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching tournament data:', error);
      toast.error('Failed to load tournament data');
      setLoading(false);
    }
  };

  const getStatusClass = (status) => {
    switch(status) {
      case 'registration': return 'status-registration';
      case 'ongoing': return 'status-ongoing';
      case 'completed': return 'status-completed';
      default: return '';
    }
  };

  if (loading) {
    return <div className="dashboard">Loading tournament data...</div>;
  }

  return (
    <div className="dashboard">
      <div className="tournament-header">
        <h1>{tournament?.name}</h1>
        <div className={`status-badge ${getStatusClass(tournament?.status)}`}>
          {tournament?.status?.toUpperCase()}
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <h3>Tournament Type</h3>
          <p>{tournament?.type}</p>
        </div>
        <div className="stat-card">
          <h3>Round</h3>
          <p>{tournament?.currentRound} / {tournament?.totalRounds}</p>
        </div>
        <div className="stat-card">
          <h3>Players</h3>
          <p>{tournament?.totalPlayers}</p>
        </div>
        <div className="stat-card">
          <h3>Prize Pool</h3>
          <p>{tournament?.prizePool}</p>
        </div>
      </div>

      <div className="players-list">
        <h2>🏆 Current Standings</h2>
        <table>
          <thead>
            <tr>
              <th>Rank</th>
              <th>Player</th>
              <th>Rating</th>
              <th>Score</th>
              <th>Club</th>
            </tr>
          </thead>
          <tbody>
            {players.map((player, index) => (
              <tr key={player.id}>
                <td>{index + 1}</td>
                <td><strong>{player.name}</strong></td>
                <td>{player.rating}</td>
                <td>{player.score}</td>
                <td>{player.club}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="matches-list">
        <h2>🎯 Recent Matches</h2>
        <table>
          <thead>
            <tr>
              <th>Round</th>
              <th>White</th>
              <th>Black</th>
              <th>Result</th>
            </tr>
          </thead>
          <tbody>
            {matches.map(match => (
              <tr key={match.id}>
                <td>{match.round}</td>
                <td>{match.white}</td>
                <td>{match.black}</td>
                <td>
                  <strong>{match.result}</strong>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default TournamentDashboard;