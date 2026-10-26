import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import MemoryCard from './MemoryCard';
import CreateMemory from './createMemory';
import Navbar from './Navbar';
import StickyNote from './StickyNote';
import BucketList from './BucketList';
import { API_URL } from './constants';
import './Gallery.css';

function Gallery({
    memories,
    setMemories,
    deleteMemory,
    notes = [],
    setNotes,
    bucketItems = [],
    setBucketItems,
    onHome,
    token,
    user,
    onUpdateUser,
    onLogout,
}) {
    const [showForm, openForm] = useState(false);
    const [search, setSearch] = useState('');
    const [fabMenuOpen, setFabMenuOpen] = useState(false);
    const [placingNote, setPlacingNote] = useState(false);
    const [newNoteId, setNewNoteId] = useState(null);
    const [showBucketList, setShowBucketList] = useState(false);
    const [newestBucketId, setNewestBucketId] = useState(null);

    const galleryPageRef = useRef(null);
    const fabMenuRef = useRef(null);

    const filtered = memories.filter(m =>
        (m.title || '').toLowerCase().includes(search.toLowerCase())
    );

    const pageNotes = notes.filter(n => n.memory_id == null);

    // Close the heart radial menu when clicking outside
    useEffect(() => {
        if (!fabMenuOpen) return;
        const handleOutside = (e) => {
            if (fabMenuRef.current && !fabMenuRef.current.contains(e.target)) {
                setFabMenuOpen(false);
            }
        };
        document.addEventListener('pointerdown', handleOutside);
        return () => document.removeEventListener('pointerdown', handleOutside);
    }, [fabMenuOpen]);

    // ===================== STICKY NOTE HANDLERS =====================

    const handleCreateNote = async ({ memory_id = null, photo_index = null, pos_x = 120, pos_y = 140 }) => {
        try {
            const response = await fetch(`${API_URL}/api/notes`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    memory_id,
                    photo_index,
                    pos_x,
                    pos_y,
                    color: 'yellow',
                    content: '',
                }),
            });
            if (response.status === 401) {
                if (onLogout) onLogout();
                return;
            }
            const data = await response.json();
            if (data.success && data.note) {
                setNotes(prev => [...prev, data.note]);
                setNewNoteId(data.note.id);
                setPlacingNote(false);
            }
        } catch (err) {
            console.error('Could not create sticky note:', err);
        }
    };

    const handleUpdateNote = async (id, updates) => {
        setNotes(prev =>
            prev.map(n => (n.id === id ? { ...n, ...updates } : n))
        );
        try {
            const response = await fetch(`${API_URL}/api/notes/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(updates),
            });
            if (response.status === 401) {
                if (onLogout) onLogout();
                return;
            }
            const data = await response.json();
            if (data.success && data.note) {
                setNotes(prev =>
                    prev.map(n => (n.id === id ? data.note : n))
                );
            }
        } catch (err) {
            console.error('Could not update sticky note:', err);
        }
    };

    const handleDeleteNote = async (id) => {
        setNotes(prev => prev.filter(n => n.id !== id));
        try {
            const response = await fetch(`${API_URL}/api/notes/${id}`, {
                method: 'DELETE',
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            if (response.status === 401 && onLogout) {
                onLogout();
            }
        } catch (err) {
            console.error('Could not delete sticky note:', err);
        }
    };

    // ===================== BUCKET LIST HANDLERS =====================

    const handleAddBucketItem = async () => {
        try {
            const response = await fetch(`${API_URL}/api/bucket-list`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ content: '', is_done: false }),
            });
            if (response.status === 401) {
                if (onLogout) onLogout();
                return;
            }
            const data = await response.json();
            if (data.success && data.item) {
                setBucketItems(prev => [...prev, data.item]);
                setNewestBucketId(data.item.id);
                setShowBucketList(true);
            }
        } catch (err) {
            console.error('Could not add bucket list item:', err);
        }
    };

    const handleUpdateBucketItem = async (id, updates) => {
        setBucketItems(prev =>
            prev.map(item => (item.id === id ? { ...item, ...updates } : item))
        );
        try {
            const response = await fetch(`${API_URL}/api/bucket-list/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(updates),
            });
            if (response.status === 401) {
                if (onLogout) onLogout();
                return;
            }
            const data = await response.json();
            if (data.success && data.item) {
                setBucketItems(prev =>
                    prev.map(item => (item.id === id ? data.item : item))
                );
            }
        } catch (err) {
            console.error('Could not update bucket list item:', err);
        }
    };

    const handleDeleteBucketItem = async (id) => {
        setBucketItems(prev => prev.filter(item => item.id !== id));
        try {
            const response = await fetch(`${API_URL}/api/bucket-list/${id}`, {
                method: 'DELETE',
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            if (response.status === 401 && onLogout) {
                onLogout();
            }
        } catch (err) {
            console.error('Could not delete bucket list item:', err);
        }
    };

    const handleOpenBucketListFromFab = async () => {
        setFabMenuOpen(false);
        setPlacingNote(false);
        setShowBucketList(true);
        if (bucketItems.length === 0) {
            await handleAddBucketItem();
        }
    };

    const handlePageClick = (e) => {
        if (!placingNote || showForm) return;
        // Ignore clicks on navbar, floating heart menu, banner, bucket list, inputs, buttons, or existing sticky notes
        if (
            e.target.closest('.navbar') ||
            e.target.closest('.heart-fab-wrapper') ||
            e.target.closest('.sticky-placement-banner') ||
            e.target.closest('.bucket-list-section') ||
            e.target.closest('.sticky-note') ||
            e.target.closest('button') ||
            e.target.closest('input') ||
            e.target.closest('textarea')
        ) {
            return;
        }

        const pageEl = galleryPageRef.current;
        if (!pageEl) return;

        const rect = pageEl.getBoundingClientRect();
        const posX = Math.max(16, Math.round(e.clientX - rect.left - 105));
        const posY = Math.max(76, Math.round(e.clientY - rect.top - 30));

        handleCreateNote({
            memory_id: null,
            photo_index: null,
            pos_x: posX,
            pos_y: posY,
        });
    };

    return (
        <div
            ref={galleryPageRef}
            className={`gallery-page ${placingNote ? 'placing-sticky-note' : ''}`}
            onClick={handlePageClick}
        >
            <div className="gallery-blob blob-1" />
            <div className="gallery-blob blob-2" />
            <div className="gallery-blob blob-3" />

            <Navbar
                count={memories.length}
                onHome={onHome}
                user={user}
                token={token}
                onUpdateUser={onUpdateUser}
                onLogout={onLogout}
            />

            {placingNote && !showForm && (
                <div className="sticky-placement-banner" role="status">
                    <span>📌 Click anywhere on the page or inside any picture to place your sticky note</span>
                    <button
                        type="button"
                        className="sticky-banner-cancel"
                        onClick={() => setPlacingNote(false)}
                    >
                        Cancel
                    </button>
                </div>
            )}

            {showForm ? (
                <main className="form-wrapper">
                    <div className="form-panel">
                        <CreateMemory
                            onCancel={() => openForm(false)}
                            memories={memories}
                            setMemories={setMemories}
                            token={token}
                            onLogout={onLogout}
                        />
                    </div>
                </main>
            ) : (
                <main className="gallery-main">
                    <header className="gallery-header">
                        <h2 className="gallery-title">Our Memories</h2>
                        <p className="gallery-subtitle">little moments, saved with love</p>

                        <div className="gallery-toolbar">
                            <input
                                className="search-input"
                                type="text"
                                placeholder="Search memories..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                    </header>

                    {filtered.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-heart">♥</div>
                            <h3>{memories.length === 0 ? 'No memories yet' : 'No matches found'}</h3>
                            <p>
                                {memories.length === 0
                                    ? 'Start your story by adding your first memory.'
                                    : 'Try a different search.'}
                            </p>
                            {memories.length === 0 && (
                                <button className="btn btn-primary" onClick={() => openForm(true)}>
                                    <span className="btn-icon">+</span> Add your first memory
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="memory-grid">
                            {filtered.map((image, index) => (
                                <div
                                    className="memory-grid-item"
                                    key={image.id ?? index}
                                    style={{ animationDelay: `${index * 80}ms` }}
                                >
                                    <MemoryCard
                                        id={image.id}
                                        title={image.title}
                                        date={image.date}
                                        layout={image.layout}
                                        photos={image.photos}
                                        music_path={image.music_path}
                                        music_name={image.music_name}
                                        notes={notes.filter(n => Number(n.memory_id) === Number(image.id))}
                                        placingNote={placingNote}
                                        onCreateNote={handleCreateNote}
                                        onUpdateNote={handleUpdateNote}
                                        onDeleteNote={handleDeleteNote}
                                        newNoteId={newNoteId}
                                        onDelete={() => deleteMemory(image.id)}
                                    />
                                </div>
                            ))}
                        </div>
                    )}
                </main>
            )}

            {/* Page-level sticky notes rendered relative to .gallery-page */}
            {!showForm && pageNotes.map((note) => (
                <StickyNote
                    key={note.id}
                    note={note}
                    variant="page"
                    containerRef={galleryPageRef}
                    onUpdate={handleUpdateNote}
                    onDelete={handleDeleteNote}
                    autoFocus={note.id === newNoteId}
                />
            ))}

            {/* Bucket List Popup Modal */}
            {showBucketList && (
                <BucketList
                    items={bucketItems}
                    onAdd={handleAddBucketItem}
                    onUpdate={handleUpdateBucketItem}
                    onDelete={handleDeleteBucketItem}
                    onClose={() => setShowBucketList(false)}
                    newestItemId={newestBucketId}
                />
            )}

            {!showForm && createPortal(
                <div
                    ref={fabMenuRef}
                    className={`heart-fab-wrapper ${fabMenuOpen ? 'open' : ''}`}
                >
                    {/* Action 1: Add Memory (above the heart button) */}
                    <button
                        type="button"
                        className="heart-radial-item radial-add-memory"
                        onClick={() => {
                            setFabMenuOpen(false);
                            setPlacingNote(false);
                            openForm(true);
                        }}
                        aria-label="Add Memory"
                    >
                        <span className="radial-icon">📸</span>
                        <span className="radial-label">Add Memory</span>
                    </button>

                    {/* Action 2: Bucket List (diagonal top-left of the heart button) */}
                    <button
                        type="button"
                        className={`heart-radial-item radial-bucket-list ${showBucketList ? 'active' : ''}`}
                        onClick={handleOpenBucketListFromFab}
                        aria-label="Bucket List"
                    >
                        <span className="radial-icon">✨</span>
                        <span className="radial-label">Bucket List</span>
                    </button>

                    {/* Action 3: Sticky Note (to the left of the heart button) */}
                    <button
                        type="button"
                        className={`heart-radial-item radial-add-sticky ${placingNote ? 'active' : ''}`}
                        onClick={() => {
                            setFabMenuOpen(false);
                            setPlacingNote(prev => !prev);
                        }}
                        aria-label="Add Sticky Note"
                    >
                        <span className="radial-icon">📌</span>
                        <span className="radial-label">
                            {placingNote ? 'Cancel Note' : 'Sticky Note'}
                        </span>
                    </button>

                    {/* Main Single Button: Heart with Plus Icon inside */}
                    <button
                        type="button"
                        className={`heart-plus-fab ${fabMenuOpen || placingNote ? 'active' : ''}`}
                        onClick={() => setFabMenuOpen(prev => !prev)}
                        title="Add memory, bucket list, or sticky note"
                        aria-label="Add memory, bucket list, or sticky note"
                        aria-expanded={fabMenuOpen}
                    >
                        <svg className="heart-plus-svg" viewBox="0 0 64 58" aria-hidden="true">
                            <defs>
                                <linearGradient id="fabHeartGrad" x1="0" y1="0" x2="1" y2="1">
                                    <stop offset="0%" stopColor="#ff7eb3" />
                                    <stop offset="100%" stopColor="#9b5bb8" />
                                </linearGradient>
                            </defs>
                            <path
                                className="heart-plus-shape"
                                d="M32 54 C32 54 6 37 6 19 C6 9.5 13.5 3 22 3 C27.2 3 30.5 6 32 9.5 C33.5 6 36.8 3 42 3 C50.5 3 58 9.5 58 19 C58 37 32 54 32 54 Z"
                                fill="url(#fabHeartGrad)"
                                stroke="#ffffff"
                                strokeWidth="3"
                                strokeLinejoin="round"
                            />
                            <g className="heart-plus-cross">
                                <line x1="32" y1="19" x2="32" y2="33" stroke="#ffffff" strokeWidth="4" strokeLinecap="round" />
                                <line x1="25" y1="26" x2="39" y2="26" stroke="#ffffff" strokeWidth="4" strokeLinecap="round" />
                            </g>
                        </svg>
                    </button>
                </div>,
                document.body
            )}
        </div>
    );
}

export default Gallery;
