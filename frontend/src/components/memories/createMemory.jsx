import { useEffect, useRef, useState } from 'react';
import { API_URL, LAYOUTS, getLayout } from '../../services/constants';
import MusicPlayer from '../common/MusicPlayer';
import './CreateMemory.css';

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const IMAGE_EXTS = ['.jpg', '.jpeg', '.png', '.webp'];
const MAX_PHOTO_MB = 10;
const MAX_MUSIC_MB = 20;

const extOf = (name) => name.slice(name.lastIndexOf('.')).toLowerCase();

// Warning shown whenever the photo count does not match the layout
function photoCountWarning(layout, count) {
    if (!layout || count === layout.count) return '';
    switch (layout.value) {
        case 'layout-1': return 'Please upload exactly 1 photo for the Solo layout.';
        case 'layout-2h': return 'The Horizontal layout requires exactly 2 photos.';
        case 'layout-2v': return 'The Vertical layout requires exactly 2 photos.';
        case 'layout-4':
            return count < 4
                ? 'The Window Grid layout requires exactly 4 photos. Please upload the remaining photos.'
                : 'Maximum of 4 photos allowed for the Window Grid layout. Remove the excess photos.';
        default: return '';
    }
}

// Make sure the file is a real, readable image (not just a renamed file)
const canDecodeImage = (url) => new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img.naturalWidth > 0);
    img.onerror = () => resolve(false);
    img.src = url;
});

