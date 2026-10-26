const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');


const app = express();

app.use(cors()); // Let our React frontend talk to us
app.use(express.json()); // Let our server read JSON data sent from forms


const pool = require('./db');

// ===================== DATABASE INITIALIZATION =====================
// Ensures the local PostgreSQL database (`memory_db`) has the required tables and columns.
async function initDatabase() {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS users (
            id            SERIAL PRIMARY KEY,
            username      VARCHAR(100),
            email         VARCHAR(255) UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            avatar_path   TEXT,
            created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    `);

    await pool.query(`
        ALTER TABLE users
            ADD COLUMN IF NOT EXISTS username VARCHAR(100),
            ADD COLUMN IF NOT EXISTS avatar_path TEXT;
    `);

    await pool.query(`
        UPDATE users
        SET username = SPLIT_PART(email, '@', 1)
        WHERE username IS NULL OR BTRIM(username) = '';
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS memories (
            id         SERIAL PRIMARY KEY,
            title      VARCHAR(255) NOT NULL,
            date       DATE,
            layout     VARCHAR(50),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            photos     TEXT[] NOT NULL DEFAULT '{}',
            music_path TEXT,
            music_name TEXT
        );
    `);

    await pool.query(`
        ALTER TABLE memories
            ADD COLUMN IF NOT EXISTS photos TEXT[] NOT NULL DEFAULT '{}',
            ADD COLUMN IF NOT EXISTS music_path TEXT,
            ADD COLUMN IF NOT EXISTS music_name TEXT,
            ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;
    `);

    await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_memories_user_id ON memories(user_id);
    `);
}

// ===================== AUTHENTICATION HELPERS =====================

const AUTH_SECRET = process.env.AUTH_SECRET || 'a_memory_of_us_default_secret_2026';
const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isStrongPassword(password) {
    return (
        typeof password === 'string' &&
        password.length >= 6 &&
        /[a-zA-Z]/.test(password) &&
        /[0-9]/.test(password)
    );
}

function hashPassword(password) {
    return new Promise((resolve, reject) => {
        const salt = crypto.randomBytes(16).toString('hex');
        crypto.scrypt(password, salt, 64, (err, derivedKey) => {
            if (err) return reject(err);
            resolve(`${salt}:${derivedKey.toString('hex')}`);
        });
    });
}

function verifyPassword(password, storedHash) {
    return new Promise((resolve, reject) => {
        const [salt, keyHex] = (storedHash || '').split(':');
        if (!salt || !keyHex) return resolve(false);
        const keyBuffer = Buffer.from(keyHex, 'hex');
        crypto.scrypt(password, salt, 64, (err, derivedKey) => {
            if (err) return reject(err);
            if (keyBuffer.length !== derivedKey.length) return resolve(false);
            resolve(crypto.timingSafeEqual(keyBuffer, derivedKey));
        });
    });
}

function createToken(user) {
    const payload = Buffer.from(JSON.stringify({
        id: user.id,
        email: user.email,
        exp: Date.now() + TOKEN_TTL_MS,
    })).toString('base64url');

    const signature = crypto
        .createHmac('sha256', AUTH_SECRET)
        .update(payload)
        .digest('base64url');

    return `${payload}.${signature}`;
}

function verifyToken(token) {
    if (typeof token !== 'string' || !token.includes('.')) return null;
    const [payload, signature] = token.split('.');
    if (!payload || !signature) return null;

    const expectedSig = crypto
        .createHmac('sha256', AUTH_SECRET)
        .update(payload)
        .digest('base64url');

    const sigBuf = Buffer.from(signature);
    const expBuf = Buffer.from(expectedSig);
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
        return null;
    }

    try {
        const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
        if (!data.exp || Date.now() > data.exp) return null;
        return data;
    } catch {
        return null;
    }
}

