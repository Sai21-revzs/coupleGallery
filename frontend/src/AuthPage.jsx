import { useState } from 'react';
import { API_URL } from './constants';
import './AuthPage.css';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isStrongPassword(pw) {
    return pw.length >= 6 && /[a-zA-Z]/.test(pw) && /[0-9]/.test(pw);
}

function AuthPage({ hearts, onAuthSuccess }) {
    const [mode, setMode] = useState('login'); // 'login' | 'signup'
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const isSignup = mode === 'signup';

    const switchMode = (nextMode) => {
        if (nextMode === mode) return;
        setMode(nextMode);
        setError('');
        setConfirmPassword('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        const trimmedUsername = username.trim();
        const trimmedEmail = email.trim().toLowerCase();

        if (isSignup && !trimmedUsername) {
            return setError('Please enter a username.');
        }
        if (!trimmedEmail) {
            return setError('Please enter your email address.');
        }
        if (!EMAIL_REGEX.test(trimmedEmail)) {
            return setError('Please enter a valid email address.');
        }
        if (!password) {
            return setError('Please enter your password.');
        }
        if (isSignup && !isStrongPassword(password)) {
            return setError('Password must be at least 6 characters and include both letters and numbers.');
        }
        if (isSignup && password !== confirmPassword) {
            return setError('Passwords do not match.');
        }

        setLoading(true);
        try {
            const endpoint = isSignup ? '/api/auth/signup' : '/api/auth/login';
            const payload = isSignup
                ? { username: trimmedUsername, email: trimmedEmail, password }
                : { email: trimmedEmail, password };

            const response = await fetch(`${API_URL}${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            const data = await response.json().catch(() => ({}));
            if (!response.ok || !data.success) {
                throw new Error(data.error || 'Authentication failed. Please try again.');
            }

            onAuthSuccess(data.token, data.user);
        } catch (err) {
            setError(
                err.message === 'Failed to fetch'
                    ? 'Cannot reach the server. Please make sure the backend is running.'
                    : err.message
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-screen">
            <div className="hearts" aria-hidden="true">
                {hearts.map(h => (
                    <span key={h.id} className="heart" style={h.style}>♥</span>
                ))}
            </div>

            <div className="auth-card">
                <div className="auth-header">
                    <span className="auth-heart-badge" aria-hidden="true">♥</span>
                    <h1 className="auth-brand">a memory of us</h1>
                    <p className="auth-tagline">
                        {isSignup
                            ? 'create your private space for every moment'
                            : 'sign in to revisit your cherished moments'}
                    </p>
                </div>

                <div className="auth-tabs" role="tablist" aria-label="Authentication mode">
                    <button
                        type="button"
                        role="tab"
                        aria-selected={!isSignup}
                        className={`auth-tab ${!isSignup ? 'active' : ''}`}
                        onClick={() => switchMode('login')}
                    >
                        Log In
                    </button>
                    <button
                        type="button"
                        role="tab"
                        aria-selected={isSignup}
                        className={`auth-tab ${isSignup ? 'active' : ''}`}
                        onClick={() => switchMode('signup')}
                    >
                        Sign Up
                    </button>
                </div>

                <form className="auth-form" onSubmit={handleSubmit} noValidate>
                    {isSignup && (
                        <div className="auth-field">
                            <label htmlFor="auth-username">Username</label>
                            <input
                                id="auth-username"
                                type="text"
                                placeholder="Enter your name"
                                value={username}
                                maxLength={100}
                                autoComplete="username"
                                onChange={(e) => setUsername(e.target.value)}
                                disabled={loading}
                            />
                        </div>
                    )}

                    <div className="auth-field">
                        <label htmlFor="auth-email">Email Address</label>
                        <input
                            id="auth-email"
                            type="email"
                            placeholder="you@example.com"
                            value={email}
                            autoComplete="email"
                            onChange={(e) => setEmail(e.target.value)}
                            disabled={loading}
                        />
                    </div>

                    <div className="auth-field">
                        <label htmlFor="auth-password">Password</label>
                        <div className="auth-password-wrapper">
                            <input
                                id="auth-password"
                                type={showPassword ? 'text' : 'password'}
                                placeholder={isSignup ? '6+ characters with letters & numbers' : 'Enter your password'}
                                value={password}
                                autoComplete={isSignup ? 'new-password' : 'current-password'}
                                onChange={(e) => setPassword(e.target.value)}
                                disabled={loading}
                            />
                            <button
                                type="button"
                                className="auth-password-toggle"
                                onClick={() => setShowPassword(prev => !prev)}
                                aria-label={showPassword ? 'Hide password' : 'Show password'}
                            >
                                {showPassword ? 'Hide' : 'Show'}
                            </button>
                        </div>
                    </div>

                    {isSignup && (
                        <div className="auth-field">
                            <label htmlFor="auth-confirm-password">Confirm Password</label>
                            <input
                                id="auth-confirm-password"
                                type={showPassword ? 'text' : 'password'}
                                placeholder="Re-enter your password"
                                value={confirmPassword}
                                autoComplete="new-password"
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                disabled={loading}
                            />
                        </div>
                    )}

                    {error && (
                        <p className="auth-error" role="alert">
                            ⚠ {error}
                        </p>
                    )}

                    <button
                        id="auth-submit"
                        type="submit"
                        className="auth-submit-btn"
                        disabled={loading}
                    >
                        {loading
                            ? (isSignup ? 'Creating account…' : 'Signing in…')
                            : (isSignup ? 'Create Account' : 'Log In')}
                    </button>
                </form>

                <p className="auth-switch-prompt">
                    {isSignup ? 'Already have an account?' : "Don't have an account yet?"}{' '}
                    <button
                        type="button"
                        className="auth-switch-link"
                        onClick={() => switchMode(isSignup ? 'login' : 'signup')}
                    >
                        {isSignup ? 'Log in here' : 'Sign up here'}
                    </button>
                </p>
            </div>
        </div>
    );
}

export default AuthPage;
