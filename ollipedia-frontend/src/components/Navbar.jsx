import React, { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { API } from "../api/api";

function SafeImg({ src, alt, className }) {
  const [broken, setBroken] = React.useState(false);
  if (!src || broken) return null;
  return <img src={src} alt={alt} className={className} onError={() => setBroken(true)} />;
}

// ── Global Search ─────────────────────────────────────────────────────────────
function NavSearch() {
  const navigate = useNavigate();
  const [open,    setOpen]    = useState(false);
  const [query,   setQuery]   = useState("");
  const [results, setResults] = useState({ movies: [], cast: [], songs: [] });
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);
  const wrapRef  = useRef(null);
  const timer    = useRef(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => { if (!wrapRef.current?.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Debounced search
  useEffect(() => {
    if (!query.trim()) { setResults({ movies:[], cast:[], songs:[] }); return; }
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      setLoading(true);
      try {
        const [movies, cast, allMovies] = await Promise.all([
          API.getMovies(),
          API.getCast(),
          API.getMovies(),
        ]);
        const q = query.toLowerCase();
        const matchMovies = movies.filter(m => m.title?.toLowerCase().includes(q)).slice(0,5);
        const matchCast   = cast.filter(c => c.name?.toLowerCase().includes(q)).slice(0,4);
        // Songs: flatten from movies
        const songs = [];
        allMovies.forEach(m => (m.media?.songs||[]).forEach(s => {
          if (s.title?.toLowerCase().includes(q)) songs.push({ ...s, movieTitle: m.title, movieId: m._id });
        }));
        setResults({ movies: matchMovies, cast: matchCast, songs: songs.slice(0,4) });
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
          <input
            ref={inputRef}
            className="nav-search-input"
            placeholder="Search movies, cast, songs…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            autoFocus
          />
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

export default function Navbar({ production, castMember, onLoginClick, onLogout, onCastLogout }) {
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

      <NavSearch />

      <div className="nav-actions">
        {/* Production logged in */}
        {production && (
          <>
            <Link to="/dashboard" className="nav-prod-btn">
              {production.logo
                ? <SafeImg src={production.logo} alt={production.name} className="nav-prod-logo" />
                : <span className="nav-prod-avatar">{production.name[0]}</span>
              }
              <span className="nav-prod-name">{production.name}</span>
            </Link>
            <Link to="/dashboard/add-movie" className="btn btn-gold btn-sm">+ Add Movie</Link>
            <button className="btn btn-ghost btn-sm" onClick={() => { onLogout(); navigate("/"); }}>Logout</button>
          </>
        )}

        {/* Cast member logged in */}
        {!production && castMember && (
          <>
            <Link to="/cast-portal" className="nav-prod-btn">
              {castMember.photo
                ? <SafeImg src={castMember.photo} alt={castMember.name} className="nav-prod-logo" />
                : <span className="nav-prod-avatar">{castMember.name[0]}</span>
              }
              <span className="nav-prod-name">{castMember.name}</span>
            </Link>
            <span style={{ fontSize:"0.72rem", color:"var(--gold)", background:"rgba(201,151,58,0.12)", padding:"2px 10px", borderRadius:10 }}>
              {castMember.roles?.[0] || "Member"}
            </span>
            <button className="btn btn-ghost btn-sm" onClick={() => { onCastLogout(); navigate("/"); }}>Logout</button>
          </>
        )}

        {/* Not logged in */}
        {!production && !castMember && (
          <>
            <button className="btn btn-outline btn-sm" onClick={onLoginClick}>Login</button>
            <Link to="/register" className="btn btn-gold btn-sm">Join as Production</Link>
            <Link to="/cast-register" className="btn btn-outline btn-sm" style={{ borderColor:"var(--gold)", color:"var(--gold)" }}>Join as Artist</Link>
          </>
        )}
      </div>
    </nav>
  );
}