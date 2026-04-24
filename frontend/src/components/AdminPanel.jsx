import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import CreateTournament from './CreateTournament';

function AdminPanel() {
  const [pendingUsers, setPendingUsers] = useState([]);
  const [tournaments, setTournaments] = useState([]);
  const [activeTab, setActiveTab] = useState('users');

  useEffect(() => {
    fetchPendingUsers();
    fetchTournaments();
  }, []);

  const fetchPendingUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/admin/pending-users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPendingUsers(response.data);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchTournaments = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/admin/tournaments`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTournaments(response.data);
    } catch (error) {
      console.error('Error fetching tournaments:', error);
    }
  };

  const approveUser = async (userId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${import.meta.env.VITE_API_URL}/api/admin/approve-user/${userId}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('User approved successfully!');
      fetchPendingUsers();
    } catch (error) {
      toast.error('Failed to approve user');
    }
  };

  const startTournament = async (tournamentId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${import.meta.env.VITE_API_URL}/api/admin/start-tournament/${tournamentId}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Tournament started!');
      fetchTournaments();
    } catch (error) {
      toast.error('Failed to start tournament');
    }
  };

  const completeTournament = async (tournamentId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${import.meta.env.VITE_API_URL}/api/admin/complete-tournament/${tournamentId}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Tournament completed!');
      fetchTournaments();
    } catch (error) {
      toast.error('Failed to complete tournament');
    }
  };

  return (
    <div className="admin-panel">
      <h2>Admin Dashboard</h2>
      
      <CreateTournament onTournamentCreated={fetchTournaments} />
      
      <div className="admin-tabs">
        <button className={activeTab === 'users' ? 'active' : ''} onClick={() => setActiveTab('users')}>
          Pending Approvals ({pendingUsers.length})
        </button>
        <button className={activeTab === 'tournaments' ? 'active' : ''} onClick={() => setActiveTab('tournaments')}>
          Manage Tournaments
        </button>
      </div>
      
      {activeTab === 'users' && (
        <div className="users-list">
          <h3>Users Waiting for Approval</h3>
          {pendingUsers.length === 0 ? (
            <p>No pending approvals</p>
          ) : (
            pendingUsers.map(user => (
              <div key={user._id} className="user-approval-card">
                <div>
                  <strong>{user.username}</strong>
                  <p>{user.email}</p>
                  <p>Registered: {new Date(user.createdAt).toLocaleDateString()}</p>
                </div>
                <button onClick={() => approveUser(user._id)} className="approve-btn">
                  Approve User
                </button>
              </div>
            ))
          )}
        </div>
      )}
      
      {activeTab === 'tournaments' && (
        <div className="tournaments-list">
          <h3>Manage Tournaments</h3>
          {tournaments.map(tournament => (
            <div key={tournament._id} className="tournament-manage-card">
              <div>
                <strong>{tournament.name}</strong>
                <p>Status: {tournament.status}</p>
                <p>Players: {tournament.currentPlayers}/{tournament.maxPlayers}</p>
                <p>Start Date: {new Date(tournament.startDate).toLocaleDateString()}</p>
              </div>
              <div className="action-buttons">
                {tournament.status === 'registration' && (
                  <button onClick={() => startTournament(tournament._id)} className="start-btn">
                    Start Tournament
                  </button>
                )}
                {tournament.status === 'ongoing' && (
                  <button onClick={() => completeTournament(tournament._id)} className="complete-btn">
                    Complete Tournament
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default AdminPanel;