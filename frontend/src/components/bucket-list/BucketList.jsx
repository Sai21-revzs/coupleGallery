import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import './BucketList.css';

function BucketListRow({ item, autoFocus, onUpdate, onDelete }) {
    const [text, setText] = useState(item.content || '');
    const inputRef = useRef(null);
    const saveTimerRef = useRef(null);

    useEffect(() => {
        setText(item.content || '');
    }, [item.content]);

    useEffect(() => {
        if (inputRef.current) {
            inputRef.current.style.height = 'auto';
            inputRef.current.style.height = `${inputRef.current.scrollHeight}px`;
        }
    }, [text]);

    useEffect(() => {
        if (autoFocus && inputRef.current) {
            inputRef.current.focus();
        }
    }, [autoFocus]);

    useEffect(() => {
        return () => {
            if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        };
    }, []);

    const handleTextChange = (e) => {
        const val = e.target.value;
        setText(val);
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        saveTimerRef.current = setTimeout(() => {
            onUpdate(item.id, { content: val });
        }, 350);
    };

    const handleToggleDone = () => {
        onUpdate(item.id, { is_done: !item.is_done });
    };

    return (
        <li className={`bucket-bullet-row ${item.is_done ? 'is-done' : ''}`}>
            <button
                type="button"
                className={`bucket-check-btn ${item.is_done ? 'checked' : ''}`}
                onClick={handleToggleDone}
                title={item.is_done ? 'Mark as want to do' : 'Mark as done'}
                aria-label={item.is_done ? 'Mark as want to do' : 'Mark as done'}
                aria-pressed={item.is_done}
            >
                {item.is_done ? '✓' : '•'}
            </button>

            <div className="bucket-text-wrapper">
                <textarea
                    ref={inputRef}
                    className="bucket-bullet-input"
                    value={text}
                    onChange={handleTextChange}
                    placeholder="Write something we want to do together..."
                    rows={1}
                />
                <span className="bucket-strike-line" aria-hidden="true" />
            </div>

            <button
                type="button"
                className="bucket-remove-btn"
                onClick={() => onDelete(item.id)}
                title="Remove item"
                aria-label="Remove item"
            >
                ✕
            </button>
        </li>
    );
}

function BucketList({
    items = [],
    onAdd,
    onUpdate,
    onDelete,
    onClose,
    newestItemId,
}) {
    const doneCount = items.filter(i => i.is_done).length;
    const todoCount = items.length - doneCount;

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && onClose) {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    return createPortal(
        <div
            className="bucket-modal-backdrop"
            onClick={onClose}
            role="presentation"
        >
            <div
                className="bucket-list-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="bucket-modal-title"
                onClick={(e) => e.stopPropagation()}
            >
                <header className="bucket-list-header">
                    <div className="bucket-header-titles">
                        <h3 id="bucket-modal-title" className="bucket-title">Our Bucket List</h3>
                        <p className="bucket-subtitle">
                            dreams to chase &amp; memories we&apos;ve checked off ({doneCount} done · {todoCount} to go)
                        </p>
                    </div>

                    <div className="bucket-header-actions">
                        <button
                            type="button"
                            className="bucket-plus-btn"
                            onClick={onAdd}
                            title="Add new bucket list bullet"
                            aria-label="Add new bucket list bullet"
                        >
                            +
                        </button>
                        <button
                            type="button"
                            className="bucket-close-btn"
                            onClick={onClose}
                            title="Close bucket list"
                            aria-label="Close bucket list"
                        >
                            ✕
                        </button>
                    </div>
                </header>

                <div className="bucket-modal-body">
                    {items.length === 0 ? (
                        <div className="bucket-empty">
                            <p>Your bucket list is empty. Click the <strong>+</strong> button to add your first bullet!</p>
                            <button type="button" className="btn btn-primary bucket-empty-add" onClick={onAdd}>
                                <span className="btn-icon">+</span> Add Bucket List Item
                            </button>
                        </div>
                    ) : (
                        <ul className="bucket-bullet-list">
                            {items.map((item) => (
                                <BucketListRow
                                    key={item.id}
                                    item={item}
                                    autoFocus={item.id === newestItemId}
                                    onUpdate={onUpdate}
                                    onDelete={onDelete}
                                />
                            ))}
                        </ul>
                    )}
                </div>

                <footer className="bucket-footer">
                    {items.length > 0 && (
                        <button
                            type="button"
                            className="bucket-inline-add-btn"
                            onClick={onAdd}
                        >
                            <span className="bucket-inline-plus">+</span> Add another bullet
                        </button>
                    )}
                    <button
                        type="button"
                        className="btn btn-ghost bucket-done-close-btn"
                        onClick={onClose}
                    >
                        Close
                    </button>
                </footer>
            </div>
        </div>,
        document.body
    );
}

export default BucketList;
