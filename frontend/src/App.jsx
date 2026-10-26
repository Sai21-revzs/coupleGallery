import './App.css';
import { useState, useEffect, useCallback } from 'react';
import Gallery from './Gallery';
import AuthPage from './AuthPage';
import { API_URL } from './constants';

const TOKEN_KEY = 'memory_auth_token';
const USER_KEY = 'memory_auth_user';

function App() {

  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY) || '');
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem(USER_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [showGallery, setShowGallery] = useState(false);
  const [leaving, setLeaving] = useState(false);

  // Randomized floating hearts for the background
  const [hearts] = useState(() =>
    Array.from({ length: 30 }, (_, i) => ({
      id: i,
      style: {
        left: `${Math.random() * 100}%`,
        fontSize: `${12 + Math.random() * 30}px`,
        animationDuration: `${6 + Math.random() * 8}s`,
        animationDelay: `${Math.random() * 8}s`,
        opacity: 0.3 + Math.random() * 0.5,
      },
    }))
  );

  const [memories, setMemories] = useState([]);
  const [notes, setNotes] = useState([]);

  const handleLogout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setToken('');
    setUser(null);
    setMemories([]);
    setNotes([]);
    setShowGallery(false);
    setLeaving(false);
  }, []);

  const handleUpdateUser = useCallback((updatedUser) => {
    localStorage.setItem(USER_KEY, JSON.stringify(updatedUser));
    setUser(updatedUser);
  }, []);

  const handleAuthSuccess = (newToken, newUser) => {
    localStorage.setItem(TOKEN_KEY, newToken);
    localStorage.setItem(USER_KEY, JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
    setShowGallery(false);
    setLeaving(false);
  };

  useEffect(() => {
    if (!token) {
      setMemories([]);
      setNotes([]);
      return;
    }

    fetch(`${API_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => (res.ok ? res.json() : null))
      .then(data => {
        if (data?.success && data.user) {
          handleUpdateUser(data.user);
        }
      })
      .catch(() => {});

    fetch(`${API_URL}/api/memories`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async response => {
        if (response.status === 401) {
          handleLogout();
          return null;
        }
        return response.json();
      })
      .then(data => {
        if (Array.isArray(data)) {
          setMemories(data);
        }
      })
      .catch(err => console.error('Could not fetch memories:', err));

    fetch(`${API_URL}/api/notes`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async response => {
        if (response.status === 401) {
          handleLogout();
          return null;
        }
        return response.json();
      })
      .then(data => {
        if (Array.isArray(data)) {
          setNotes(data);
        }
      })
      .catch(err => console.error('Could not fetch sticky notes:', err));
  }, [token, handleLogout, handleUpdateUser]);


  const deleteMemory = (id) => {
    fetch(`${API_URL}/api/memories/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(response => {
        if (response.status === 401) {
          handleLogout();
          return {};
        }
        return response.json();
      })
      .then(data => {
        if (data.success) {
          setMemories(memories => memories.filter(memory => memory.id !== id));
          setNotes(prev => prev.filter(note => note.memory_id !== id));
        }
      })
  }

  const openGallery = () => {
    setLeaving(true);
    setTimeout(() => setShowGallery(true), 900);
  };

  // Step 1: Require Login / Sign Up first
  if (!token || !user) {
    return <AuthPage hearts={hearts} onAuthSuccess={handleAuthSuccess} />;
  }

  // Step 3: Gallery view after clicking "Open gallery"
  if (showGallery) {
    return (
      <div className="gallery-enter">
        <Gallery
          memories={memories}
          setMemories={setMemories}
          deleteMemory={deleteMemory}
          notes={notes}
          setNotes={setNotes}
          token={token}
          user={user}
          onUpdateUser={handleUpdateUser}
          onLogout={handleLogout}
          onHome={() => { setLeaving(false); setShowGallery(false); }} />
      </div>
    );
  }

  const displayName = user.username || (user.email ? user.email.split('@')[0] : 'User');

  // Step 2: Landing page with heart animation and "Open gallery" button
  return (
    <div className={`app-container ${leaving ? 'leaving' : ''}`}>
      <div className="landing-user-bar">
        <span className="landing-user-email" title={displayName}>{displayName}</span>
        <button type="button" className="landing-logout-btn" onClick={handleLogout}>
          Log out
        </button>
      </div>

      <div className="hearts" aria-hidden="true">
        {hearts.map(h => (
          <span key={h.id} className="heart" style={h.style}>♥</span>
        ))}
      </div>

      <div className="landing-content">
        <svg className="big-heart" viewBox="0 0 100 90" aria-hidden="true">
          <defs>
            <linearGradient id="heartGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#ff8fb8" />
              <stop offset="100%" stopColor="#b56cd1" />
            </linearGradient>
          </defs>
          <path
            className="big-heart-path"
            pathLength="1"
            d="M50 85 C 20 62, 3 46, 3 26 C 3 11, 15 3, 28 3 C 39 3, 46 10, 50 19 C 54 10, 61 3, 72 3 C 85 3, 97 11, 97 26 C 97 46, 80 62, 50 85 Z"
          />
        </svg>
        <h1 className="landing-title">a memory of us</h1>
        <p className="subtitle">every moment, kept forever</p>
        <button className='enter-button' onClick={openGallery}>Open gallery</button>
      </div>
    </div>
  );
}

export default App;
