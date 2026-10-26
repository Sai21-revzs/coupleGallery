import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { mediaUrl } from './constants';
import MusicPlayer from './MusicPlayer';
import StickyNote from './StickyNote';

function PhotoSlotWithNotes({
    photo,
    photoIndex,
    title,
    memoryId,
    notes,
    placingNote,
    onCreateNote,
    onUpdateNote,
    onDeleteNote,
    newNoteId,
    onEnlarge,
    enlarged = false,
}) {
    const slotRef = useRef(null);

    const handleSlotClick = (e) => {
        // Ignore clicks on sticky notes inside the photo
        if (e.target.closest('.sticky-note')) return;

        if (placingNote) {
            e.stopPropagation();
            const rect = slotRef.current?.getBoundingClientRect();
            let pctX = 50;
            let pctY = 50;
            if (rect && rect.width > 0 && rect.height > 0) {
                pctX = Math.max(12, Math.min(88, ((e.clientX - rect.left) / rect.width) * 100));
                pctY = Math.max(15, Math.min(85, ((e.clientY - rect.top) / rect.height) * 100));
            }
            onCreateNote({
                memory_id: memoryId,
                photo_index: photoIndex,
                pos_x: Math.round(pctX * 10) / 10,
                pos_y: Math.round(pctY * 10) / 10,
            });
            return;
        }

        if (!enlarged && onEnlarge) {
            e.stopPropagation();
            onEnlarge();
        }
    };

    return (
        <div
            ref={slotRef}
            className={`photo-slot ${placingNote ? 'sticky-placement-target' : ''} ${!placingNote && !enlarged ? 'photo-slot-zoomable' : ''}`}
            onClick={handleSlotClick}
            title={!placingNote && !enlarged ? 'Click to enlarge picture' : undefined}
        >
            <img
                src={mediaUrl(photo)}
                alt={`${title} - photo ${photoIndex + 1}`}
                loading="lazy"
            />

            {notes.map((note) => (
                <StickyNote
                    key={note.id}
                    note={note}
                    variant="photo"
                    containerRef={slotRef}
                    onUpdate={onUpdateNote}
                    onDelete={onDeleteNote}
                    autoFocus={note.id === newNoteId}
                />
            ))}
        </div>
    );
}

function MemoryCard(props) {
    const [enlarged, setEnlarged] = useState(false);
    const layout = props.layout || 'layout-1';
    const layoutClass = `card-base memory-card ${layout}`;

    const photos = Array.isArray(props.photos) ? props.photos : [];
    const cardNotes = Array.isArray(props.notes) ? props.notes : [];

    // Show dates like "Oct 7, 2026" when possible
    const formattedDate = (() => {
        if (!props.date) return '';
        const d = new Date(props.date);
        return isNaN(d) ? props.date : d.toLocaleDateString(undefined, {
            month: 'short', day: 'numeric', year: 'numeric'
        });
    })();

    useEffect(() => {
        if (!enlarged) return;
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                setEnlarged(false);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [enlarged]);

    const handleDelete = () => {
        if (window.confirm(`Delete "${props.title}"?`)) {
            props.onDelete();
        }
    };

    const handleGridClick = (e) => {
        if (e.target.closest('.sticky-note')) return;
        if (!props.placingNote) {
            setEnlarged(true);
        }
    };

    return (
        <>
            <div className={layoutClass}>
                <button
                    className="card-delete"
                    onClick={handleDelete}
                    title="Delete memory"
                    aria-label="Delete memory"
                >
                    ✕
                </button>

                {photos.length > 0 ? (
                    <div
                        className={`photo-grid ${!props.placingNote ? 'photo-grid-clickable' : ''}`}
                        onClick={handleGridClick}
                    >
                        {photos.map((photo, i) => (
                            <PhotoSlotWithNotes
                                key={i}
                                photo={photo}
                                photoIndex={i}
                                title={props.title}
                                memoryId={props.id}
                                notes={cardNotes.filter(n => Number(n.photo_index) === i)}
                                placingNote={props.placingNote}
                                onCreateNote={props.onCreateNote}
                                onUpdateNote={props.onUpdateNote}
                                onDeleteNote={props.onDeleteNote}
                                newNoteId={props.newNoteId}
                                onEnlarge={() => setEnlarged(true)}
                            />
                        ))}
                    </div>
                ) : null}

                <div className="card-text">
                    <h3>{props.title}</h3>
                    <p>{formattedDate}</p>
                </div>

                {props.music_path && (
                    <div className="card-music">
                        <MusicPlayer
                            src={mediaUrl(props.music_path)}
                            name={props.music_name || 'Soundtrack'}
                            compact={true}
                        />
                    </div>
                )}
            </div>

            {/* Enlarged Photo Grid Lightbox Modal */}
            {enlarged && createPortal(
                <div
                    className="enlarged-grid-backdrop"
                    onClick={() => setEnlarged(false)}
                    role="presentation"
                >
                    <div
                        className={`enlarged-memory-card card-base memory-card ${layout}`}
                        role="dialog"
                        aria-modal="true"
                        aria-label={`${props.title} enlarged view`}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            type="button"
                            className="enlarged-close-btn"
                            onClick={() => setEnlarged(false)}
                            title="Close enlarged view"
                            aria-label="Close enlarged view"
                        >
                            ✕
                        </button>

                        {photos.length > 0 && (
                            <div className="photo-grid enlarged-photo-grid">
                                {photos.map((photo, i) => (
                                    <PhotoSlotWithNotes
                                        key={i}
                                        photo={photo}
                                        photoIndex={i}
                                        title={props.title}
                                        memoryId={props.id}
                                        notes={cardNotes.filter(n => Number(n.photo_index) === i)}
                                        placingNote={props.placingNote}
                                        onCreateNote={props.onCreateNote}
                                        onUpdateNote={props.onUpdateNote}
                                        onDeleteNote={props.onDeleteNote}
                                        newNoteId={props.newNoteId}
                                        enlarged={true}
                                    />
                                ))}
                            </div>
                        )}

                        <div className="card-text enlarged-card-text">
                            <h3>{props.title}</h3>
                            <p>{formattedDate}</p>
                        </div>

                        {props.music_path && (
                            <div className="card-music">
                                <MusicPlayer
                                    src={mediaUrl(props.music_path)}
                                    name={props.music_name || 'Soundtrack'}
                                    compact={false}
                                />
                            </div>
                        )}
                    </div>
                </div>,
                document.body
            )}
        </>
    );
}

export default MemoryCard;
