import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { API } from "../api/api";

// ── Helpers ───────────────────────────────────────────────
const extractYtId = (input) => {
  if (!input) return null;
  const s = String(input).trim();
  const m = s.match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([A-Za-z0-9_-]{11})/);
  if (m) return m[1];
  if (/^[A-Za-z0-9_-]{11}$/.test(s)) return s;
  return null;
};
const ytThumb = (ytId) => {
  const id = extractYtId(ytId);
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null;
};
const heroImage = (m) =>
  m.thumbnailUrl || ytThumb(m.media?.trailer?.ytId) || m.posterUrl || null;

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "";

const now = new Date();
const RECENT_CUTOFF = new Date(now.getFullYear() - 3, now.getMonth(), now.getDate());

const withinDays = (d, pastDays, futureDays) => {
  if (!d) return false;
  const diff = (new Date(d) - now) / 86400000;
  return diff >= -pastDays && diff <= futureDays;
};
const isThisWeek  = (d) => withinDays(d, 7, 14);
const isThisMonth = (d) => {
  if (!d) return false;
  const dt = new Date(d);
  return dt.getMonth() === now.getMonth() && dt.getFullYear() === now.getFullYear();
};
const isLastMonth = (d) => {
  if (!d) return false;
  const dt  = new Date(d);
  const lm  = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return dt.getMonth() === lm.getMonth() && dt.getFullYear() === lm.getFullYear();
};
const isLastWeek = (d) => withinDays(d, 14, 0);

