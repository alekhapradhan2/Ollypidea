import React, { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { API } from "../api/api";

function SafeImg({ src, alt, className }) {
  const [broken, setBroken] = React.useState(false);
  if (!src || broken) return null;
  return <img src={src} alt={alt} className={className} onError={() => setBroken(true)} />;
}

// Module-level search cache — fetched once per session, never re-fetched
const _searchCache = { movies: null, cast: null, songs: null };

// ── Global Search ────────────────────────────────────────────────
function NavSearch() {
  const navigate = useNavigate();
  const [open,    setOpen]    = useState(false);
  const [query,   setQuery]   = useState("");
  const [results, setResults] = useState({ movies: [], cast: [], songs: [] });
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);
  const wrapRef  = useRef(null);
  const timer    = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (!wrapRef.current?.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (!query.trim()) { setResults({ movies:[], cast:[], songs:[] }); return; }
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      setLoading(true);
      try {
        // Cache data at module level — only fetches once per session
        if (!_searchCache.movies) {
          const [movies, cast] = await Promise.all([API.getMovies(), API.getCast()]);
          _searchCache.movies = movies;
          _searchCache.cast   = cast;
          // Pre-build song list once
          _searchCache.songs = [];
          movies.forEach(m => (m.media?.songs||[]).forEach(s => {
            _searchCache.songs.push({ ...s, movieTitle: m.title, movieId: m._id });
          }));
        }
        const q = query.toLowerCase();
        setResults({
          movies: _searchCache.movies.filter(m => m.title?.toLowerCase().includes(q)).slice(0,5),
          cast:   _searchCache.cast.filter(c => c.name?.toLowerCase().includes(q)).slice(0,4),
          songs:  _searchCache.songs.filter(s => s.title?.toLowerCase().includes(q)).slice(0,4),
        });
      } catch { setResults({ movies:[], cast:[], songs:[] }); }
      finally { setLoading(false); }
    }, 300);
  }, [query]);

  const total = results.movies.length + results.cast.length + results.songs.length;

  return (
    <div className="nav-search-wrap" ref={wrapRef}>
      {open ? (
        <div className="nav-search-box">
          <span className="nav-search-icon">🔍</span>
          <input ref={inputRef} className="nav-search-input" placeholder="Search movies, cast, songs…"
            value={query} onChange={e => setQuery(e.target.value)} autoFocus />
          {query && <button className="nav-search-clear" onClick={() => { setQuery(""); inputRef.current?.focus(); }}>✕</button>}
        </div>
      ) : (
        <button className="nav-search-btn" onClick={() => setOpen(true)}>🔍</button>
      )}

      {open && query.trim() && (
        <div className="nav-search-dropdown">
          {loading && <div className="nav-search-loading">Searching…</div>}
          {!loading && total === 0 && <div className="nav-search-empty">No results for "{query}"</div>}
          {results.movies.length > 0 && (
            <div className="nav-search-group">
              <div className="nav-search-group-label">🎬 Movies</div>
              {results.movies.map(m => (
                <div key={m._id} className="nav-search-item" onClick={() => { navigate(`/movie/${m._id}`); setOpen(false); setQuery(""); }}>
                  {m.posterUrl && <img src={m.posterUrl} alt={m.title} className="nav-search-thumb" />}
                  <div className="nav-search-item-info">
                    <span className="nav-search-item-title">{m.title}</span>
                    <span className="nav-search-item-sub">{m.category} · {m.language}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
          {results.cast.length > 0 && (
            <div className="nav-search-group">
              <div className="nav-search-group-label">👤 Cast & Crew</div>
              {results.cast.map(c => (
                <div key={c._id} className="nav-search-item" onClick={() => { navigate(`/cast/${c._id}`); setOpen(false); setQuery(""); }}>
                  {c.photo && <img src={c.photo} alt={c.name} className="nav-search-thumb nav-search-thumb-round" />}
                  <div className="nav-search-item-info">
                    <span className="nav-search-item-title">{c.name}</span>
                    <span className="nav-search-item-sub">{c.type}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
          {results.songs.length > 0 && (
            <div className="nav-search-group">
              <div className="nav-search-group-label">🎵 Songs</div>
              {results.songs.map((s, i) => (
                <div key={i} className="nav-search-item" onClick={() => { s.ytId && window.open(`https://youtube.com/watch?v=${s.ytId}`, "_blank"); setOpen(false); setQuery(""); }}>
                  {s.thumbnailUrl && <img src={s.thumbnailUrl} alt={s.title} className="nav-search-thumb" />}
                  <div className="nav-search-item-info">
                    <span className="nav-search-item-title">{s.title}</span>
                    <span className="nav-search-item-sub">{s.singer && `${s.singer} · `}{s.movieTitle}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function Navbar({ admin, onAdminLogout }) {
  const location = useLocation();
  const navigate = useNavigate();
  const active = (p) => location.pathname === p ? "nav-link active" : "nav-link";

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-brand">OLLI<span>PEDIA</span></Link>
      <Link to="/"       className={active("/")}>Home</Link>
      <Link to="/movies" className={active("/movies")}>Movies</Link>
      <Link to="/cast"   className={active("/cast")}>Cast</Link>
      <Link to="/news"   className={active("/news")}>News</Link>
      <Link to="/songs"  className={active("/songs")}>Songs</Link>
      <NavSearch />
      <div className="nav-actions">
        {admin ? (
          <>
            <Link to="/admin" className="nav-prod-btn">
              <span className="nav-prod-avatar">🛡</span>
              <span className="nav-prod-name">{admin.username}</span>
            </Link>
            <span style={{ fontSize:"0.68rem", color:"var(--gold)", background:"rgba(201,151,58,0.12)", padding:"2px 9px", borderRadius:10, fontWeight:700 }}>ADMIN</span>
            <button className="btn btn-ghost btn-sm" onClick={() => { onAdminLogout(); navigate("/"); }}>Logout</button>
          </>
        ) : (
          <Link to="/admin/login" className="btn btn-ghost btn-sm" style={{ color:"var(--muted)", fontSize:"0.75rem" }}>Admin</Link>
        )}
      </div>
    </nav>
  );
}