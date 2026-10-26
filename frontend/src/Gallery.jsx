import { useState } from 'react';
import { createPortal } from 'react-dom';
import MemoryCard from './MemoryCard';
import CreateMemory from './createMemory';
import Navbar from './Navbar';
import './Gallery.css';

function Gallery({ memories, setMemories, deleteMemory, onHome, token, user, onUpdateUser, onLogout }) {

    const [showForm, openForm] = useState(false);
    const [search, setSearch] = useState('');

    const filtered = memories.filter(m =>
        (m.title || '').toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="gallery-page">
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

            {showForm ? (
                <main className="form-wrapper">
                    <div className="form-panel">
                        <CreateMemory onCancel={() => openForm(false)} //2
                            memories={memories}
                            setMemories={setMemories}
                            token={token}
                            onLogout={onLogout} /> {/* 1 */}
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
                                        title={image.title}
                                        date={image.date}
                                        layout={image.layout}
                                        photos={image.photos}
                                        music_path={image.music_path}
                                        music_name={image.music_name}
                                        onDelete={() => deleteMemory(image.id)}
                                    />
                                </div>
                            ))}
                        </div>
                    )}

                    {createPortal(
                        <button
                            type="button"
                            className="btn btn-primary fab-add-memory"
                            onClick={() => openForm(true)}
                        >
                            <span className="btn-icon">+</span> Add Memory
                        </button>,
                        document.body
                    )}
                </main>
            )}
        </div>
    );
}

export default Gallery;
