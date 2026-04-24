import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

function TournamentList({ onJoinTournament }) {
  const [availableTournaments, setAvailableTournaments] = useState([]);
  const [myTournaments, setMyTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    await Promise.all([fetchAvailableTournaments(), fetchMyTournaments()]);
    setLoading(false);
  };

  const fetchAvailableTournaments = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/tournaments/available`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAvailableTournaments(response.data);
    } catch (error) {
      console.error('Error fetching tournaments:', error);
      toast.error('Failed to load tournaments');
    }
  };

  const fetchMyTournaments = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/tournaments/my-tournaments`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMyTournaments(response.data);
    } catch (error) {
      console.error('Error fetching my tournaments:', error);
    }
  };

  const joinTournament = async (tournamentId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/tournaments/${tournamentId}/join`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast.success('Successfully joined tournament!');
      fetchData(); // Refresh lists
      
      // Optional: Redirect to lobby
      if (onJoinTournament) {
        onJoinTournament(tournamentId);
      }
    } catch (error) {
      console.error('Join error:', error);
      toast.error(error.response?.data?.error || 'Failed to join tournament');
    }
  };

  if (loading) {
    return <div className="loading">Loading tournaments...</div>;
  }

  return (
    <div className="tournament-list-container">
      <h2>🎯 Available Tournaments</h2>
      <div className="tournament-grid">
        {availableTournaments.length === 0 ? (
          <p className="no-data">No tournaments available. Check back later!</p>
        ) : (
          availableTournaments.map(tournament => (
            <div key={tournament._id} className="tournament-card">
              <h3>{tournament.name}</h3>
              <div className="tournament-info">
                <p><strong>📋 Type:</strong> {tournament.type}</p>
                <p><strong>👥 Players:</strong> {tournament.currentPlayers || 0}/{tournament.maxPlayers}</p>
                <p><strong>💰 Entry Fee:</strong> ${tournament.entryFee}</p>
                <p><strong>🏆 Prize Pool:</strong> ${tournament.prizePool}</p>
                <p><strong>📅 Start Date:</strong> {new Date(tournament.startDate).toLocaleDateString()}</p>
                <p><strong>🎯 Rounds:</strong> {tournament.rounds}</p>
                {tournament.description && <p><strong>📝 Description:</strong> {tournament.description}</p>}
              </div>
              <button 
                onClick={() => joinTournament(tournament._id)} 
                className="join-btn"
                disabled={tournament.currentPlayers >= tournament.maxPlayers}
              >
                {tournament.currentPlayers >= tournament.maxPlayers ? 'Tournament Full' : 'Join Tournament'}
              </button>
            </div>
          ))
        )}
      </div>

      <h2 style={{ marginTop: '3rem' }}>🏆 My Tournaments</h2>
      <div className="tournament-grid">
        {myTournaments.length === 0 ? (
          <p className="no-data">You haven't joined any tournaments yet.</p>
        ) : (
          myTournaments.map(reg => (
            <div key={reg._id} className="tournament-card my-tournament">
              <h3>{reg.tournamentId?.name}</h3>
              <div className="tournament-info">
                <p><strong>Status:</strong> {reg.status}</p>
                <p><strong>Payment:</strong> {reg.paymentStatus}</p>
                <p><strong>Score:</strong> {reg.score}</p>
                <p><strong>Record:</strong> {reg.wins}W - {reg.draws}D - {reg.losses}L</p>
              </div>
              {reg.tournamentId?.status === 'ongoing' && (
                <button 
                  onClick={() => onJoinTournament(reg.tournamentId._id)} 
                  className="enter-lobby-btn"
                >
                  Enter Tournament Lobby
                </button>
              )}
              {reg.tournamentId?.status === 'registration' && (
                <p className="waiting-status">⏳ Waiting for tournament to start</p>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default TournamentList;