function formatUser(row) {
    return {
        id: row.id,
        username: row.username || (row.email ? row.email.split('@')[0] : 'User'),
        email: row.email,
        avatar_path: row.avatar_path || null,
    };
}

async function requireAuth(req, res, next) {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;
    const decoded = verifyToken(token);
    if (!decoded) {
        return res.status(401).json({ success: false, error: 'Please log in to continue.' });
    }

    const result = await pool.query(
        'SELECT id, username, email, avatar_path, created_at FROM users WHERE id = $1',
        [decoded.id]
    );
    if (result.rows.length === 0) {
        return res.status(401).json({ success: false, error: 'Session expired. Please log in again.' });
    }

    req.user = formatUser(result.rows[0]);
    next();
}

// Assign any pre-existing memories (created before auth was added) to the first account
async function claimOrphanMemoriesIfFirstUser(userId) {
    const userCount = await pool.query('SELECT COUNT(*)::int AS count FROM users');
    if (userCount.rows[0].count === 1) {
        await pool.query('UPDATE memories SET user_id = $1 WHERE user_id IS NULL', [userId]);
    }
}

// ===================== MEDIA STORAGE =====================
// Uploaded files live on disk in backend/uploads; only their paths go into PostgreSQL.

const UPLOADS_DIR = path.join(__dirname, 'uploads');
const PHOTO_DIR = path.join(UPLOADS_DIR, 'photos');
const MUSIC_DIR = path.join(UPLOADS_DIR, 'music');
const AVATAR_DIR = path.join(UPLOADS_DIR, 'avatars');
fs.mkdirSync(PHOTO_DIR, { recursive: true });
fs.mkdirSync(MUSIC_DIR, { recursive: true });
fs.mkdirSync(AVATAR_DIR, { recursive: true });

// Serve saved files (express.static supports range requests, so audio seeking works)
app.use('/uploads', express.static(UPLOADS_DIR));

// Each layout requires an EXACT number of photos
const LAYOUT_PHOTO_COUNT = {
    'layout-1': 1,  // Solo
    'layout-2h': 2, // Horizontal
    'layout-2v': 2, // Vertical
    'layout-4': 4,  // Window Grid
};

const LAYOUT_ERRORS = {
    'layout-1': 'Please upload exactly 1 photo for the Solo layout.',
    'layout-2h': 'The Horizontal layout requires exactly 2 photos.',
    'layout-2v': 'The Vertical layout requires exactly 2 photos.',
    'layout-4': 'The Window Grid layout requires exactly 4 photos.',
};

const IMAGE_TYPES = {
    'image/jpeg': { exts: ['.jpg', '.jpeg'], ext: '.jpg' },
    'image/png': { exts: ['.png'], ext: '.png' },
    'image/webp': { exts: ['.webp'], ext: '.webp' },
};
const MP3_MIME_TYPES = ['audio/mpeg', 'audio/mp3'];

const MAX_PHOTO_BYTES = 10 * 1024 * 1024; // 10 MB per photo
const MAX_MUSIC_BYTES = 20 * 1024 * 1024; // 20 MB per soundtrack

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        if (file.fieldname === 'music') return cb(null, MUSIC_DIR);
        if (file.fieldname === 'avatar') return cb(null, AVATAR_DIR);
        return cb(null, PHOTO_DIR);
    },
    // Random server-side name; never trust the user's filename for the path
    filename: (req, file, cb) => {
        const ext = file.fieldname === 'music' ? '.mp3' : IMAGE_TYPES[file.mimetype].ext;
        cb(null, crypto.randomUUID() + ext);
    },
});

function fileFilter(req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    if (file.fieldname === 'photos' || file.fieldname === 'avatar') {
        const type = IMAGE_TYPES[file.mimetype];
        if (!type || !type.exts.includes(ext)) {
            return cb(new UploadError(`"${file.originalname}" is not a supported image. Use JPG, JPEG, PNG or WebP.`));
        }
        return cb(null, true);
    }
    if (file.fieldname === 'music') {
        if (ext !== '.mp3' || !MP3_MIME_TYPES.includes(file.mimetype)) {
            return cb(new UploadError(`"${file.originalname}" is not an MP3 file.`));
        }
        return cb(null, true);
    }
    cb(new UploadError('Unexpected file field.'));
}

