import React, { useState, useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './components/Login';
import PublicDashboard from './components/PublicDashboard';
import TournamentList from './components/TournamentList';
import TournamentLobby from './components/TournamentLobby';
import OnlineChessGame from './components/OnlineChessGame';
import AdminPanel from './components/AdminPanel';
import './App.css';

function MainApp() {
  const { user, loading, logout, socket } = useAuth();
  const [showLogin, setShowLogin] = useState(false);
  const [currentView, setCurrentView] = useState('dashboard');
  const [selectedTournament, setSelectedTournament] = useState(null);
  const [currentGame, setCurrentGame] = useState(null);
  const [checkingGame, setCheckingGame] = useState(true);

  // Check for active game on page load/refresh
  useEffect(() => {
    const checkActiveGame = async () => {
      if (!user) {
        setCheckingGame(false);
        return;
      }
      
      try {
        const token = localStorage.getItem('token');
        console.log('Checking active game for user:', user.id);
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/games/active/${user.id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await response.json();
        
        if (data.game && data.game.isActive !== false) {
          console.log('Found active game from API:', data.game);
          
          // Create complete game data object
          const completeGameData = {
            gameId: data.game.gameId,
            color: data.game.color,
            opponent: data.game.opponent,
            fen: data.game.fen || 'start',
            moves: data.game.moves || []
          };
          
          setCurrentGame(completeGameData);
          setCurrentView('game');
          
          if (data.game.tournamentId) {
            setSelectedTournament(data.game.tournamentId);
          }
        } else {
          // No active game, clear any saved state
          sessionStorage.removeItem('activeGame');
          setCurrentGame(null);
          setCurrentView('dashboard');
        }
      } catch (error) {
        console.error('Error checking active game:', error);
        // If API fails, don't restore game
        sessionStorage.removeItem('activeGame');
        setCurrentGame(null);
      } finally {
        setCheckingGame(false);
      }
    };
    
    if (!loading && user) {
      checkActiveGame();
    } else if (!loading && !user) {
      setCheckingGame(false);
    }
  }, [user, loading]);

  if (loading || checkingGame) {
    return <div className="loading">Loading...</div>;
  }

  const handlePlayClick = () => {
    if (!user) {
      setShowLogin(true);
    } else if (!user.isApproved && user.role !== 'admin') {
      alert('Your account is pending admin approval. Please wait.');
    } else {
      setCurrentView('tournaments');
    }
  };

  const handleJoinTournament = (tournamentId) => {
    setSelectedTournament(tournamentId);
    setCurrentView('lobby');
  };

  const handleStartGame = (gameData) => {
    setCurrentGame(gameData);
    setCurrentView('game');
  };

  const handleGameEnd = () => {
    setCurrentGame(null);
    sessionStorage.removeItem('activeGame');
    setCurrentView('lobby');
  };

  const handleLoginSuccess = () => {
    setShowLogin(false);
    window.location.reload();
  };

  const handleLeaveGame = () => {
    if (window.confirm('Leave the game? You will forfeit the match.')) {
      // Optionally send resign event here
      setCurrentView('dashboard');
      sessionStorage.removeItem('activeGame');
    }
  };

  // Show login modal if needed
  if (showLogin && !user) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="App">
      <nav className="navbar">
        <div className="nav-container">
          <h1 className="logo" onClick={() => setCurrentView('dashboard')} style={{ cursor: 'pointer' }}>
            ♟️ Chess Tournament
          </h1>
          <div className="nav-links">
            <button onClick={() => setCurrentView('dashboard')}>Dashboard</button>
            
            {user && (user.isApproved || user.role === 'admin') && currentView !== 'game' && (
              <button onClick={handlePlayClick}>Play</button>
            )}
            
            {currentView === 'game' && (
              <button onClick={handleLeaveGame}>Leave Game</button>
            )}
            
            {!user && (
              <button onClick={() => setShowLogin(true)}>Login</button>
            )}
            
            {user && user.role === 'admin' && currentView !== 'game' && (
              <button onClick={() => setCurrentView('admin')}>Admin Panel</button>
            )}
            
            {user && (
              <button onClick={logout}>
                Logout ({user.username})
                {!user.isApproved && user.role !== 'admin' && ' (Pending Approval)'}
              </button>
            )}
          </div>
        </div>
      </nav>
      
      <div className="container">
        {currentView === 'dashboard' && (
          <PublicDashboard onPlayClick={handlePlayClick} />
        )}
        
        {currentView === 'tournaments' && user && (user.isApproved || user.role === 'admin') && (
          <TournamentList onJoinTournament={handleJoinTournament} />
        )}
        
        {currentView === 'lobby' && selectedTournament && (
          <TournamentLobby 
            tournamentId={selectedTournament} 
            onStartGame={handleStartGame}
          />
        )}
        
        {currentView === 'game' && currentGame && (
          <OnlineChessGame 
            gameData={currentGame} 
            onGameEnd={handleGameEnd}
          />
        )}
        
        {currentView === 'admin' && user?.role === 'admin' && (
          <AdminPanel />
        )}
      </div>
      
      <Toaster position="top-right" />
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}

export default App;