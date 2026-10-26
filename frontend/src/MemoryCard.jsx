import { mediaUrl } from './constants';
import MusicPlayer from './MusicPlayer';

function MemoryCard(props) {
    const layoutClass = `card-base memory-card ${props.layout || 'layout-1'}`;

    const photos = Array.isArray(props.photos) ? props.photos : [];

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
                        <div key={i} className="photo-slot">
                            <img
                                src={mediaUrl(photo)}
                                alt={`${props.title} - photo ${i + 1}`}
                                loading="lazy"
                            />
                        </div>
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