const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: MAX_MUSIC_BYTES, files: 5 },
}).fields([
    { name: 'photos', maxCount: 4 },
    { name: 'music', maxCount: 1 },
]);

const uploadAvatar = multer({
    storage,
    fileFilter,
    limits: { fileSize: MAX_PHOTO_BYTES, files: 1 },
}).single('avatar');

class UploadError extends Error {
    constructor(message) {
        super(message);
        this.status = 400;
    }
}

// Check the first bytes of a saved file so renamed/corrupt files are rejected
function hasValidSignature(filePath, kind) {
    const buf = Buffer.alloc(12);
    const fd = fs.openSync(filePath, 'r');
    const bytesRead = fs.readSync(fd, buf, 0, 12, 0);
    fs.closeSync(fd);
    if (bytesRead < 4) return false;

    if (kind === 'image/jpeg') return buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
    if (kind === 'image/png') return buf.subarray(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47]));
    if (kind === 'image/webp') return buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP';
    if (kind === 'mp3') {
        // ID3 tag, or a raw MPEG audio frame sync
        return buf.toString('ascii', 0, 3) === 'ID3' || (buf[0] === 0xff && (buf[1] & 0xe0) === 0xe0);
    }
    return false;
}

// Turn "/uploads/photos/abc.jpg" into an absolute path, only if it is inside uploads/
function toDiskPath(publicPath) {
    if (typeof publicPath !== 'string' || !publicPath.startsWith('/uploads/')) return null;
    const resolved = path.resolve(UPLOADS_DIR, publicPath.slice('/uploads/'.length));
    return resolved.startsWith(UPLOADS_DIR + path.sep) ? resolved : null;
}

async function removeFiles(diskPaths) {
    await Promise.all(diskPaths.filter(Boolean).map(p =>
        fs.promises.unlink(p).catch(err => {
            if (err.code !== 'ENOENT') console.error('Could not delete file', p, err.message);
        })
    ));
}

// Run multer, converting its errors into friendly 400 responses
function handleUpload(req, res, next) {
    upload(req, res, (err) => {
        if (!err) return next();
        if (err instanceof multer.MulterError) {
            const messages = {
                LIMIT_FILE_SIZE: 'A file is too large. Photos must be 10 MB or less and MP3s 20 MB or less.',
                LIMIT_UNEXPECTED_FILE: err.field === 'photos'
                    ? 'Maximum of 4 photos allowed.'
                    : err.field === 'music' ? 'Only one MP3 soundtrack is allowed.' : 'Unexpected file field.',
                LIMIT_FILE_COUNT: 'Too many files uploaded.',
            };
            return res.status(400).json({ success: false, error: messages[err.code] || err.message });
        }
        if (err instanceof UploadError) {
            return res.status(400).json({ success: false, error: err.message });
        }
        next(err);
    });
}

function handleAvatarUpload(req, res, next) {
    uploadAvatar(req, res, (err) => {
        if (!err) return next();
        if (err instanceof multer.MulterError) {
            return res.status(400).json({
                success: false,
                error: err.code === 'LIMIT_FILE_SIZE'
                    ? 'Profile picture must be 10 MB or less.'
                    : err.message,
            });
        }
        if (err instanceof UploadError) {
            return res.status(400).json({ success: false, error: err.message });
        }
        next(err);
    });
}

// ===================== AUTH ROUTES =====================

