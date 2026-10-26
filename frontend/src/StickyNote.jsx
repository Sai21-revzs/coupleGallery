import { useState, useRef, useEffect } from 'react';
import './StickyNote.css';

export const STICKY_COLORS = [
    { id: 'white', label: 'Soft White', hex: '#ffffff' },
    { id: 'pink', label: 'Light Pink', hex: '#ffe4ef' },
    { id: 'purple', label: 'Light Purple', hex: '#f0e2ff' },
    { id: 'yellow', label: 'Light Yellow', hex: '#fff7c2' },
];

function StickyNote({
    note,
    variant = 'page', // 'page' | 'photo'
    containerRef,
    onUpdate,
    onDelete,
    autoFocus = false,
}) {
    const [text, setText] = useState(note.content || '');
    const [color, setColor] = useState(note.color || 'yellow');
    const [pos, setPos] = useState({ x: Number(note.pos_x) || 50, y: Number(note.pos_y) || 50 });
    const [dragging, setDragging] = useState(false);

    // Locked after saving; only editable when newly created (empty) or when user clicks the Edit icon
    const [isEditing, setIsEditing] = useState(() => Boolean(autoFocus || !note.content));
    // Colors & action controls only appear when the user clicks the sticky note
    const [isSelected, setIsSelected] = useState(() => Boolean(autoFocus || !note.content));

    const noteRef = useRef(null);
    const textareaRef = useRef(null);
    const dragOffsetRef = useRef({ dx: 0, dy: 0 });
    const latestPosRef = useRef(pos);

    useEffect(() => {
        if (!isEditing) {
            setText(note.content || '');
        }
    }, [note.content, isEditing]);

    useEffect(() => {
        setColor(note.color || 'yellow');
    }, [note.color]);

    useEffect(() => {
        if (!dragging) {
            const next = { x: Number(note.pos_x) || 50, y: Number(note.pos_y) || 50 };
            setPos(next);
            latestPosRef.current = next;
        }
    }, [note.pos_x, note.pos_y, dragging]);

    useEffect(() => {
        if (isEditing && textareaRef.current) {
            textareaRef.current.focus();
            const len = textareaRef.current.value.length;
            textareaRef.current.setSelectionRange(len, len);
        }
    }, [isEditing]);

    // Close color palette / selection when clicking outside the sticky note
    useEffect(() => {
        if (!isSelected && !isEditing) return;

        const handleOutsidePointerDown = (e) => {
            if (noteRef.current && !noteRef.current.contains(e.target)) {
                if (isEditing) {
                    onUpdate(note.id, { content: text });
                    setIsEditing(false);
                }
                setIsSelected(false);
            }
        };

        document.addEventListener('pointerdown', handleOutsidePointerDown);
        return () => document.removeEventListener('pointerdown', handleOutsidePointerDown);
    }, [isSelected, isEditing, note.id, onUpdate, text]);

    const handleSaveText = (e) => {
        if (e) e.stopPropagation();
        onUpdate(note.id, { content: text });
        setIsEditing(false);
    };

    const handleStartEdit = (e) => {
        e.stopPropagation();
        setIsSelected(true);
        setIsEditing(true);
    };

    const handleColorChange = (e, newColor) => {
        e.stopPropagation();
        setColor(newColor);
        onUpdate(note.id, { color: newColor });
    };

    const handleNoteClick = (e) => {
        e.stopPropagation();
        setIsSelected(true);
    };

    const handlePointerDown = (e) => {
        // Ignore clicks on buttons or textarea
        if (e.target.closest('button') || e.target.closest('textarea')) return;
        e.preventDefault();
        e.stopPropagation();

        setIsSelected(true);

        const containerEl = containerRef?.current;
        const noteEl = noteRef.current;
        if (!noteEl) return;

        const noteRect = noteEl.getBoundingClientRect();
        dragOffsetRef.current = {
            dx: e.clientX - noteRect.left,
            dy: e.clientY - noteRect.top,
        };
        let moved = false;
        setDragging(true);

        const handlePointerMove = (moveEvent) => {
            moved = true;
            if (variant === 'photo' && containerEl) {
                const cRect = containerEl.getBoundingClientRect();
                const rawX = moveEvent.clientX - cRect.left - dragOffsetRef.current.dx + noteRect.width / 2;
                const rawY = moveEvent.clientY - cRect.top - dragOffsetRef.current.dy + noteRect.height / 2;
                const pctX = Math.max(8, Math.min(92, (rawX / Math.max(1, cRect.width)) * 100));
                const pctY = Math.max(10, Math.min(90, (rawY / Math.max(1, cRect.height)) * 100));
                const next = { x: Math.round(pctX * 10) / 10, y: Math.round(pctY * 10) / 10 };
                latestPosRef.current = next;
                setPos(next);
            } else {
                const cRect = containerEl
                    ? containerEl.getBoundingClientRect()
                    : { left: 0, top: 0, width: window.innerWidth, height: document.documentElement.scrollHeight };
                const rawX = moveEvent.clientX - cRect.left - dragOffsetRef.current.dx;
                const rawY = moveEvent.clientY - cRect.top - dragOffsetRef.current.dy;
                const maxX = Math.max(40, (containerEl ? containerEl.scrollWidth : window.innerWidth) - noteRect.width - 8);
                const maxY = Math.max(80, (containerEl ? containerEl.scrollHeight : document.documentElement.scrollHeight) - noteRect.height - 8);
                const clampedX = Math.max(8, Math.min(maxX, rawX));
                const clampedY = Math.max(68, Math.min(maxY, rawY));
                const next = { x: Math.round(clampedX), y: Math.round(clampedY) };
                latestPosRef.current = next;
                setPos(next);
            }
        };

        const handlePointerUp = () => {
            window.removeEventListener('pointermove', handlePointerMove);
            window.removeEventListener('pointerup', handlePointerUp);
            setDragging(false);
            if (moved) {
                onUpdate(note.id, {
                    pos_x: latestPosRef.current.x,
                    pos_y: latestPosRef.current.y,
                });
            }
        };

        window.addEventListener('pointermove', handlePointerMove);
        window.addEventListener('pointerup', handlePointerUp);
    };

    const style = variant === 'photo'
        ? {
            left: `${pos.x}%`,
            top: `${pos.y}%`,
            transform: 'translate(-50%, -50%)',
        }
        : {
            left: `${pos.x}px`,
            top: `${pos.y}px`,
        };

    return (
        <div
            ref={noteRef}
            className={`sticky-note sticky-note-${variant} sticky-color-${color} ${isSelected ? 'is-selected' : ''} ${isEditing ? 'is-editing' : 'is-locked'} ${dragging ? 'is-dragging' : ''}`}
            style={style}
            onClick={handleNoteClick}
            onPointerDown={handlePointerDown}
        >
            {/* Top bar: pin + (when clicked/selected) 4 color swatches, Edit/Save icon, Delete icon */}
            <div className="sticky-note-header" title="Drag to move note">
                <span className="sticky-pin" aria-hidden="true">📌</span>

                {isSelected && (
                    <div className="sticky-swatches" role="radiogroup" aria-label="Sticky note color">
                        {STICKY_COLORS.map((c) => (
                            <button
                                key={c.id}
                                type="button"
                                className={`sticky-swatch swatch-${c.id} ${color === c.id ? 'active' : ''}`}
                                onClick={(e) => handleColorChange(e, c.id)}
                                title={c.label}
                                aria-label={c.label}
                                aria-checked={color === c.id}
                            />
                        ))}
                    </div>
                )}

                <div className="sticky-actions">
                    {isEditing ? (
                        <button
                            type="button"
                            className="sticky-action-btn sticky-save-btn"
                            onClick={handleSaveText}
                            title="Save note"
                            aria-label="Save note"
                        >
                            ✓
                        </button>
                    ) : (
                        <button
                            type="button"
                            className="sticky-action-btn sticky-edit-btn"
                            onClick={handleStartEdit}
                            title="Edit note text"
                            aria-label="Edit note text"
                        >
                            ✎
                        </button>
                    )}

                    {isSelected && (
                        <button
                            type="button"
                            className="sticky-action-btn sticky-delete-btn"
                            onClick={(e) => {
                                e.stopPropagation();
                                onDelete(note.id);
                            }}
                            title="Delete sticky note"
                            aria-label="Delete sticky note"
                        >
                            ✕
                        </button>
                    )}
                </div>
            </div>

            {/* Body: only editable when isEditing is true; otherwise locked read-only text */}
            {isEditing ? (
                <textarea
                    ref={textareaRef}
                    className="sticky-note-textarea"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Escape') {
                            handleSaveText(e);
                        }
                    }}
                    placeholder="Write a note..."
                    rows={variant === 'photo' ? 2 : 4}
                    maxLength={2000}
                />
            ) : (
                <div className="sticky-note-content">
                    {text.trim() ? (
                        text
                    ) : (
                        <span className="sticky-note-placeholder">Empty note (click ✎ to write)</span>
                    )}
                </div>
            )}
        </div>
    );
}

export default StickyNote;
