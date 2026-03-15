import SEO, { staticSEO } from "../components/SEO";
import { moviePath, castPath, songPath } from "../utils/slugs";
import React, { useEffect, useState, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { API } from "../api/api";

// ── Helpers ───────────────────────────────────────────────────────────────────
const extractYtId = (input) => {
  if (!input) return null;
  const s = String(input).trim();
  const m = s.match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([A-Za-z0-9_-]{11})/);
  if (m) return m[1];
  if (/^[A-Za-z0-9_-]{11}$/.test(s)) return s;
  return null;
};
const ytThumb = (id) => {
  const v = extractYtId(id);
  return v ? `https://img.youtube.com/vi/${v}/mqdefault.jpg` : null;
};
const now = new Date();
const withinDays = (d, past, future) => {
  if (!d) return false;
  const diff = (new Date(d) - now) / 86400000;
  return diff >= -past && diff <= future;
};


// ── Shared IntersectionObserver (one IO for all images) ──────────
const _imgIo = typeof window !== "undefined" ? (() => {
  const cbs = new WeakMap();
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => { if(e.isIntersecting){ cbs.get(e.target)?.(); cbs.delete(e.target); io.unobserve(e.target); } });
  }, { rootMargin:"500px" });
  io._cbs = cbs; return io;
})() : null;
const obsImg = (el,cb) => { if(!_imgIo||!el) return; _imgIo._cbs.set(el,cb); _imgIo.observe(el); return ()=>{ _imgIo.unobserve(el); _imgIo._cbs.delete(el); }; };
// ── Song card (vertical, YouTube-style) ──────────────────────────────────────
function SongCard({ song, onClick }) {
  const thumb = song.thumbnailUrl || ytThumb(song.ytId) || song.moviePoster || "";
  return (
    <div className="as-card" onClick={onClick}>
      <div className="as-card-thumb">
        <img
          ref={el => el && obsImg(el, ()=>{ el.src=thumb; })}
          alt={song.title}
          decoding="async"
          loading="lazy"
          style={{width:"100%",height:"100%",objectFit:"cover"}}
          onError={e => e.target.style.opacity = "0.15"} />
        <div className="as-card-play">▶</div>
        {!song.ytId && <div className="as-card-novideo">No video</div>}
      </div>
      <div className="as-card-info">
        <p className="as-card-title">{song.title || "Untitled"}</p>
        {song.singer        && <p className="as-card-singer">🎤 {song.singer}</p>}
        {song.musicDirector && <p className="as-card-meta">🎼 {song.musicDirector}</p>}
        {song.lyricist      && <p className="as-card-meta">✍️ {song.lyricist}</p>}
        <p className="as-card-movie">{song.movieTitle}</p>
        {song.movieYear     && <p className="as-card-year">{song.movieYear}</p>}
      </div>
    </div>
  );
}

// ── Section with horizontal scroll row ───────────────────────────────────────
function SongSection({ icon, title, songs, onSongClick, showAll = false }) {
  const rowRef   = useRef(null);
  const [expanded, setExpanded] = useState(showAll);
  const scroll   = (d) => rowRef.current?.scrollBy({ left: d * 210, behavior: "smooth" });
  const displayed = expanded ? songs : songs.slice(0, 20);
  if (!songs.length) return null;

  return (
    <section className="as-section">
      <div className="as-section-header">
        <h2 className="as-section-title">{icon} {title}</h2>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {songs.length > 20 && !expanded && (
            <button className="home-view-all" onClick={() => setExpanded(true)}>
              Show All ({songs.length})
            </button>
          )}
          {!expanded && (
            <>
              <button className="home-arrow" onClick={() => scroll(-1)}>‹</button>
              <button className="home-arrow" onClick={() => scroll(1)}>›</button>
            </>
          )}
        </div>
      </div>
      {expanded ? (
        <div className="as-grid">
          {displayed.map((s, i) => (
            <SongCard key={i} song={s} onClick={() => s.ytId && onSongClick(s)} />
          ))}
        </div>
      ) : (
        <div className="home-row home-songs-row" ref={rowRef}>
          {displayed.map((s, i) => (
            <SongCard key={i} song={s} onClick={() => s.ytId && onSongClick(s)} />
          ))}
        </div>
      )}
    </section>
  );
}