function CreateMemory(props) {

    const [layout, setLayout] = useState(null); // no layout until the user picks one
    const [title, setTitle] = useState('');
    const [date, setDate] = useState('')
    const [photos, setPhotos] = useState([]);   // [{ id, file, url }]
    const [music, setMusic] = useState(null);   // { file, url }
    const [pendingLayout, setPendingLayout] = useState(null);
    const [photoError, setPhotoError] = useState('');
    const [musicError, setMusicError] = useState('');
    const [notice, setNotice] = useState('');
    const [checking, setChecking] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [serverError, setServerError] = useState('');

    const photoInputRef = useRef(null);
    const musicInputRef = useRef(null);
    const replaceIndexRef = useRef(null);

    // Free temporary preview URLs when the form closes
    const urlsRef = useRef({ photos, music });
    urlsRef.current = { photos, music };
    useEffect(() => () => {
        urlsRef.current.photos.forEach(p => URL.revokeObjectURL(p.url));
        if (urlsRef.current.music) URL.revokeObjectURL(urlsRef.current.music.url);
    }, []);

    const selected = getLayout(layout);
    const required = selected?.count ?? 0;
    const countWarning = photoCountWarning(selected, photos.length);
    const canSave = !!selected && title.trim() !== '' && photos.length === required && !checking && !submitting;

    // ---------- Layout ----------

    const applyLayout = (value) => {
        photos.forEach(p => URL.revokeObjectURL(p.url));
        setPhotos([]);
        setPhotoError('');
        setLayout(value);
        setPendingLayout(null);
    };

    const chooseLayout = (value) => {
        if (value === layout) return;
        if (photos.length > 0) {
            setPendingLayout(value); // ask before clearing their photos
            return;
        }
        setNotice('');
        applyLayout(value);
    };

    const confirmLayoutChange = () => {
        const next = getLayout(pendingLayout);
        applyLayout(pendingLayout);
        setNotice(`Photos cleared. Please select exactly ${next.count} ${next.count === 1 ? 'photo' : 'photos'} for the ${next.name} layout.`);
    };

    // ---------- Photos ----------

    const openPicker = (replaceIndex = null) => {
        replaceIndexRef.current = replaceIndex;
        photoInputRef.current.multiple = replaceIndex === null && required > 1;
        photoInputRef.current.click();
    };

    const validateImages = async (files) => {
        const valid = [];
        const errors = [];
        for (const file of files) {
            if (!IMAGE_TYPES.includes(file.type) || !IMAGE_EXTS.includes(extOf(file.name))) {
                errors.push(`"${file.name}" is not supported. Use JPG, JPEG, PNG or WebP.`);
                continue;
            }
            if (file.size > MAX_PHOTO_MB * 1024 * 1024) {
                errors.push(`"${file.name}" is larger than ${MAX_PHOTO_MB} MB.`);
                continue;
            }
            const url = URL.createObjectURL(file);
            if (!(await canDecodeImage(url))) {
                URL.revokeObjectURL(url);
                errors.push(`"${file.name}" is not a valid image file.`);
                continue;
            }
            valid.push({ id: crypto.randomUUID(), file, url });
        }
        return { valid, errors };
    };

    const handlePhotoFiles = async (e) => {
        const files = Array.from(e.target.files || []);
        e.target.value = ''; // allow picking the same file again later
        if (!selected || files.length === 0) return;

        const replaceIndex = replaceIndexRef.current;
        setPhotoError('');
        setNotice('');

        // Block selections that would go over the layout's limit
        if (replaceIndex === null && photos.length + files.length > required) {
            const remaining = required - photos.length;
            setPhotoError(
                selected.value === 'layout-4'
                    ? 'Maximum of 4 photos allowed for the Window Grid layout. Remove the excess photos.'
                    : `${photoCountWarning(selected, photos.length + files.length)} You selected ${files.length}, but only ${remaining} more can be added.`
            );
            return;
        }

        setChecking(true);
        const { valid, errors } = await validateImages(replaceIndex === null ? files : files.slice(0, 1));
        setChecking(false);
        if (errors.length) setPhotoError(errors.join(' '));
        if (valid.length === 0) return;

        if (replaceIndex !== null) {
            setPhotos(prev => prev.map((p, i) => {
                if (i !== replaceIndex) return p;
                URL.revokeObjectURL(p.url);
                return valid[0];
            }));
        } else {
            setPhotos(prev => [...prev, ...valid]);
        }
    };

    const removePhoto = (index) => {
        setPhotos(prev => {
            URL.revokeObjectURL(prev[index].url);
            return prev.filter((_, i) => i !== index);
        });
        setPhotoError('');
    };

    // ---------- Music ----------

    const handleMusicFile = (e) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file) return;
        setMusicError('');

        const typeOk = ['audio/mpeg', 'audio/mp3', ''].includes(file.type);
        if (extOf(file.name) !== '.mp3' || !typeOk) {
            setMusicError(`"${file.name}" is not an MP3 file. Please choose a .mp3 file from your computer.`);
            return;
        }
        if (file.size > MAX_MUSIC_MB * 1024 * 1024) {
            setMusicError(`"${file.name}" is larger than ${MAX_MUSIC_MB} MB.`);
            return;
        }
        if (music) URL.revokeObjectURL(music.url);
        setMusic({ file, url: URL.createObjectURL(file) });
    };

    const removeMusic = () => {
        if (music) URL.revokeObjectURL(music.url);
        setMusic(null);
        setMusicError('');
    };

    // ---------- Submit ----------

    const handleSubmit = (e) => {
        e.preventDefault();
        setServerError('');

        // Double-check everything even though the button is disabled
        if (!selected) return setServerError('Please choose a layout.');
        if (!title.trim()) return setServerError('Please enter a title.');
        if (photos.length !== required) return setServerError(countWarning);

        const data = new FormData();
        data.append('title', title.trim());
        data.append('date', date);
        data.append('layout', layout);
        photos.forEach(p => data.append('photos', p.file));
        if (music) data.append('music', music.file);

        setSubmitting(true);
        fetch(`${API_URL}/api/memories`, {
            method: 'POST',
            headers: props.token ? { Authorization: `Bearer ${props.token}` } : {},
            body: data // the browser sets the multipart Content-Type for us
        })
            .then(async response => {
                if (response.status === 401 && props.onLogout) {
                    props.onLogout();
                    throw new Error('Session expired. Please log in again.');
                }
                const data = await response.json().catch(() => ({}));
                if (!response.ok || !data.success) throw new Error(data.error || 'Could not save the memory.');
                return data;
            })
            .then(data => {
                console.log("Server replied:", data)
                props.setMemories([data.added, ...props.memories]); //1
                props.onCancel(); //2
            })
            .catch(err => {
                setServerError(err.message === 'Failed to fetch' ? 'Cannot reach the server. Is the backend running?' : err.message);
            })
            .finally(() => setSubmitting(false));
    };

    // Explain why Save is disabled
    const missing = [];
    if (!selected) missing.push('choose a layout');
    if (!title.trim()) missing.push('add a title');
    if (selected && photos.length !== required) missing.push(`select exactly ${required} ${required === 1 ? 'photo' : 'photos'}`);

    return (
        <div className="create-memory">
            <h2>Add a New Memory</h2>

            <form onSubmit={handleSubmit} className="cm-form">
                {/* ---------- 1. Layout ---------- */}
                <section className="cm-section">
                    <h3 className="cm-step"><span>1</span> Choose a layout</h3>
                    <div className="layout-options" role="radiogroup" aria-label="Photo layout">
                        {LAYOUTS.map(l => (
                            <button
                                key={l.value}
                                id={`layout-option-${l.value}`}
                                type="button"
                                role="radio"
                                aria-checked={layout === l.value}
                                className={`layout-option ${layout === l.value ? 'selected' : ''}`}
                                onClick={() => chooseLayout(l.value)}
                            >
                                <span className={`layout-preview ${l.value}`} aria-hidden="true">
                                    {Array.from({ length: l.count }, (_, i) => <span key={i} />)}
                                </span>
                                <span className="layout-name">{l.name}</span>
                                <span className="layout-count">{l.count} {l.count === 1 ? 'photo' : 'photos'}</span>
                                {layout === l.value && <span className="layout-check" aria-hidden="true">✓</span>}
                            </button>
                        ))}
                    </div>

                    {pendingLayout && (
                        <div className="cm-confirm" role="alertdialog" aria-live="assertive">
                            <p>
                                Switching to <strong>{getLayout(pendingLayout).name}</strong> will clear your{' '}
                                {photos.length} selected {photos.length === 1 ? 'photo' : 'photos'}. You will need to select exactly{' '}
                                {getLayout(pendingLayout).count} {getLayout(pendingLayout).count === 1 ? 'photo' : 'photos'}.
                            </p>
                            <div className="cm-confirm-actions">
                                <button type="button" className="cm-btn cm-btn-ghost" onClick={() => setPendingLayout(null)}>Keep current layout</button>
                                <button type="button" className="cm-btn cm-btn-danger" onClick={confirmLayoutChange}>Switch &amp; clear photos</button>
                            </div>
                        </div>
                    )}
                </section>

                {/* ---------- 2. Details ---------- */}
                <section className="cm-section">
                    <h3 className="cm-step"><span>2</span> Details</h3>
                    <div className="cm-fields">
                        <input
                            id="memory-title"
                            type="text"
                            placeholder="Memory Title"
                            value={title}
                            maxLength={255}
                            onChange={(e) => setTitle(e.target.value)}
                        />
                        <input
                            id="memory-date"
                            type="date"
                            placeholder='eg. 2026-10-07'
                            value={date}
                            onChange={(e) => setDate(e.target.value)} />
                    </div>
                </section>

                {/* ---------- 3. Photos ---------- */}
                <section className="cm-section">
                    <h3 className="cm-step"><span>3</span> Photos</h3>

                    <input
                        ref={photoInputRef}
                        type="file"
                        accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                        onChange={handlePhotoFiles}
                        hidden
                    />

                    {!selected ? (
                        <div className="upload-locked">
                            <span className="upload-locked-icon" aria-hidden="true">🖼</span>
                            Choose a layout above to start adding photos.
                        </div>
                    ) : (
                        <div className="upload-area">
                            <div className="upload-header">
                                <span className={`upload-counter ${photos.length === required ? 'complete' : ''}`}>
                                    {photos.length} of {required} {required === 1 ? 'photo' : 'photos'} selected
                                </span>
                                <button
                                    id="choose-photos"
                                    type="button"
                                    className="cm-btn cm-btn-primary"
                                    onClick={() => openPicker()}
                                    disabled={photos.length >= required || checking}
                                >
                                    {checking ? 'Checking…' : 'Choose Photos'}
                                </button>
                            </div>

                            <div className={`upload-grid ${selected.value}`}>
                                {Array.from({ length: required }, (_, i) => {
                                    const photo = photos[i];
                                    return photo ? (
                                        <div className="upload-slot filled" key={photo.id}>
                                            <img src={photo.url} alt={`Selected photo ${i + 1}`} />
                                            <div className="slot-actions">
                                                <button type="button" onClick={() => openPicker(i)} title="Replace photo">Replace</button>
                                                <button type="button" onClick={() => removePhoto(i)} title="Remove photo" aria-label="Remove photo">✕</button>
                                            </div>
                                        </div>
                                    ) : (
                                        <button
                                            type="button"
                                            className="upload-slot empty"
                                            key={`empty-${i}`}
                                            onClick={() => openPicker()}
                                            disabled={checking}
                                        >
                                            <span className="slot-plus">+</span>
                                            <span>Photo {i + 1}</span>
                                        </button>
                                    );
                                })}
                            </div>

                            <p className="upload-help">JPG, JPEG, PNG or WebP · up to {MAX_PHOTO_MB} MB each · files from your computer only</p>

                            {countWarning && <p className="cm-warning" role="alert">⚠ {countWarning}</p>}
                            {photoError && <p className="cm-error" role="alert">{photoError}</p>}
                            {notice && <p className="cm-notice">{notice}</p>}
                        </div>
                    )}
                </section>

                {/* ---------- 4. Music ---------- */}
                <section className="cm-section">
                    <h3 className="cm-step"><span>4</span> Soundtrack <em>(optional)</em></h3>

                    <input
                        ref={musicInputRef}
                        type="file"
                        accept=".mp3,audio/mpeg"
                        onChange={handleMusicFile}
                        hidden
                    />

                    {music ? (
                        <div className="music-selected">
                            <div className="music-file">
                                <span className="music-file-name" title={music.file.name}>♪ {music.file.name}</span>
                                <div className="music-file-actions">
                                    <button type="button" className="cm-link" onClick={() => musicInputRef.current.click()}>Replace</button>
                                    <button type="button" className="cm-link danger" onClick={removeMusic}>Remove</button>
                                </div>
                            </div>
                            <MusicPlayer src={music.url} name={music.file.name} />
                        </div>
                    ) : (
                        <button
                            id="upload-mp3"
                            type="button"
                            className="cm-btn cm-btn-outline music-upload"
                            onClick={() => musicInputRef.current.click()}
                        >
                            <span aria-hidden="true">♫</span> Upload MP3
                        </button>
                    )}
                    <p className="upload-help">One .mp3 file from your computer · up to {MAX_MUSIC_MB} MB · links are not supported</p>
                    {musicError && <p className="cm-error" role="alert">{musicError}</p>}
                </section>

                {serverError && <p className="cm-error cm-server-error" role="alert">{serverError}</p>}

                <button id="save-memory" type="submit" className="enter-button" disabled={!canSave}>
                    {submitting ? 'Saving…' : 'Save Memory'}
                </button>
                {!canSave && !submitting && missing.length > 0 && (
                    <p className="save-hint">To save, {missing.join(', ')}.</p>
                )}
                <button
                    type="button"
                    className="cm-cancel"
                    onClick={props.onCancel}
                >
                    Cancel
                </button>
            </form>
        </div>
    );
}

export default CreateMemory;