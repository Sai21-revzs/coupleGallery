import { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import MemoryCard from './MemoryCard';
import CreateMemory from './createMemory';
import Navbar from './Navbar';
import StickyNote, { STICKY_COLORS } from './StickyNote';
import { API_URL } from './constants';
import './Gallery.css';

function Gallery({
    memories,
    setMemories,
    deleteMemory,
    notes = [],
    setNotes,
    onHome,
    token,
    user,
    onUpdateUser,
    onLogout,
}) {
    const [showForm, openForm] = useState(false);
    const [search, setSearch] = useState('');
    const [placingNote, setPlacingNote] = useState(false);
    const [selectedNoteColor, setSelectedNoteColor] = useState('yellow');
    const [newNoteId, setNewNoteId] = useState(null);

    const galleryPageRef = useRef(null);

    const filtered = memories.filter(m =>
        (m.title || '').toLowerCase().includes(search.toLowerCase())
    );

    const pageNotes = notes.filter(n => n.memory_id == null);

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
                    color: selectedNoteColor,
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

    const handlePageClick = (e) => {
        if (!placingNote || showForm) return;
        // Ignore clicks on navbar, floating buttons, inputs, buttons, or existing sticky notes
        if (
            e.target.closest('.navbar') ||
            e.target.closest('.floating-actions-dock') ||
            e.target.closest('.sticky-placement-banner') ||
            e.target.closest('.sticky-note') ||
            e.target.closest('button') ||
            e.target.closest('input')
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
                    <span>📌 Click anywhere on the page or inside any picture to pin your sticky note</span>
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

            {!showForm && createPortal(
                <div className="floating-actions-dock">
                    <div className="sticky-dock-panel">
                        <div className="sticky-dock-palette" aria-label="Choose sticky note color">
                            <span className="sticky-dock-label">Note color:</span>
                            {STICKY_COLORS.map((c) => (
                                <button
                                    key={c.id}
                                    type="button"
                                    className={`sticky-dock-swatch swatch-${c.id} ${selectedNoteColor === c.id ? 'active' : ''}`}
                                    onClick={() => setSelectedNoteColor(c.id)}
                                    title={c.label}
                                    aria-label={c.label}
                                />
                            ))}
                        </div>

                        <button
                            type="button"
                            className={`btn fab-sticky-note ${placingNote ? 'active' : ''}`}
                            onClick={() => setPlacingNote(prev => !prev)}
                        >
                            <span className="btn-icon">📌</span>
                            {placingNote ? 'Click Page or Picture…' : '+ Sticky Note'}
                        </button>
                    </div>

                    <button
                        type="button"
                        className="btn btn-primary fab-add-memory"
                        onClick={() => {
                            setPlacingNote(false);
                            openForm(true);
                        }}
                    >
                        <span className="btn-icon">+</span> Add Memory
                    </button>
                </div>,
                document.body
            )}
        </div>
    );
}

export default Gallery;
