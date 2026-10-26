import './App.css';
import { useState, useEffect } from 'react';
import Gallery from './Gallery';


function App() {

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

  useEffect(() => {
    fetch('http://localhost:5000/api/memories')
      .then(response => response.json())
      .then(data => {
        setMemories(data)
      });
  }, []);


  const deleteMemory = (id) => {
    fetch(`http://localhost:5000/api/memories/${id}`, {
      method: 'DELETE'
    })
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          setMemories(memories => memories.filter(memory => memory.id !== id))
        }
      })
  }

  const openGallery = () => {
    setLeaving(true);
    setTimeout(() => setShowGallery(true), 900);
  };

  if (showGallery) {
    return (
      <div className="gallery-enter">
        <Gallery
          memories={memories}
          setMemories={setMemories}
          deleteMemory={deleteMemory}
          onHome={() => { setLeaving(false); setShowGallery(false); }} />
      </div>
    );
  }

  return (
    <div className={`app-container ${leaving ? 'leaving' : ''}`}>
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