app.post('/api/auth/signup', async (req, res) => {
    const username = (req.body?.username || '').trim();
    const email = (req.body?.email || '').trim().toLowerCase();
    const password = req.body?.password || '';

    if (!username) {
        return res.status(400).json({ success: false, error: 'Please enter a username.' });
    }
    if (username.length > 100) {
        return res.status(400).json({ success: false, error: 'Username must be 100 characters or less.' });
    }
    if (!email) {
        return res.status(400).json({ success: false, error: 'Please enter your email address.' });
    }
    if (!EMAIL_REGEX.test(email) || email.length > 255) {
        return res.status(400).json({ success: false, error: 'Please enter a valid email address.' });
    }
    if (!isStrongPassword(password)) {
        return res.status(400).json({
            success: false,
            error: 'Password must be at least 6 characters and include both letters and numbers.',
        });
    }
    if (password.length > 128) {
        return res.status(400).json({ success: false, error: 'Password must be 128 characters or less.' });
    }

    const existing = await pool.query('SELECT id FROM users WHERE LOWER(email) = $1', [email]);
    if (existing.rows.length > 0) {
        return res.status(409).json({
            success: false,
            error: 'An account with this email already exists. Please log in instead.',
        });
    }

    const passwordHash = await hashPassword(password);
    const result = await pool.query(
        'INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id, username, email, avatar_path, created_at',
        [username, email, passwordHash]
    );
    const user = formatUser(result.rows[0]);

    await claimOrphanMemoriesIfFirstUser(user.id);

    const token = createToken(user);
    res.status(201).json({
        success: true,
        token,
        user,
    });
});

app.post('/api/auth/login', async (req, res) => {
    const email = (req.body?.email || '').trim().toLowerCase();
    const password = req.body?.password || '';

    if (!email || !password) {
        return res.status(400).json({ success: false, error: 'Please enter both email and password.' });
    }

    const result = await pool.query(
        'SELECT id, username, email, password_hash, avatar_path, created_at FROM users WHERE LOWER(email) = $1',
        [email]
    );
    const row = result.rows[0];
    if (!row) {
        return res.status(401).json({ success: false, error: 'Invalid email or password.' });
    }

    const matches = await verifyPassword(password, row.password_hash);
    if (!matches) {
        return res.status(401).json({ success: false, error: 'Invalid email or password.' });
    }

    const user = formatUser(row);
    await claimOrphanMemoriesIfFirstUser(user.id);

    const token = createToken(user);
    res.json({
        success: true,
        token,
        user,
    });
});

app.get('/api/auth/me', requireAuth, async (req, res) => {
    res.json({
        success: true,
        user: req.user,
    });
});

app.put('/api/auth/profile', requireAuth, handleAvatarUpload, async (req, res) => {
    const uploadedAvatar = req.file || null;
    const username = (req.body?.username || '').trim();

    const reject = async (message) => {
        if (uploadedAvatar) await removeFiles([uploadedAvatar.path]);
        return res.status(400).json({ success: false, error: message });
    };

    if (!username) {
        return reject('Please enter a name.');
    }
    if (username.length > 100) {
        return reject('Name must be 100 characters or less.');
    }

    if (uploadedAvatar) {
        if (uploadedAvatar.size > MAX_PHOTO_BYTES) {
            return reject('Profile picture must be 10 MB or less.');
        }
        if (!hasValidSignature(uploadedAvatar.path, uploadedAvatar.mimetype)) {
            return reject('Uploaded file is not a valid image.');
        }
    }

    const newAvatarPath = uploadedAvatar ? `/uploads/avatars/${uploadedAvatar.filename}` : null;
    const previousAvatarDiskPath = newAvatarPath && req.user.avatar_path
        ? toDiskPath(req.user.avatar_path)
        : null;

    try {
        const result = await pool.query(
            `UPDATE users
             SET username = $1,
                 avatar_path = COALESCE($2, avatar_path)
             WHERE id = $3
             RETURNING id, username, email, avatar_path`,
            [username, newAvatarPath, req.user.id]
        );

        if (previousAvatarDiskPath) {
            await removeFiles([previousAvatarDiskPath]);
        }

        res.json({
            success: true,
            user: formatUser(result.rows[0]),
        });
    } catch (err) {
        if (uploadedAvatar) await removeFiles([uploadedAvatar.path]);
        throw err;
    }
});

