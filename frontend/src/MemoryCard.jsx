import { useRef } from 'react';
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
}) {
    const slotRef = useRef(null);

    const handleSlotClick = (e) => {
        if (!placingNote) return;
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
    };

    return (
        <div
            ref={slotRef}
            className={`photo-slot ${placingNote ? 'sticky-placement-target' : ''}`}
            onClick={handleSlotClick}
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
    const layoutClass = `card-base memory-card ${props.layout || 'layout-1'}`;

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

    const handleDelete = () => {
        if (window.confirm(`Delete "${props.title}"?`)) {
            props.onDelete();
        }
    };

    return (
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
                <div className="photo-grid">
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
    );
}

export default MemoryCard;
