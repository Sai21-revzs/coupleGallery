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

// ===================== MEDIA STORAGE =====================
// Uploaded files live on disk in backend/uploads; only their paths go into PostgreSQL.

const UPLOADS_DIR = path.join(__dirname, 'uploads');
const PHOTO_DIR = path.join(UPLOADS_DIR, 'photos');
const MUSIC_DIR = path.join(UPLOADS_DIR, 'music');
fs.mkdirSync(PHOTO_DIR, { recursive: true });
fs.mkdirSync(MUSIC_DIR, { recursive: true });

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
    destination: (req, file, cb) => cb(null, file.fieldname === 'music' ? MUSIC_DIR : PHOTO_DIR),
    // Random server-side name; never trust the user's filename for the path
    filename: (req, file, cb) => {
        const ext = file.fieldname === 'music' ? '.mp3' : IMAGE_TYPES[file.mimetype].ext;
        cb(null, crypto.randomUUID() + ext);
    },
});

function fileFilter(req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    if (file.fieldname === 'photos') {
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

// ===================== ROUTES =====================

app.get('/api/memories', async (req, res) => {
    const result = await pool.query('SELECT * FROM memories ORDER BY created_at DESC');
    res.json(result.rows);
});

app.post('/api/memories', handleUpload, async (req, res) => {
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
            `INSERT INTO memories (title, date, layout, photos, music_path, music_name)
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
            [title, date || null, layout, photoPaths, musicPath, musicName]
        );
        res.json({ success: true, added: result.rows[0] });
    } catch (err) {
        await removeFiles(uploadedDiskPaths); // don't leave orphaned files behind
        throw err;
    }
});

app.delete('/api/memories/:id', async (req, res) => {
    const result = await pool.query('DELETE FROM memories WHERE id = $1 RETURNING photos, music_path', [req.params.id]);
    const deleted = result.rows[0];
    if (deleted) {
        await removeFiles([...(deleted.photos || []), deleted.music_path].map(toDiskPath));
    }
    res.json({ success: true, message: 'item deleted' });
});

// Catch-all error handler so the frontend always gets JSON back
app.use((err, req, res, next) => {
    console.error(err);
    res.status(err.status || 500).json({ success: false, error: 'Something went wrong on the server.' });
});


app.listen(5000, (err) => {
    if (err) throw err;
    console.log('server open');
});