// ── Hero Slide ────────────────────────────────────────────
function HeroSlide({ movie, active }) {
  const navigate = useNavigate();
  const img = heroImage(movie);
  return (
    <div
      className={`home-hero-slide ${active ? "active" : ""}`}
      style={{ backgroundImage: img ? `url(${img})` : "none" }}
    >
      <div className="home-hero-overlay" />
      <div className="home-hero-content">
        <div className="home-hero-meta">
          {movie.category && <span className="home-tag">{movie.category}</span>}
          {movie.genre?.[0] && <span className="home-tag-outline">{movie.genre[0]}</span>}
          {movie.language  && <span className="home-tag-outline">{movie.language}</span>}
        </div>
        <h1 className="home-hero-title">{movie.title}</h1>
        <div className="home-hero-info">
          {movie.releaseDate && (
            <span>🗓 {new Date(movie.releaseDate).toLocaleDateString("en-IN", { day:"numeric", month:"short", year:"numeric" })}</span>
          )}
          {movie.director && <span>Dir. {movie.director}</span>}
          {movie.verdict && movie.verdict !== "Upcoming" && (
            <span className="home-hero-verdict-badge">{movie.verdict}</span>
          )}
        </div>
        {movie.synopsis && (
          <p className="home-hero-synopsis">
            {movie.synopsis.slice(0, 160)}{movie.synopsis.length > 160 ? "…" : ""}
          </p>
        )}
        <div className="home-hero-actions">
          {movie.media?.trailer?.ytId && (
            <button
              className="btn-hero-play"
              onClick={() => navigate(`/movie/${movie._id}`, { state: { scrollTo: "trailer" } })}
            >▶ Watch Trailer</button>
          )}
          <button className="btn-hero-info" onClick={() => navigate(`/movie/${movie._id}`)}>
            More Info
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Movie Card ────────────────────────────────────────────
function MovieCard({ movie }) {
  const navigate = useNavigate();
  const img = movie.posterUrl || movie.thumbnailUrl || ytThumb(movie.media?.trailer?.ytId);
  return (
    <div className="home-card" onClick={() => navigate(`/movie/${movie._id}`)}>
      <div className="home-card-img">
        {img
          ? <img src={img} alt={movie.title} loading="lazy"
              onError={e => { e.target.style.display="none"; e.target.nextSibling.style.display="flex"; }} />
          : null}
        <div className="home-card-fallback" style={{ display: img ? "none" : "flex" }}>🎬</div>
        <div className="home-card-overlay">
          <span className="home-card-verdict">{movie.verdict || "Upcoming"}</span>
          {movie.genre?.[0] && <span className="home-card-genre">{movie.genre[0]}</span>}
        </div>
      </div>
      <div className="home-card-info">
        <p className="home-card-title">{movie.title}</p>
        {movie.releaseDate && <p className="home-card-date">{fmtDate(movie.releaseDate)}</p>}
      </div>
    </div>
  );
}

// ── Movie Row ─────────────────────────────────────────────
function MovieRow({ title, movies, viewAllPath }) {
  const navigate = useNavigate();
  const rowRef = useRef(null);
  const scroll = (d) => rowRef.current?.scrollBy({ left: d * 280, behavior: "smooth" });
  const limited = movies.slice(0, 15);
  if (!movies.length) return null;
  return (
    <section className="home-section">
      <div className="home-section-header">
        <h2 className="home-section-title">{title}</h2>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {(movies.length > 15 || viewAllPath) && (
            <button className="home-view-all" onClick={() => navigate(viewAllPath || "/movies")}>
              View All ({movies.length})
            </button>
          )}
          <button className="home-arrow" onClick={() => scroll(-1)}>‹</button>
          <button className="home-arrow" onClick={() => scroll(1)}>›</button>
        </div>
      </div>
      <div className="home-row" ref={rowRef}>
        {limited.map(m => <MovieCard key={m._id} movie={m} />)}
      </div>
    </section>
  );
}

// ── Trailers Row ──────────────────────────────────────────
function TrailersRow({ movies }) {
  const navigate = useNavigate();
  const rowRef = useRef(null);
  const scroll = (d) => rowRef.current?.scrollBy({ left: d * 340, behavior: "smooth" });
  const withTrailer = movies.filter(m => m.media?.trailer?.ytId).slice(0, 15);
  if (!withTrailer.length) return null;
  return (
    <section className="home-section">
      <div className="home-section-header">
        <h2 className="home-section-title">🎬 Latest Trailers</h2>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="home-arrow" onClick={() => scroll(-1)}>‹</button>
          <button className="home-arrow" onClick={() => scroll(1)}>›</button>
        </div>
      </div>
      <div className="home-row home-trailer-row" ref={rowRef}>
        {withTrailer.map(m => (
          <div key={m._id}
            className="home-trailer-card"
            style={{ cursor: "pointer" }}
            onClick={() => navigate(`/movie/${m._id}`, { state: { scrollTo: "trailer" } })}>
            <div className="home-trailer-thumb">
              <img src={ytThumb(m.media.trailer.ytId)} alt={m.title}
                onError={e => e.target.style.opacity = "0"} />
              <div className="home-trailer-play">▶</div>
              <div className="home-trailer-duration">Trailer</div>
            </div>
            <div className="home-trailer-info">
              <p className="home-trailer-title">{m.title}</p>
              {m.releaseDate && <p className="home-trailer-date">{fmtDate(m.releaseDate)}</p>}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ── News Row ──────────────────────────────────────────────
function NewsRow({ news }) {
  const navigate = useNavigate();
  const rowRef = useRef(null);
  const scroll = (d) => rowRef.current?.scrollBy({ left: d * 300, behavior: "smooth" });
  if (!news.length) return null;
  return (
    <section className="home-section">
      <div className="home-section-header">
        <h2 className="home-section-title">📰 Latest News</h2>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button className="home-view-all" onClick={() => navigate("/news")}>View All</button>
          <button className="home-arrow" onClick={() => scroll(-1)}>‹</button>
          <button className="home-arrow" onClick={() => scroll(1)}>›</button>
        </div>
      </div>
      <div className="home-row home-news-row" ref={rowRef}>
        {news.map(n => (
          <div key={n._id} className="home-news-card" onClick={() => navigate(`/news/${n._id}`)}>
            {n.imageUrl && (
              <div className="home-news-img">
                <img src={n.imageUrl} alt={n.title} onError={e => e.target.style.display = "none"} />
              </div>
            )}
            <div className="home-news-body">
              {n.category && <span className="home-news-cat">{n.category}</span>}
              <p className="home-news-title">{n.title}</p>
              {n.movieTitle && <p className="home-news-movie">{n.movieTitle}</p>}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ── Shared SongCard ───────────────────────────────────────
function SongCard({ s, onClick }) {
  return (
    <div className="home-song-card" onClick={onClick}>
      <div className="home-song-thumb">
        <img
          src={s.thumbnailUrl || ytThumb(s.ytId) || s.posterUrl || ""}
          alt={s.title}
          onError={e => e.target.style.opacity = "0.2"}
        />
        <div className="home-song-play">♪</div>
      </div>
      <div className="home-song-info">
        <p className="home-song-title">{s.title}</p>
        {s.singer && <p className="home-song-singer">🎤 {s.singer}</p>}
        <p className="home-song-movie">{s.movieTitle}</p>
      </div>
    </div>
  );
}

// ── Trending Songs Row (home page) ────────────────────────
// "Trending" = songs from movies released in last 90 days, newest first
function TrendingSongsRow({ movies }) {
  const navigate = useNavigate();
  const rowRef   = useRef(null);
  const scroll   = (d) => rowRef.current?.scrollBy({ left: d * 200, behavior: "smooth" });

  // Collect songs only from recent movies (last 90 days) + upcoming
  const trendingSongs = [];
  [...movies]
    .sort((a, b) => new Date(b.releaseDate || 0) - new Date(a.releaseDate || 0))
    .filter(m => {
      const isUpcoming = !m.verdict || m.verdict === "Upcoming";
      const isRecent   = m.releaseDate && withinDays(m.releaseDate, 90, 60);
      return isUpcoming || isRecent;
    })
    .forEach(m => {
      (m.media?.songs || []).forEach((s, idx) => {
        if (s.ytId) trendingSongs.push({
          ...s, songIndex: idx,
          movieTitle: m.title, movieId: m._id, posterUrl: m.posterUrl,
          movieDate: m.releaseDate,
        });
      });
    });

  // If not enough recent songs, pad with latest songs from all movies
  if (trendingSongs.length < 6) {
    movies.forEach(m => {
      (m.media?.songs || []).forEach((s, idx) => {
        if (s.ytId && !trendingSongs.find(t => t.movieId === m._id && t.songIndex === idx)) {
          trendingSongs.push({
            ...s, songIndex: idx,
            movieTitle: m.title, movieId: m._id, posterUrl: m.posterUrl,
          });
        }
      });
    });
  }

  const shown = trendingSongs.slice(0, 15);
  if (!shown.length) return null;

  return (
    <section className="home-section">
      <div className="home-section-header">
        <h2 className="home-section-title">🔥 Trending Songs</h2>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button className="home-view-all" onClick={() => navigate("/songs")}>
            View All Songs
          </button>
          <button className="home-arrow" onClick={() => scroll(-1)}>‹</button>
          <button className="home-arrow" onClick={() => scroll(1)}>›</button>
        </div>
      </div>
      <div className="home-row home-songs-row" ref={rowRef}>
        {shown.map((s, i) => (
          <SongCard
            key={i} s={s}
            onClick={() => navigate(`/song/${s.movieId}/${s.songIndex}`)}
          />
        ))}
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════
//  MAIN
// ═══════════════════════════════════════════════════════════
export default function Home({ production }) {
  const navigate  = useNavigate();
  const [movies,  setMovies]  = useState([]);
  const [news,    setNews]    = useState([]);
  const [heroIdx, setHeroIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const timerRef = useRef(null);

  useEffect(() => {
    Promise.all([
      API.getMovies().catch(() => []),
      API.getNews().catch(() => []),
    ]).then(([m, n]) => {
      setMovies(m);
      setNews(n.slice(0, 12));
      setLoading(false);
    });
  }, []);

  const heroMovies = movies
    .filter(m => {
      const hasImg = m.thumbnailUrl || m.media?.trailer?.ytId || m.posterUrl;
      if (!hasImg) return false;
      if (!m.verdict || m.verdict === "Upcoming") return true;
      if (m.releaseDate && withinDays(m.releaseDate, 60, 0)) return true;
      if (isThisMonth(m.releaseDate) || isLastMonth(m.releaseDate)) return true;
      return false;
    })
    .sort((a, b) => new Date(b.releaseDate || 0) - new Date(a.releaseDate || 0))
    .slice(0, 8);

  useEffect(() => {
    if (!heroMovies.length) return;
    timerRef.current = setInterval(() => setHeroIdx(i => (i + 1) % heroMovies.length), 5500);
    return () => clearInterval(timerRef.current);
  }, [heroMovies.length]);

  const goHero = (i) => { setHeroIdx(i); clearInterval(timerRef.current); };

  const sortNew = (arr) => [...arr].sort((a, b) => {
    if (!a.releaseDate && !b.releaseDate) return 0;
    if (!a.releaseDate) return 1;
    if (!b.releaseDate) return -1;
    return new Date(b.releaseDate) - new Date(a.releaseDate);
  });

  const allMovies   = sortNew(movies);
  const thisWeek    = sortNew(movies.filter(m => isThisWeek(m.releaseDate) && !m.releaseTBA));
  const thisMonth   = sortNew(movies.filter(m => isThisMonth(m.releaseDate)));
  const lastMonth   = sortNew(movies.filter(m => isLastMonth(m.releaseDate)));
  const lastWeek    = sortNew(movies.filter(m => isLastWeek(m.releaseDate) && !isThisWeek(m.releaseDate)));
  const upcoming    = sortNew(movies.filter(m => !m.verdict || m.verdict === "Upcoming"));
  const inTheatres  = sortNew(movies.filter(m => m.releaseDate && withinDays(m.releaseDate, 10, 10)));
  const highRated   = movies
    .filter(m => m.reviews?.length >= 1 && m.releaseDate && new Date(m.releaseDate) >= RECENT_CUTOFF)
    .map(m => ({ ...m, avg: m.reviews.reduce((s, r) => s + (r.rating || 0), 0) / m.reviews.length }))
    .filter(m => m.avg >= 3.5)
    .sort((a, b) => b.avg - a.avg);

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh", color: "var(--muted)" }}>
      Loading…
    </div>
  );

  return (
    <div className="home-root">

      {/* ── HERO ── */}
      {heroMovies.length > 0 && (
        <div className="home-hero">
          {heroMovies.map((m, i) => (
            <HeroSlide key={m._id} movie={m} active={i === heroIdx} />
          ))}
          <div className="home-hero-dots">
            {heroMovies.map((_, i) => (
              <button key={i} className={`home-hero-dot ${i === heroIdx ? "active" : ""}`}
                onClick={() => goHero(i)} />
            ))}
          </div>
          <div className="home-hero-strip">
            {heroMovies.map((m, i) => {
              const img = heroImage(m);
              return (
                <div key={m._id}
                  className={`home-hero-strip-item ${i === heroIdx ? "active" : ""}`}
                  onClick={() => goHero(i)}>
                  {img
                    ? <img src={img} alt={m.title} onError={e => e.target.style.display = "none"} />
                    : <div className="home-strip-fallback">🎬</div>}
                  {m.media?.trailer?.ytId && <div className="home-strip-play">▶</div>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── CTA Bar ── */}
      {production && (
        <div className="home-cta-bar">
          <span>Welcome back, <strong>{production.name}</strong></span>
          <button className="btn btn-gold btn-sm" onClick={() => navigate("/dashboard/add-movie")}>+ Add Movie</button>
        </div>
      )}

      <div className="home-sections">
        {thisWeek.length > 0   && <MovieRow title="🔥 Releasing This Week" movies={thisWeek} />}
        {thisMonth.length > 0  && <MovieRow title="🗓 This Month"          movies={thisMonth} />}
        {lastWeek.length > 0   && <MovieRow title="📅 Last Week"           movies={lastWeek} />}
        {lastMonth.length > 0  && <MovieRow title="📆 Last Month"          movies={lastMonth} />}
        {inTheatres.length > 0 && <MovieRow title="🎭 Now in Theatres"     movies={inTheatres} />}

        <TrailersRow movies={allMovies} />
        <NewsRow news={news} />

        {/* 🔥 Trending Songs — new, replaces plain "Latest Songs" */}
        <TrendingSongsRow movies={allMovies} />

        {highRated.length > 0  && <MovieRow title="⭐ Top Rated"           movies={highRated} />}
        {upcoming.length > 0   && <MovieRow title="🚀 Upcoming Movies"     movies={upcoming}  viewAllPath="/movies" />}
        <MovieRow title="🎬 All Movies" movies={allMovies} viewAllPath="/movies" />

        {movies.length === 0 && (
          <div className="home-empty">
            <div style={{ fontSize: "4rem", marginBottom: 16 }}>🎬</div>
            <h2>No movies yet</h2>
            <p style={{ color: "var(--muted)" }}>Be the first to add a film to Ollipedia</p>
            {production && (
              <button className="btn btn-gold" onClick={() => navigate("/dashboard/add-movie")}>+ Add Movie</button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}