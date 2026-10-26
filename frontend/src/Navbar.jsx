function Navbar({ count, onHome, onAdd, showingForm }) {
    return (
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
                {!showingForm && (
                    <button className="btn btn-primary" onClick={onAdd}>
                        <span className="btn-icon">+</span> Add Memory
                    </button>
                )}
            </div>
        </nav>
    );
}

export default Navbar;
