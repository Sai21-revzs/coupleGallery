import { useEffect, useRef, useState } from 'react';
import './MusicPlayer.css';

// Only one soundtrack may play at a time across the whole app.
let activeAudio = null;

const formatTime = (seconds) => {
    if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
};

function MusicPlayer({ src, name, compact = false }) {
    const audioRef = useRef(null);
    const [playing, setPlaying] = useState(false);
    const [current, setCurrent] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(0.8);
    const [error, setError] = useState('');

    // Reset when the file changes (e.g. the user replaces the MP3 in the form)
    useEffect(() => {
        setPlaying(false);
        setCurrent(0);
        setDuration(0);
        setError('');
    }, [src]);

    // Stop playback when the player is removed from the page
    useEffect(() => {
        const audio = audioRef.current;
        return () => {
            if (audio) audio.pause();
            if (activeAudio === audio) activeAudio = null;
        };
    }, []);

    const togglePlay = async () => {
        const audio = audioRef.current;
        if (!audio) return;
        if (audio.paused) {
            if (activeAudio && activeAudio !== audio) activeAudio.pause();
            activeAudio = audio;
            try {
                await audio.play();
            } catch {
                setError('This audio file could not be played.');
            }
        } else {
            audio.pause();
        }
    };

    const seek = (e) => {
        const audio = audioRef.current;
        const time = Number(e.target.value);
        if (audio && Number.isFinite(time)) {
            audio.currentTime = time;
            setCurrent(time);
        }
    };

    const changeVolume = (e) => {
        const v = Number(e.target.value);
        setVolume(v);
        if (audioRef.current) audioRef.current.volume = v;
    };

    const toggleMute = () => {
        const v = volume > 0 ? 0 : 0.8;
        setVolume(v);
        if (audioRef.current) audioRef.current.volume = v;
    };

    const progress = duration ? (current / duration) * 100 : 0;

    return (
        <div className={`music-player ${playing ? 'is-playing' : ''} ${compact ? 'compact' : ''}`}>
            <audio
                ref={audioRef}
                src={src}
                preload="metadata"
                onLoadedMetadata={(e) => { setDuration(e.target.duration); e.target.volume = volume; }}
                onDurationChange={(e) => setDuration(e.target.duration)}
                onTimeUpdate={(e) => setCurrent(e.target.currentTime)}
                onPlay={() => setPlaying(true)}
                onPause={() => setPlaying(false)}
                onEnded={() => { setPlaying(false); setCurrent(0); }}
                onError={() => setError('This audio file could not be loaded.')}
            />

            <div className="mp-top">
                <div className="mp-icon" aria-hidden="true">
                    {playing ? (
                        <span className="mp-eq"><i /><i /><i /><i /></span>
                    ) : (
                        <svg viewBox="0 0 24 24"><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></svg>
                    )}
                </div>
                <div className="mp-title" title={name}>
                    <span className="mp-label">{playing ? 'Now playing' : 'Soundtrack'}</span>
                    <span className="mp-name">{name || 'Untitled track'}</span>
                </div>
                <button
                    type="button"
                    className="mp-play"
                    onClick={togglePlay}
                    aria-label={playing ? 'Pause' : 'Play'}
                    title={playing ? 'Pause' : 'Play'}
                    disabled={!!error}
                >
                    {playing ? (
                        <svg viewBox="0 0 24 24"><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg>
                    ) : (
                        <svg viewBox="0 0 24 24"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z" /></svg>
                    )}
                </button>
            </div>

            <input
                type="range"
                className="mp-progress"
                min="0"
                max={duration || 0}
                step="0.1"
                value={Math.min(current, duration || 0)}
                onChange={seek}
                style={{ '--fill': `${progress}%` }}
                aria-label="Seek"
                disabled={!duration}
            />

            <div className="mp-bottom">
                <span className="mp-time">{formatTime(current)} / {formatTime(duration)}</span>
                <div className="mp-volume">
                    <button type="button" className="mp-mute" onClick={toggleMute} aria-label={volume > 0 ? 'Mute' : 'Unmute'}>
                        <svg viewBox="0 0 24 24">
                            <path d="M11 5 6 9H3v6h3l5 4z" />
                            {volume > 0 && <path className="mp-wave" d="M15.5 8.5a5 5 0 0 1 0 7" />}
                            {volume > 0.5 && <path className="mp-wave" d="M18.5 5.5a9 9 0 0 1 0 13" />}
                        </svg>
                    </button>
                    <input
                        type="range"
                        className="mp-volume-range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={volume}
                        onChange={changeVolume}
                        style={{ '--fill': `${volume * 100}%` }}
                        aria-label="Volume"
                    />
                </div>
            </div>

            {error && <p className="mp-error">{error}</p>}
        </div>
    );
}

export default MusicPlayer;
