import { useState, useRef, useEffect } from 'react';
import { API_URL, mediaUrl } from './constants';

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const IMAGE_EXTS = ['.jpg', '.jpeg', '.png', '.webp'];

function Navbar({ count, onHome, user, token, onUpdateUser, onLogout }) {
    const [editing, setEditing] = useState(false);
    const [nameInput, setNameInput] = useState('');
    const [avatarFile, setAvatarFile] = useState(null);
    const [avatarPreview, setAvatarPreview] = useState('');
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);
    const fileInputRef = useRef(null);

    const displayName = user?.username || (user?.email ? user.email.split('@')[0] : 'User');
    const currentAvatarUrl = user?.avatar_path ? mediaUrl(user.avatar_path) : '';

    useEffect(() => {
        return () => {
            if (avatarPreview) URL.revokeObjectURL(avatarPreview);
        };
    }, [avatarPreview]);

    const openEditModal = () => {
        setNameInput(displayName);
        if (avatarPreview) URL.revokeObjectURL(avatarPreview);
        setAvatarFile(null);
        setAvatarPreview('');
        setError('');
        setEditing(true);
    };

    const closeEditModal = () => {
        if (avatarPreview) URL.revokeObjectURL(avatarPreview);
        setAvatarFile(null);
        setAvatarPreview('');
        setError('');
        setEditing(false);
    };

    const handleAvatarChange = (e) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file) return;
        setError('');

        const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
        if (!IMAGE_TYPES.includes(file.type) || !IMAGE_EXTS.includes(ext)) {
            setError('Please choose a JPG, JPEG, PNG, or WebP image.');
            return;
        }
        if (file.size > 10 * 1024 * 1024) {
            setError('Profile picture must be 10 MB or less.');
            return;
        }

        if (avatarPreview) URL.revokeObjectURL(avatarPreview);
        setAvatarFile(file);
        setAvatarPreview(URL.createObjectURL(file));
    };

    const handleSaveProfile = async (e) => {
        e.preventDefault();
        setError('');

        const trimmed = nameInput.trim();
        if (!trimmed) {
            return setError('Please enter your name.');
        }

        const formData = new FormData();
        formData.append('username', trimmed);
        if (avatarFile) {
            formData.append('avatar', avatarFile);
        }

        setSaving(true);
        try {
            const response = await fetch(`${API_URL}/api/auth/profile`, {
                method: 'PUT',
                headers: token ? { Authorization: `Bearer ${token}` } : {},
                body: formData,
            });
            const data = await response.json().catch(() => ({}));
            if (!response.ok || !data.success) {
                throw new Error(data.error || 'Could not update profile.');
            }
            if (onUpdateUser) {
                onUpdateUser(data.user);
            }
            closeEditModal();
        } catch (err) {
            setError(err.message || 'Could not update profile.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <>
            <nav className="navbar">
                <button className="nav-brand" onClick={onHome} title="Back to home">
                    <span className="nav-heart">♥</span>
                    <span className="nav-title">a memory of us</span>
                </button>

                <div className="nav-actions">
                    <span className="nav-count">
                        {count} {count === 1 ? 'memory' : 'memories'}
                    </span>
                    <button className="btn btn-ghost" onClick={onHome}>
                        Home
                    </button>
                    {onLogout && (
                        <button className="btn btn-ghost nav-logout" onClick={onLogout}>
                            Log out
                        </button>
                    )}
                    <button
                        type="button"
                        className="nav-profile-btn"
                        onClick={openEditModal}
                        title="Click to edit profile"
                    >
                        <span className="nav-avatar">
                            {currentAvatarUrl ? (
                                <img src={currentAvatarUrl} alt={displayName} />
                            ) : (
                                <span className="nav-avatar-placeholder">
                                    {displayName.charAt(0).toUpperCase()}
                                </span>
                            )}
                        </span>
                        <span className="nav-username">{displayName}</span>
                    </button>
                </div>
            </nav>

            {editing && (
                <div className="profile-modal-backdrop" onClick={closeEditModal}>
                    <div
                        className="profile-modal"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="profile-modal-title"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3 id="profile-modal-title" className="profile-modal-title">
                            Edit Profile
                        </h3>

                        <form onSubmit={handleSaveProfile} className="profile-modal-form">
                            <div className="profile-avatar-editor">
                                <button
                                    type="button"
                                    className="profile-avatar-preview"
                                    onClick={() => fileInputRef.current?.click()}
                                    title="Upload profile picture"
                                >
                                    {avatarPreview || currentAvatarUrl ? (
                                        <img src={avatarPreview || currentAvatarUrl} alt="Profile preview" />
                                    ) : (
                                        <span className="profile-avatar-initial">
                                            {(nameInput.trim() || displayName).charAt(0).toUpperCase()}
                                        </span>
                                    )}
                                </button>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                                    onChange={handleAvatarChange}
                                    hidden
                                />
                                <button
                                    type="button"
                                    className="btn btn-ghost profile-upload-btn"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    Upload Picture
                                </button>
                            </div>

                            <div className="profile-field">
                                <label htmlFor="profile-name-input">Name</label>
                                <input
                                    id="profile-name-input"
                                    type="text"
                                    value={nameInput}
                                    maxLength={100}
                                    placeholder="Your name"
                                    onChange={(e) => setNameInput(e.target.value)}
                                    disabled={saving}
                                />
                            </div>

                            {error && (
                                <p className="profile-error" role="alert">
                                    ⚠ {error}
                                </p>
                            )}

                            <div className="profile-modal-actions">
                                <button
                                    type="button"
                                    className="btn btn-ghost"
                                    onClick={closeEditModal}
                                    disabled={saving}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                    disabled={saving}
                                >
                                    {saving ? 'Saving…' : 'Save Profile'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}

export default Navbar;
