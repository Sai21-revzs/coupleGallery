import React, { useState } from 'react';
import './HeartButton.css';

/**
 * Emil Kowalski-inspired Heart / Like Button
 * Features:
 *  - Spring "squish & overshoot" physics
 *  - Expanding shockwave burst ring
 *  - 6-particle radial confetti sparks
 */
export default function HeartButton({
  isLiked = false,
  onToggle,
  count,
  className = '',
  size = 24,
  ariaLabel = 'Like'
}) {
  const [animating, setAnimating] = useState(false);

  const handleClick = (e) => {
    e.stopPropagation();
    const nextLiked = !isLiked;
    if (nextLiked) {
      setAnimating(true);
    }
    if (onToggle) {
      onToggle(nextLiked);
    }
  };

  return (
    <button
      type="button"
      className={`emil-heart-btn ${isLiked ? 'is-liked' : ''} ${animating ? 'is-animating' : ''} ${className}`}
      onClick={handleClick}
      aria-label={isLiked ? 'Unlike' : ariaLabel}
      aria-pressed={isLiked}
    >
      <div className="heart-wrapper" style={{ width: size, height: size }}>
        {/* Emil's Shockwave Ring */}
        <span className="heart-ring" aria-hidden="true" />

        {/* Emil's Radial Sparks */}
        <div className="sparks-container" aria-hidden="true">
          <span className="spark spark-1" />
          <span className="spark spark-2" />
          <span className="spark spark-3" />
          <span className="spark spark-4" />
          <span className="spark spark-5" />
          <span className="spark spark-6" />
        </div>

        {/* Heart SVG */}
        <svg
          className="heart-icon"
          viewBox="0 0 24 24"
          style={{ width: size, height: size }}
          fill={isLiked ? '#f43f5e' : 'none'}
          stroke={isLiked ? '#f43f5e' : 'currentColor'}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          onAnimationEnd={() => setAnimating(false)}
        >
          <path d="M19.5 12.572l-7.5 7.428l-7.5 -7.428a5 5 0 1 1 7.5 -6.566a5 5 0 1 1 7.5 6.572" />
        </svg>
      </div>

      {count !== undefined && (
        <span className={`heart-count ${isLiked ? 'liked' : ''}`}>
          {count}
        </span>
      )}
    </button>
  );
}

