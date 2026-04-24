import React, { useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

function CreateTournament({ onTournamentCreated }) {
  const [showForm, setShowForm] = useState(false);
  const [tournament, setTournament] = useState({
    name: '',
    type: 'swiss',
    startDate: '',
    endDate: '',
    rounds: 5,
    maxPlayers: 32,
    entryFee: 50,
    prizePool: 2500,
    description: ''
  });

  const handleChange = (e) => {
    setTournament({
      ...tournament,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/tournaments/create`,
        tournament,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast.success('Tournament created successfully!');
      setShowForm(false);
      setTournament({
        name: '',
        type: 'swiss',
        startDate: '',
        endDate: '',
        rounds: 5,
        maxPlayers: 32,
        entryFee: 50,
        prizePool: 2500,
        description: ''
      });
      
      if (onTournamentCreated) {
        onTournamentCreated();
      }
    } catch (error) {
      console.error('Error creating tournament:', error);
      toast.error(error.response?.data?.error || 'Failed to create tournament');
    }
  };

  return (
    <div style={{ marginBottom: '2rem' }}>
      {!showForm ? (
        <button 
          onClick={() => setShowForm(true)}
          style={{
            background: '#10b981',
            color: 'white',
            border: 'none',
            padding: '0.75rem 1.5rem',
            borderRadius: '8px',
            fontSize: '1rem',
            cursor: 'pointer',
            marginBottom: '1rem'
          }}
        >
          + Create New Tournament
        </button>
      ) : (
        <div style={{
          background: 'white',
          padding: '2rem',
          borderRadius: '10px',
          marginBottom: '2rem'
        }}>
          <h3 style={{ marginBottom: '1rem', color: '#333' }}>Create Tournament</h3>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gap: '1rem' }}>
              <input
                type="text"
                name="name"
                placeholder="Tournament Name *"
                value={tournament.name}
                onChange={handleChange}
                required
                style={{ padding: '0.75rem', borderRadius: '5px', border: '1px solid #ddd' }}
              />
              
              <select
                name="type"
                value={tournament.type}
                onChange={handleChange}
                style={{ padding: '0.75rem', borderRadius: '5px', border: '1px solid #ddd' }}
              >
                <option value="swiss">Swiss System</option>
                <option value="round_robin">Round Robin</option>
                <option value="knockout">Knockout</option>
              </select>
              
              <input
                type="date"
                name="startDate"
                value={tournament.startDate}
                onChange={handleChange}
                required
                style={{ padding: '0.75rem', borderRadius: '5px', border: '1px solid #ddd' }}
              />
              
              <input
                type="date"
                name="endDate"
                value={tournament.endDate}
                onChange={handleChange}
                style={{ padding: '0.75rem', borderRadius: '5px', border: '1px solid #ddd' }}
              />
              
              <input
                type="number"
                name="rounds"
                placeholder="Number of Rounds"
                value={tournament.rounds}
                onChange={handleChange}
                style={{ padding: '0.75rem', borderRadius: '5px', border: '1px solid #ddd' }}
              />
              
              <input
                type="number"
                name="maxPlayers"
                placeholder="Max Players"
                value={tournament.maxPlayers}
                onChange={handleChange}
                style={{ padding: '0.75rem', borderRadius: '5px', border: '1px solid #ddd' }}
              />
              
              <input
                type="number"
                name="entryFee"
                placeholder="Entry Fee ($)"
                value={tournament.entryFee}
                onChange={handleChange}
                style={{ padding: '0.75rem', borderRadius: '5px', border: '1px solid #ddd' }}
              />
              
              <input
                type="number"
                name="prizePool"
                placeholder="Prize Pool ($)"
                value={tournament.prizePool}
                onChange={handleChange}
                style={{ padding: '0.75rem', borderRadius: '5px', border: '1px solid #ddd' }}
              />
              
              <textarea
                name="description"
                placeholder="Tournament Description"
                value={tournament.description}
                onChange={handleChange}
                rows="3"
                style={{ padding: '0.75rem', borderRadius: '5px', border: '1px solid #ddd' }}
              />
              
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button 
                  type="submit"
                  style={{
                    background: '#667eea',
                    color: 'white',
                    border: 'none',
                    padding: '0.75rem',
                    borderRadius: '5px',
                    cursor: 'pointer',
                    flex: 1
                  }}
                >
                  Create Tournament
                </button>
                <button 
                  type="button"
                  onClick={() => setShowForm(false)}
                  style={{
                    background: '#6b7280',
                    color: 'white',
                    border: 'none',
                    padding: '0.75rem',
                    borderRadius: '5px',
                    cursor: 'pointer',
                    flex: 1
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

export default CreateTournament;
