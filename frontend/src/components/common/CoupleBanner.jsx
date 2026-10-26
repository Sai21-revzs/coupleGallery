import { useState, useRef, useEffect } from 'react';
import { API_URL } from '../../services/constants';
import './CoupleBanner.css';

function getTodayLocalDate() {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function calculateDaysTogether(startDateStr) {
    if (!startDateStr) return null;
    const start = new Date(startDateStr + 'T00:00:00');
    if (isNaN(start.getTime())) return null;
    const now = new Date();
    const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const diffMs = todayMidnight.getTime() - start.getTime();
    if (diffMs < 0) return 0;
    return Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1; // inclusive of day 1
}

function CoupleBanner({ user, token, onUpdateUser }) {
    const todayDate = getTodayLocalDate();
    const [quote, setQuote] = useState('');
    const [quoteInput, setQuoteInput] = useState('');
    const [isEditingQuote, setIsEditingQuote] = useState(false);
    const [isSettingDate, setIsSettingDate] = useState(false);
    const [tempDate, setTempDate] = useState('');
    const [savingQuote, setSavingQuote] = useState(false);
    const [savingDate, setSavingDate] = useState(false);
    const inputRef = useRef(null);

    const daysCount = calculateDaysTogether(user?.relationship_date);

    // Fetch today's quote from server (or check local storage for today's date)
    useEffect(() => {
        if (!token) return;

        // Fetch quote for today
        fetch(`${API_URL}/api/daily-quote?date=${todayDate}`, {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then(res => (res.ok ? res.json() : null))
            .then(data => {
                if (data?.success) {
                    setQuote(data.quote || '');
                    setQuoteInput(data.quote || '');
                }
            })
            .catch(() => {});
    }, [token, todayDate]);

    useEffect(() => {
        if (isEditingQuote && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isEditingQuote]);

    const handleSaveQuote = async (e) => {
        if (e) e.preventDefault();
        setSavingQuote(true);
        const trimmed = quoteInput.trim();
        try {
            const res = await fetch(`${API_URL}/api/daily-quote`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ quote: trimmed, date: todayDate }),
            });
            const data = await res.json();
            if (data?.success) {
                setQuote(data.quote || '');
                setQuoteInput(data.quote || '');
            }
            setIsEditingQuote(false);
        } catch (err) {
            console.error('Could not save quote:', err);
        } finally {
            setSavingQuote(false);
        }
    };

    const handleSaveStartDate = async (e) => {
        if (e) e.preventDefault();
        if (!tempDate) return;
        setSavingDate(true);
        try {
            const res = await fetch(`${API_URL}/api/relationship-date`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ date: tempDate }),
            });
            const data = await res.json();
            if (data?.success && data.user) {
                if (onUpdateUser) onUpdateUser(data.user);
            }
            setIsSettingDate(false);
        } catch (err) {
            console.error('Could not save relationship date:', err);
        } finally {
            setSavingDate(false);
        }
    };

    return (
        <section className="couple-banner-container" aria-label="Our Couple Counter and Quote">
            {/* Left Card: Days Together */}
            <div className="couple-card days-together-card">
                <span className="card-sparkle-icon" aria-hidden="true">💖</span>
                <div className="card-body">
                    {daysCount !== null ? (
                        <>
                            <div className="days-counter-row">
                                <span className="days-number">{daysCount}</span>
                                <span className="days-label">{daysCount === 1 ? 'Day' : 'Days'} Together</span>
                            </div>
                            <button
                                type="button"
                                className="change-date-link"
                                onClick={() => {
                                    setTempDate(user?.relationship_date || todayDate);
                                    setIsSettingDate(true);
                                }}
                            >
                                Since {new Date(user.relationship_date + 'T00:00:00').toLocaleDateString(undefined, {
                                    month: 'short', day: 'numeric', year: 'numeric'
                                })} ✎
                            </button>
                        </>
                    ) : (
                        <div className="set-date-prompt">
                            <span className="set-date-title">When did your story begin?</span>
                            <button
                                type="button"
                                className="btn-set-date"
                                onClick={() => {
                                    setTempDate(todayDate);
                                    setIsSettingDate(true);
                                }}
                            >
                                + Set Anniversary Date
                            </button>
                        </div>
                    )}
                </div>

                {isSettingDate && (
                    <div className="inline-date-modal-backdrop" onClick={() => setIsSettingDate(false)}>
                        <div className="inline-date-modal" onClick={e => e.stopPropagation()}>
                            <h4>Our Anniversary / Start Date</h4>
                            <form onSubmit={handleSaveStartDate}>
                                <input
                                    type="date"
                                    max={todayDate}
                                    value={tempDate}
                                    onChange={e => setTempDate(e.target.value)}
                                    required
                                />
                                <div className="inline-date-actions">
                                    <button
                                        type="button"
                                        className="btn btn-ghost"
                                        onClick={() => setIsSettingDate(false)}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="btn btn-primary"
                                        disabled={savingDate}
                                    >
                                        {savingDate ? 'Saving...' : 'Save Date'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>

            {/* Right Card: Quote for the Day */}
            <div className="couple-card quote-of-day-card">
                <span className="card-sparkle-icon" aria-hidden="true">💌</span>
                <div className="card-body quote-card-body">
                    <div className="quote-header">
                        <span className="quote-badge">Quote for the Day</span>
                        <span className="quote-date-tag">
                            {new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </span>
                    </div>

                    {isEditingQuote ? (
                        <form className="quote-edit-form" onSubmit={handleSaveQuote}>
                            <textarea
                                ref={inputRef}
                                className="quote-input"
                                value={quoteInput}
                                onChange={e => setQuoteInput(e.target.value)}
                                placeholder="Write today's sweet thought, inside joke, or reminder..."
                                maxLength={500}
                                rows={2}
                            />
                            <div className="quote-actions">
                                <button
                                    type="button"
                                    className="quote-cancel-btn"
                                    onClick={() => {
                                        setQuoteInput(quote);
                                        setIsEditingQuote(false);
                                    }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="quote-save-btn"
                                    disabled={savingQuote}
                                >
                                    {savingQuote ? 'Saving...' : 'Save Quote'}
                                </button>
                            </div>
                        </form>
                    ) : (
                        <div
                            className="quote-display-wrap"
                            onClick={() => {
                                setQuoteInput(quote);
                                setIsEditingQuote(true);
                            }}
                            title="Click to edit today's quote"
                        >
                            {quote ? (
                                <blockquote className="quote-text">
                                    “{quote}”
                                    <span className="quote-edit-icon" aria-hidden="true"> ✎</span>
                                </blockquote>
                            ) : (
                                <p className="quote-empty-prompt">
                                    <span className="quote-empty-icon">✎</span>
                                    <em>Add today&apos;s quote or sweet message...</em>
                                    <span className="quote-auto-reset-note">(resets every morning)</span>
                                </p>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
}

export default CoupleBanner;