// ── Main AllSongs Page ────────────────────────────────────────────────────────
export default function AllSongs() {
  const navigate    = useNavigate();
  const [movies,  setMovies]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState("");
  const [filter,  setFilter]  = useState("all"); // all | upcoming | recent | old | classic

  useEffect(() => {
    API.getMovies().catch(() => []).then(m => { setMovies(m); setLoading(false); });
  }, []);

  // Build flat song list from all movies, attach movie metadata
  const allSongs = useMemo(() => {
    const list = [];
    movies.forEach(m => {
      const year = m.releaseDate ? new Date(m.releaseDate).getFullYear() : null;
      (m.media?.songs || []).forEach((s, idx) => {
        list.push({
          ...s,
          songIndex:  idx,
          movieId:    String(m._id),
          movieTitle: m.title,
          movieYear:  year ? String(year) : "",
          moviePoster:m.posterUrl || m.thumbnailUrl || "",
          releaseDate:m.releaseDate || "",
          verdict:    m.verdict || "",
          language:   m.language || "Odia",
          _movieSlug: moviePath(m),   // pre-compute slug
        });
      });
    });
    return list;
  }, [movies]);

  // ── Search filter ─────────────────────────────────────────────
  const searched = useMemo(() => {
    if (!search.trim()) return allSongs;
    const q = search.toLowerCase();
    return allSongs.filter(s =>
      s.title?.toLowerCase().includes(q) ||
      s.singer?.toLowerCase().includes(q) ||
      s.musicDirector?.toLowerCase().includes(q) ||
      s.lyricist?.toLowerCase().includes(q) ||
      s.movieTitle?.toLowerCase().includes(q)
    );
  }, [allSongs, search]);

  // ── Section slices ────────────────────────────────────────────
  const base = search.trim() ? searched : allSongs;

  // Upcoming movie songs (movies not yet released)
  const upcomingSongs = useMemo(() => base.filter(s => {
    const v = s.verdict;
    return !v || v === "Upcoming" || (s.releaseDate && new Date(s.releaseDate) > now);
  }).sort((a, b) => new Date(a.releaseDate || "2099") - new Date(b.releaseDate || "2099")), [base]);

  // Recent songs = movies released in last 2 years
  const recentSongs = useMemo(() => base.filter(s => {
    if (!s.releaseDate) return false;
    const d = new Date(s.releaseDate);
    return d <= now && d >= new Date(now.getFullYear() - 2, now.getMonth(), now.getDate());
  }).sort((a, b) => new Date(b.releaseDate) - new Date(a.releaseDate)), [base]);

  // Old songs = movies 3–10 years ago
  const oldSongs = useMemo(() => base.filter(s => {
    if (!s.releaseDate) return false;
    const yr = new Date(s.releaseDate).getFullYear();
    return yr >= now.getFullYear() - 10 && yr < now.getFullYear() - 2;
  }).sort((a, b) => new Date(b.releaseDate) - new Date(a.releaseDate)), [base]);

  // Old is Gold = movies before 2014 (>10 years ago)
  const classicSongs = useMemo(() => base.filter(s => {
    if (!s.releaseDate) return false;
    return new Date(s.releaseDate).getFullYear() < now.getFullYear() - 10;
  }).sort((a, b) => new Date(b.releaseDate) - new Date(a.releaseDate)), [base]);

  // No date = misc/ungrouped
  const undatedSongs = useMemo(() => base.filter(s => !s.releaseDate), [base]);

  const handleSongClick = (s) => { const slug = s._movieSlug?.replace('/movie/', '/song/'); navigate(slug ? `${slug}/${s.songIndex}` : `/song/${s.movieId}/${s.songIndex}`); };

  const TAB_FILTERS = [
    { key: "all",      label: "🎵 All",           count: base.length },
    { key: "upcoming", label: "🚀 Upcoming",       count: upcomingSongs.length },
    { key: "recent",   label: "🆕 Recent",         count: recentSongs.length },
    { key: "old",      label: "📀 Old",            count: oldSongs.length },
    { key: "classic",  label: "🏆 Old is Gold",    count: classicSongs.length },
  ].filter(t => t.key === "all" || t.count > 0);

  if (loading) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"60vh", color:"var(--muted)" }}>
      Loading songs…
    </div>
  );

  return (
    <div className="as-root">
      <SEO {...staticSEO.songs} />

      {/* ── Header ── */}
      <div className="as-header">
        <div className="as-header-inner">
          <div>
            <h1 className="as-page-title">🎵 Songs</h1>
            <p className="as-page-sub">{allSongs.length} songs from {movies.length} movies</p>
          </div>
          {/* Search bar */}
          <div className="as-search-wrap">
            <span className="as-search-icon">🔍</span>
            <input
              className="as-search-input"
              placeholder="Search by song, singer, movie…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button className="as-search-clear" onClick={() => setSearch("")}>✕</button>
            )}
          </div>
        </div>

        {/* Tab filters */}
        <div className="as-tabs">
          {TAB_FILTERS.map(t => (
            <button
              key={t.key}
              className={`as-tab ${filter === t.key ? "active" : ""}`}
              onClick={() => setFilter(t.key)}
            >
              {t.label}
              <span className="as-tab-count">{t.count}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Content ── */}
      <div className="as-body">

        {/* Search results */}
        {search.trim() && (
          <section className="as-section">
            <div className="as-section-header">
              <h2 className="as-section-title">🔍 Results for "{search}"</h2>
              <span style={{ color:"var(--muted)", fontSize:"0.8rem" }}>{searched.length} songs</span>
            </div>
            {searched.length === 0 ? (
              <p style={{ color:"var(--muted)", padding:"20px 0" }}>No songs found.</p>
            ) : (
              <div className="as-grid">
                {searched.map((s, i) => (
                  <SongCard key={i} song={s} onClick={() => s.ytId && handleSongClick(s)} />
                ))}
              </div>
            )}
          </section>
        )}

        {/* No-search sections */}
        {!search.trim() && (
          <>
            {(filter === "all" || filter === "upcoming") && (
              <SongSection icon="🚀" title="Upcoming Movie Songs"
                songs={upcomingSongs} onSongClick={handleSongClick} />
            )}
            {(filter === "all" || filter === "recent") && (
              <SongSection icon="🆕" title="Recent Movies Songs"
                songs={recentSongs} onSongClick={handleSongClick} />
            )}
            {(filter === "all" || filter === "old") && (
              <SongSection icon="📀" title="Old Songs"
                songs={oldSongs} onSongClick={handleSongClick} />
            )}
            {(filter === "all" || filter === "classic") && (
              <SongSection icon="🏆" title="Old is Gold"
                songs={classicSongs} onSongClick={handleSongClick} />
            )}
            {undatedSongs.length > 0 && filter === "all" && (
              <SongSection icon="🎼" title="More Songs"
                songs={undatedSongs} onSongClick={handleSongClick} />
            )}
            {base.length === 0 && (
              <div style={{ textAlign:"center", padding:"60px 20px", color:"var(--muted)" }}>
                <div style={{ fontSize:"3rem", marginBottom:12 }}>🎵</div>
                <p>No songs in the database yet.</p>
                <p style={{ fontSize:"0.85rem", marginTop:8 }}>Run the song scraper or add songs via the Admin Portal.</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}