// ===================== MEMORY ROUTES =====================

app.get('/api/memories', requireAuth, async (req, res) => {
    const result = await pool.query(
        'SELECT * FROM memories WHERE user_id = $1 ORDER BY created_at DESC',
        [req.user.id]
    );
    res.json(result.rows);
});

app.post('/api/memories', requireAuth, handleUpload, async (req, res) => {
    const photos = req.files?.photos || [];
    const music = req.files?.music?.[0] || null;
    const uploadedDiskPaths = [...photos, ...(music ? [music] : [])].map(f => f.path);

    const reject = async (message) => {
        await removeFiles(uploadedDiskPaths);
        res.status(400).json({ success: false, error: message });
    };

    const title = (req.body.title || '').trim();
    const { date, layout } = req.body;

    if (!title) return reject('Please enter a title.');
    if (title.length > 255) return reject('Title must be 255 characters or less.');
    if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) return reject('Invalid date.');
    if (!(layout in LAYOUT_PHOTO_COUNT)) return reject('Please choose a valid layout.');

    // Only real uploaded files are accepted - no image or music links
    if ('photos' in req.body || 'music' in req.body) {
        return reject('Links are not allowed. Upload files from your computer.');
    }

    // Exact photo count for the chosen layout
    if (photos.length !== LAYOUT_PHOTO_COUNT[layout]) {
        const tooMany = layout === 'layout-4' && photos.length > 4;
        return reject(tooMany ? 'Maximum of 4 photos allowed for the Window Grid layout.' : LAYOUT_ERRORS[layout]);
    }

    for (const photo of photos) {
        if (photo.size > MAX_PHOTO_BYTES) return reject(`"${photo.originalname}" is larger than 10 MB.`);
        if (!hasValidSignature(photo.path, photo.mimetype)) return reject(`"${photo.originalname}" is not a valid image file.`);
    }
    if (music && !hasValidSignature(music.path, 'mp3')) {
        return reject(`"${music.originalname}" is not a valid MP3 file.`);
    }

    const photoPaths = photos.map(p => `/uploads/photos/${p.filename}`);
    const musicPath = music ? `/uploads/music/${music.filename}` : null;
    const musicName = music ? music.originalname.slice(0, 200) : null;

    try {
        const result = await pool.query(
            `INSERT INTO memories (title, date, layout, photos, music_path, music_name, user_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
            [title, date || null, layout, photoPaths, musicPath, musicName, req.user.id]
        );
        res.json({ success: true, added: result.rows[0] });
    } catch (err) {
        await removeFiles(uploadedDiskPaths); // don't leave orphaned files behind
        throw err;
    }
});

app.delete('/api/memories/:id', requireAuth, async (req, res) => {
    const result = await pool.query(
        'DELETE FROM memories WHERE id = $1 AND user_id = $2 RETURNING photos, music_path',
        [req.params.id, req.user.id]
    );
    const deleted = result.rows[0];
    if (!deleted) {
        return res.status(404).json({ success: false, error: 'Memory not found.' });
    }
    await removeFiles([...(deleted.photos || []), deleted.music_path].map(toDiskPath));
    res.json({ success: true, message: 'item deleted' });
});

// Catch-all error handler so the frontend always gets JSON back
app.use((err, req, res, next) => {
    console.error(err);
    res.status(err.status || 500).json({ success: false, error: 'Something went wrong on the server.' });
});

initDatabase()
    .then(() => {
        app.listen(5000, (err) => {
            if (err) throw err;
            console.log('server open');
        });
    })
    .catch((err) => {
        console.error('Failed to initialize PostgreSQL database:', err);
        process.exit(1);
    });
